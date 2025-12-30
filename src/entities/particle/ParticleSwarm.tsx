/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 *
 * Features:
 * - Smooth join animation: shards grow from globe surface (2s)
 * - Smooth leave animation: shards shrink to globe surface (2s)
 * - Wave effect: multiple joins staggered for visual flow (capped at 1.5s max)
 * - Position interpolation: smooth gliding when count changes
 * - Randomized colors: prevents mood clustering
 * - Handles rapid updates: joining shards can transition to leaving mid-animation
 * - Large batch support: stagger delay scales down for big changes
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';

// Convert palette to THREE.Color array for random selection
const MOOD_COLORS = [
  new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
];

const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  grateful: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  celebrating: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  moment: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  here: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  anxious: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  processing: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  preparing: new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
};

/**
 * Shuffle array using Fisher-Yates algorithm
 * Ensures colors are randomly distributed, preventing mood clustering
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Build color distribution array from presence data with randomization
 */
function buildColorDistribution(users: Partial<Record<MoodId, number>> | undefined): THREE.Color[] {
  if (!users) return [];

  const colorDistribution: THREE.Color[] = [];
  for (const [moodId, moodCount] of Object.entries(users)) {
    const color = MOOD_TO_COLOR[moodId as MoodId];
    if (color) {
      for (let i = 0; i < (moodCount ?? 0); i++) {
        colorDistribution.push(color);
      }
    }
  }
  return shuffleArray(colorDistribution);
}

/**
 * Apply per-vertex color to icosahedron geometry
 */
