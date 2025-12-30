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
 * - Wave effect: multiple joins staggered for visual flow
 * - Position interpolation: smooth gliding when count changes
 * - Randomized colors: prevents mood clustering
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
 * Shuffle array in place using Fisher-Yates algorithm
 * This ensures colors are randomly distributed, preventing mood clustering
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
 *
 * Converts mood counts into a shuffled array of Three.js Color instances.
 * Shuffling prevents mood clustering - colors are distributed randomly.
 *
 * @param users - Mood distribution from presence data
 * @returns Shuffled array of colors, one per user
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
  // Shuffle to prevent mood clustering
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
  const phi = Math.acos(-1 + (2 * index) / total);
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
  /** Delay between staggered join animations in seconds @default 0.15 */
  staggerDelay?: number;
}

/**
 * Animation states for shard lifecycle
 */
type ShardAnimationState = 'joining' | 'stable' | 'leaving' | 'removed';

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  targetDirection: THREE.Vector3; // For smooth position transitions
  geometry: THREE.IcosahedronGeometry;
  color: THREE.Color;
  id: number; // Unique identifier for tracking
}

/**
 * Physics + animation state for each shard
 */
interface ShardPhysicsState {
  /** Current interpolated radius (spring-smoothed) */
  currentRadius: number;
  /** Radial velocity for spring physics */
  velocity: number;
  /** Phase offset for subtle wave effect (0-0.05 range) */
  phaseOffset: number;
  /** Seed for ambient floating motion (unique per shard) */
  ambientSeed: number;
  /** Previous frame's target radius (for detecting expansion) */
  previousTarget: number;
  /** Animation state (joining, stable, leaving, removed) */
  animationState: ShardAnimationState;
  /** Animation progress (0-1) */
  animationProgress: number;
  /** Delay before animation starts (for stagger effect) */
  animationDelay: number;
  /** Current scale (0-1, for join/leave animations) */
  scale: number;
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
  staggerDelay = 0.15,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  const prevCountRef = useRef<number>(0);
  const colorPoolRef = useRef<THREE.Color[]>([]);

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(count), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared material (will be swapped by RefractionPipeline)
  const material = useMemo(() => createFrostedGlassMaterial(), []);

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
      // Start at globe surface (will animate outward)
      mesh.position.copy(direction).multiplyScalar(globeRadius);
      mesh.scale.setScalar(0); // Start invisible
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
    (index: number, delay: number, isJoining: boolean): ShardPhysicsState => {
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      return {
        currentRadius: globeRadius, // Start at globe surface
        velocity: 0,
        phaseOffset: ((index * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: index * 137.508,
        previousTarget: globeRadius,
        animationState: isJoining ? 'joining' : 'stable',
        animationProgress: 0,
        animationDelay: delay,
        scale: isJoining ? 0 : 1,
      };
    },
    [globeRadius],
  );

  // Update color pool when users change
  useEffect(() => {
    colorPoolRef.current = buildColorDistribution(users);
  }, [users]);

  // Handle count changes - add/remove shards with animations
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Shard lifecycle management requires coordinated add/remove logic with position recalculation - refactoring would reduce readability
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const prevCount = prevCountRef.current;
    const currentShards = shardsRef.current;
    const currentPhysics = physicsRef.current;
    const colorPool = colorPoolRef.current;

    // Calculate how many shards to add or remove
    const countDiff = count - prevCount;

    if (countDiff > 0) {
      // Adding new shards (users joining)
      for (let i = 0; i < countDiff; i++) {
        const newIndex = currentShards.length;
        // Get color from pool or random fallback
        const color =
          colorPool[newIndex % colorPool.length] ??
          MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];

        const shard = createShard(newIndex, count, color);
        group.add(shard.mesh);
        currentShards.push(shard);

        // Staggered delay for wave effect
        const delay = i * staggerDelay;
        currentPhysics.push(createPhysicsState(newIndex, delay, true));
      }

      // Update target positions for all shards (redistribute on sphere)
      for (let i = 0; i < currentShards.length; i++) {
        currentShards[i].targetDirection = getFibonacciPosition(i, count);
      }
    } else if (countDiff < 0) {
      // Removing shards (users leaving)
      const removeCount = Math.abs(countDiff);
      const removeIndices: number[] = [];

      // Mark last N shards for removal (most recently added leave first - LIFO)
      for (let i = 0; i < removeCount && currentShards.length - 1 - i >= 0; i++) {
        const idx = currentShards.length - 1 - i;
        if (currentPhysics[idx] && currentPhysics[idx].animationState !== 'leaving') {
          currentPhysics[idx].animationState = 'leaving';
          currentPhysics[idx].animationProgress = 0;
          currentPhysics[idx].animationDelay = i * staggerDelay;
          removeIndices.push(idx);
        }
      }

      // Update target positions for remaining shards
      const remainingCount = currentShards.length - removeCount;
      for (let i = 0; i < currentShards.length; i++) {
        if (!removeIndices.includes(i)) {
          // Find new index in remaining set
          const newIdx =
            currentShards.slice(0, i + 1).filter((_, j) => !removeIndices.includes(j)).length - 1;
          currentShards[i].targetDirection = getFibonacciPosition(newIdx, remainingCount);
        }
      }
    }