function applyVertexColors(geometry: THREE.IcosahedronGeometry, color: THREE.Color): void {
  const vertexCount = geometry.attributes.position.count;
  const colors = new Float32Array(vertexCount * 3);
  for (let c = 0; c < colors.length; c += 3) {
    colors[c] = color.r;
    colors[c + 1] = color.g;
    colors[c + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Calculate Fibonacci sphere position for index
 * Returns unit vector direction for even distribution on sphere
 */
function getFibonacciPosition(index: number, total: number): THREE.Vector3 {
  if (total <= 0) return new THREE.Vector3(0, 1, 0);
  const phi = Math.acos(-1 + (2 * index) / Math.max(total, 1));
  const theta = Math.sqrt(total * Math.PI) * phi;
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

/**
 * Easing function for smooth animations
 * Uses ease-in-out cubic for natural feel
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export interface ParticleSwarmProps {
  /** Number of shards (default 48 matches reference) */
  count?: number;
  /** Users by mood for color distribution */
  users?: Partial<Record<MoodId, number>>;
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /** Base size for shards @default 4.0 */
  baseShardSize?: number;
  /** Globe radius for minimum distance calculation @default 1.5 */
  globeRadius?: number;
  /** Buffer distance between shard surface and globe surface @default 0.3 */
  buffer?: number;
  /** Maximum shard size cap (prevents oversized shards at low counts) @default 0.6 */
  maxShardSize?: number;
  /** Duration of join/leave animations in seconds @default 2 */
  animationDuration?: number;
  /** Base delay between staggered animations in seconds @default 0.1 */
  staggerDelay?: number;
  /** Maximum total stagger time for large batches @default 1.5 */
  maxStaggerTime?: number;
}

/**
 * Animation states for shard lifecycle
 */
type ShardAnimationState = 'joining' | 'stable' | 'leaving';

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  targetDirection: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
  color: THREE.Color;
  id: number;
}

/**
 * Physics + animation state for each shard
 */
interface ShardPhysicsState {
  id: number;
  currentRadius: number;
  velocity: number;
  phaseOffset: number;
  ambientSeed: number;
  previousTarget: number;
  animationState: ShardAnimationState;
  animationProgress: number;
  animationDelay: number;
  scale: number;
  /** For reversing: tracks if we're going from join→leave mid-animation */
  reversedFromScale: number;
}

// Spring physics constants
const SPRING_STIFFNESS = 6;
const SPRING_DAMPING = 4.5;
const EXPANSION_VELOCITY_BOOST = 2.5;
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;
const MAX_PHASE_OFFSET = 0.04;

// Position interpolation for smooth transitions
const POSITION_LERP_SPEED = 3.0;

// Unique ID counter for shards
let shardIdCounter = 0;

export function ParticleSwarm({
  count = 48,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  animationDuration = 2,
  staggerDelay = 0.1,
  maxStaggerTime = 1.5,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  const targetCountRef = useRef<number>(0);
  const colorPoolRef = useRef<THREE.Color[]>([]);

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(Math.max(count, 1)), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared material
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  /**
   * Calculate effective stagger delay for batch size
   * Scales down for large batches to keep total wave time reasonable
   */
  const getEffectiveStaggerDelay = useCallback(
    (batchSize: number): number => {
      if (batchSize <= 1) return 0;
      // Cap total stagger time, distribute evenly
      const totalTime = Math.min(batchSize * staggerDelay, maxStaggerTime);
      return totalTime / batchSize;
    },
    [staggerDelay, maxStaggerTime],
  );

  /**
   * Create a new shard with geometry, color, and initial position
   */
  const createShard = useCallback(
    (index: number, total: number, color: THREE.Color): ShardData => {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
      applyVertexColors(geometry, color);

      const direction = getFibonacciPosition(index, total);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true;
      mesh.position.copy(direction).multiplyScalar(globeRadius);
      mesh.scale.setScalar(0);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      return {
        mesh,
        direction: direction.clone(),
        targetDirection: direction.clone(),
        geometry,
        color: color.clone(),
        id: shardIdCounter++,
      };
    },
    [shardSize, material, globeRadius],
  );

  /**
   * Create initial physics state for a shard
   */
  const createPhysicsState = useCallback(
    (shardId: number, index: number, delay: number, isJoining: boolean): ShardPhysicsState => {
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      return {
        id: shardId,
        currentRadius: globeRadius,
        velocity: 0,
        phaseOffset: ((index * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: index * 137.508,
        previousTarget: globeRadius,
        animationState: isJoining ? 'joining' : 'stable',
        animationProgress: 0,
        animationDelay: delay,
        scale: isJoining ? 0 : 1,
        reversedFromScale: 0,
      };
    },
    [globeRadius],
  );

  // Update color pool when users change
  useEffect(() => {
    colorPoolRef.current = buildColorDistribution(users);
  }, [users]);

  /**
   * Recalculate target positions for all active (non-leaving) shards
   */
  const recalculateTargetPositions = useCallback((targetCount: number) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;

    // Count active shards (not leaving)
    let activeIndex = 0;
    for (let i = 0; i < currentShards.length; i++) {
      if (physics[i] && physics[i].animationState !== 'leaving') {
        currentShards[i].targetDirection = getFibonacciPosition(activeIndex, targetCount);
        activeIndex++;
      }
    }
  }, []);

  // Handle count changes - add/remove shards with animations
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Shard lifecycle management requires coordinated add/remove logic with position recalculation - refactoring would reduce readability
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    const colorPool = colorPoolRef.current;

    // Count currently "active" shards (joining or stable, not leaving)
    const activeCount = physics.filter((p) => p.animationState !== 'leaving').length;
    const diff = count - activeCount;

    if (diff > 0) {
      // Adding new shards
      const effectiveDelay = getEffectiveStaggerDelay(diff);

      for (let i = 0; i < diff; i++) {
        const newIndex = currentShards.length;
        const color =
          colorPool[newIndex % Math.max(colorPool.length, 1)] ??
          MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];

        const shard = createShard(newIndex, count, color);
        group.add(shard.mesh);
        currentShards.push(shard);

        const delay = i * effectiveDelay;
        physics.push(createPhysicsState(shard.id, newIndex, delay, true));
      }

      recalculateTargetPositions(count);
    } else if (diff < 0) {
      // Removing shards - mark for leaving
      const removeCount = Math.abs(diff);
      const effectiveDelay = getEffectiveStaggerDelay(removeCount);

      // Find shards to remove (prefer those still joining, then stable ones from the end)
      // First, try to cancel any still-joining shards with pending delays
      const joiningWithDelay: number[] = [];
      const joiningActive: number[] = [];
      const stableIndices: number[] = [];

      for (let i = physics.length - 1; i >= 0; i--) {
        const p = physics[i];
        if (p.animationState === 'leaving') continue;

        if (p.animationState === 'joining') {
          if (p.animationDelay > 0 && p.animationProgress === 0) {
            joiningWithDelay.push(i);
          } else {
            joiningActive.push(i);
          }
        } else {
          stableIndices.push(i);
        }
      }

      // Prioritize removal: pending joins first, then active joins, then stable
      const removalOrder = [...joiningWithDelay, ...joiningActive, ...stableIndices];
      let removed = 0;
      let staggerIndex = 0;

      for (const idx of removalOrder) {
        if (removed >= removeCount) break;

        const p = physics[idx];

        // If shard hasn't started animating yet, instant remove it
        if (p.animationState === 'joining' && p.animationDelay > 0 && p.animationProgress === 0) {
          // Instant cancel - remove immediately
          const shard = currentShards[idx];
          shard.geometry.dispose();
          group.remove(shard.mesh);
          currentShards.splice(idx, 1);
          physics.splice(idx, 1);
          removed++;
          continue;
        }

        // Transition to leaving state
        if (p.animationState === 'joining') {
          // Reverse mid-animation: start from current scale
          p.reversedFromScale = p.scale;
          p.animationProgress = 0;
        } else {
          p.reversedFromScale = 1;
          p.animationProgress = 0;
        }

        p.animationState = 'leaving';
        p.animationDelay = staggerIndex * effectiveDelay;
        staggerIndex++;
        removed++;
      }

      recalculateTargetPositions(count);
    }

    targetCountRef.current = count;
  }, [
    count,
    createShard,
    createPhysicsState,
    getEffectiveStaggerDelay,
    recalculateTargetPositions,
  ]);

  // Initialize on first mount
  useEffect(() => {
    const group = groupRef.current;
    if (!group || targetCountRef.current !== 0) return;

    const colorPool = colorPoolRef.current.length > 0 ? colorPoolRef.current : MOOD_COLORS;

    for (let i = 0; i < count; i++) {
      const color = colorPool[i % colorPool.length];
      const shard = createShard(i, count, color);
      shard.mesh.scale.setScalar(1);
      shard.mesh.position.copy(shard.direction).multiplyScalar(baseRadius);
      group.add(shard.mesh);
      shardsRef.current.push(shard);

      const physics = createPhysicsState(shard.id, i, 0, false);
      physics.currentRadius = baseRadius;
      physics.scale = 1;
      physicsRef.current.push(physics);
    }

    targetCountRef.current = count;

    return () => {
      for (const shard of shardsRef.current) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
      shardsRef.current = [];
      physicsRef.current = [];
    };
  }, [count, createShard, createPhysicsState, baseRadius]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Animation loop - spring physics + join/leave animations
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Particle physics simulation requires multiple force calculations (spring, ambient, animation) and state transitions - refactoring would reduce readability
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    const group = groupRef.current;
    if (currentShards.length === 0 || physics.length === 0 || !group) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    try {
      const breathEntity = world.queryFirst(orbitRadius);
      if (breathEntity) {
        targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    const toRemove: number[] = [];

    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];
      if (!shard || !shardState) continue;

      // Handle animations
      if (shardState.animationState === 'joining') {
        if (shardState.animationDelay > 0) {
          shardState.animationDelay -= clampedDelta;
        } else {
          shardState.animationProgress += clampedDelta / animationDuration;
          if (shardState.animationProgress >= 1) {
            shardState.animationProgress = 1;
            shardState.animationState = 'stable';
          }
        }
        shardState.scale = easeInOutCubic(Math.min(shardState.animationProgress, 1));
      } else if (shardState.animationState === 'leaving') {
        if (shardState.animationDelay > 0) {
          shardState.animationDelay -= clampedDelta;
        } else {
          shardState.animationProgress += clampedDelta / animationDuration;
          if (shardState.animationProgress >= 1) {
            shardState.animationProgress = 1;
            toRemove.push(i);
          }
        }
        // Ease from reversedFromScale to 0
        const startScale = shardState.reversedFromScale;
        shardState.scale =
          startScale * (1 - easeInOutCubic(Math.min(shardState.animationProgress, 1)));
      }

      // Apply scale (minimum to prevent invisible mesh issues)
      shard.mesh.scale.setScalar(Math.max(shardState.scale, 0.001));

      // Smoothly interpolate direction toward target
      shard.direction.lerp(shard.targetDirection, POSITION_LERP_SPEED * clampedDelta);

      // Calculate target radius based on animation state
      const offsetBreathPhase = currentBreathPhase + shardState.phaseOffset;

      let baseTargetRadius: number;
      if (shardState.animationState === 'leaving') {
        baseTargetRadius = THREE.MathUtils.lerp(
          targetRadius,
          globeRadius,
          easeInOutCubic(shardState.animationProgress),
        );
      } else if (shardState.animationState === 'joining') {
        baseTargetRadius = THREE.MathUtils.lerp(
          globeRadius,
          targetRadius,
          easeInOutCubic(shardState.animationProgress),
        );
      } else {
        baseTargetRadius = targetRadius;
      }

      const phaseTargetRadius =
        baseTargetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;
      const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

      // Spring physics
      const targetDelta = clampedTarget - shardState.previousTarget;
      if (targetDelta > 0.001) {
        shardState.velocity += targetDelta * EXPANSION_VELOCITY_BOOST;
      }
      shardState.previousTarget = clampedTarget;

      const springForce = (clampedTarget - shardState.currentRadius) * SPRING_STIFFNESS;
      const dampingForce = -shardState.velocity * SPRING_DAMPING;
      shardState.velocity += (springForce + dampingForce) * clampedDelta;
      shardState.currentRadius += shardState.velocity * clampedDelta;

      // Ambient motion (reduced during animations)
      const ambientMult = shardState.animationState === 'stable' ? 1 : shardState.scale * 0.5;
      const seed = shardState.ambientSeed;
      const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE * ambientMult;
      const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE * ambientMult;
      const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE * ambientMult;

      shard.mesh.position
        .copy(shard.direction)
        .multiplyScalar(shardState.currentRadius)
        .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

      shard.mesh.rotation.x += 0.002;
      shard.mesh.rotation.y += 0.003;
    }

    // Remove completed leave animations (reverse order to maintain indices)
    if (toRemove.length > 0) {
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i];
        const shard = currentShards[idx];
        if (shard) {
          shard.geometry.dispose();
          group.remove(shard.mesh);
        }
        currentShards.splice(idx, 1);
        physics.splice(idx, 1);
      }
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