    prevCountRef.current = count;
  }, [count, createShard, createPhysicsState, staggerDelay]);

  // Initialize on first mount
  useEffect(() => {
    const group = groupRef.current;
    if (!group || prevCountRef.current !== 0) return;

    const colorPool = colorPoolRef.current.length > 0 ? colorPoolRef.current : MOOD_COLORS;

    // Create initial shards
    for (let i = 0; i < count; i++) {
      const color = colorPool[i % colorPool.length];
      const shard = createShard(i, count, color);
      // Initial shards start stable (already present)
      shard.mesh.scale.setScalar(1);
      shard.mesh.position.copy(shard.direction).multiplyScalar(baseRadius);
      group.add(shard.mesh);
      shardsRef.current.push(shard);

      const physics = createPhysicsState(i, 0, false);
      physics.currentRadius = baseRadius;
      physics.scale = 1;
      physicsRef.current.push(physics);
    }

    prevCountRef.current = count;

    // Cleanup on unmount
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

    // Cap delta to prevent physics explosion on tab switch
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

    // Track indices to remove after animation completes
    const toRemove: number[] = [];

    // Update each shard
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];

      // Handle join/leave animations
      if (shardState.animationState === 'joining') {
        // Update animation progress (with delay)
        if (shardState.animationDelay > 0) {
          shardState.animationDelay -= clampedDelta;
        } else {
          shardState.animationProgress += clampedDelta / animationDuration;
          if (shardState.animationProgress >= 1) {
            shardState.animationProgress = 1;
            shardState.animationState = 'stable';
          }
        }
        // Ease scale from 0 to 1
        shardState.scale = easeInOutCubic(Math.min(shardState.animationProgress, 1));
      } else if (shardState.animationState === 'leaving') {
        // Update animation progress (with delay)
        if (shardState.animationDelay > 0) {
          shardState.animationDelay -= clampedDelta;
        } else {
          shardState.animationProgress += clampedDelta / animationDuration;
          if (shardState.animationProgress >= 1) {
            shardState.animationProgress = 1;
            shardState.animationState = 'removed';
            toRemove.push(i);
          }
        }
        // Ease scale from 1 to 0
        shardState.scale = 1 - easeInOutCubic(Math.min(shardState.animationProgress, 1));
      }

      // Apply scale
      shard.mesh.scale.setScalar(Math.max(shardState.scale, 0.001));

      // Smoothly interpolate direction toward target (for position redistribution)
      shard.direction.lerp(shard.targetDirection, POSITION_LERP_SPEED * clampedDelta);

      // Apply phase offset for wave effect
      const offsetBreathPhase = currentBreathPhase + shardState.phaseOffset;

      // Calculate target radius with phase offset applied
      // During join animation, interpolate from globe to orbit radius
      const baseTargetRadius =
        shardState.animationState === 'leaving'
          ? THREE.MathUtils.lerp(
              targetRadius,
              globeRadius,
              easeInOutCubic(shardState.animationProgress),
            )
          : shardState.animationState === 'joining'
            ? THREE.MathUtils.lerp(
                globeRadius,
                targetRadius,
                easeInOutCubic(shardState.animationProgress),
              )
            : targetRadius;

      const phaseTargetRadius =
        baseTargetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;

      // Clamp target to prevent penetrating globe
      const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

      // Detect expansion (exhale) and apply velocity boost
      const targetDelta = clampedTarget - shardState.previousTarget;
      if (targetDelta > 0.001) {
        shardState.velocity += targetDelta * EXPANSION_VELOCITY_BOOST;
      }
      shardState.previousTarget = clampedTarget;

      // Spring physics: F = -k(x - target) - c*v
      const springForce = (clampedTarget - shardState.currentRadius) * SPRING_STIFFNESS;
      const dampingForce = -shardState.velocity * SPRING_DAMPING;
      const totalForce = springForce + dampingForce;

      // Integrate velocity and position
      shardState.velocity += totalForce * clampedDelta;
      shardState.currentRadius += shardState.velocity * clampedDelta;

      // Ambient floating motion (reduced during animations)
      const ambientScale = shardState.animationState === 'stable' ? 1 : shardState.scale * 0.5;
      const seed = shardState.ambientSeed;
      const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE * ambientScale;
      const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE * ambientScale;
      const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE * ambientScale;

      // Compute final position: spring-smoothed radius + ambient offset
      shard.mesh.position
        .copy(shard.direction)
        .multiplyScalar(shardState.currentRadius)
        .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

      // Continuous rotation
      shard.mesh.rotation.x += 0.002;
      shard.mesh.rotation.y += 0.003;
    }

    // Remove completed leave animations
    if (toRemove.length > 0) {
      // Remove in reverse order to maintain indices
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i];
        const shard = currentShards[idx];
        shard.geometry.dispose();
        group.remove(shard.mesh);
        currentShards.splice(idx, 1);
        physics.splice(idx, 1);
      }
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
