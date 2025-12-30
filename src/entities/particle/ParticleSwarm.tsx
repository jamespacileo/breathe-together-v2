/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses a pool-based system with lifecycle management for smooth animations:
 * - Particles spawn with scale + position animation when users join
 * - Particles shrink and float away when users leave
 * - Rapid updates don't cause jarring resets
 *
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
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
 * Maximum particle pool size
 * Pre-allocated to avoid runtime allocations during count changes
 */
const MAX_POOL_SIZE = 200;

/**
 * Fisher-Yates shuffle for randomizing array in-place
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Build color distribution array from presence data
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
}

/**
 * Lifecycle states for pool-based particle management
 *
 * - inactive: Not visible, waiting in pool
 * - spawning: Animating in (scale up + move outward)
 * - active: Fully visible, following breathing physics
 * - departing: Animating out (scale down + float away)
 */
type ParticleLifecycle = 'inactive' | 'spawning' | 'active' | 'departing';

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
}

/**
 * Physics state for organic breathing animation with lifecycle management
 */
interface ShardPhysicsState {
  /** Current lifecycle state */
  lifecycle: ParticleLifecycle;
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
  /** Spawn animation progress (0 = just spawned, 1 = fully arrived) */
  spawnProgress: number;
  /** Staggered spawn delay in seconds (particles appear in waves) */
  spawnDelay: number;
  /** Departure animation progress (0 = just started, 1 = fully gone) */
  departProgress: number;
  /** Time when this particle's spawn/depart animation was queued */
  animationQueueTime: number;
}

// Spring physics constants
const SPRING_STIFFNESS = 6;
const SPRING_DAMPING = 4.5;
const EXPANSION_VELOCITY_BOOST = 2.5;

// Ambient floating motion
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;

// Phase stagger
const MAX_PHASE_OFFSET = 0.04;

// Spawn animation constants
const SPAWN_WAVE_DURATION = 1.2;
const SPAWN_ANIMATION_SPEED = 2.5;
const SPAWN_START_RADIUS_FACTOR = 0.3;

// Departure animation constants
const DEPART_WAVE_DURATION = 0.8; // Faster exit than entrance
const DEPART_ANIMATION_SPEED = 3.0;
const DEPART_FLOAT_DISTANCE = 2.0; // How far particles float outward when leaving

/**
 * Ease-out back function for organic "pop" effect on spawn
 */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * Ease-out cubic for smooth position interpolation
 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Ease-in cubic for departure (accelerating away)
 */
function easeInCubic(t: number): number {
  return t ** 3;
}

/**
 * Ease-in-out for smooth scale transitions
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function ParticleSwarm({
  count = 48,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  const currentTimeRef = useRef<number>(0);
  const targetCountRef = useRef<number>(count);
  const poolInitializedRef = useRef<boolean>(false);

  // Calculate shard size (use count for sizing, capped)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(Math.max(count, 1)), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared material (stable reference)
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  // Golden ratio for staggered animations
  const goldenRatio = useMemo(() => (1 + Math.sqrt(5)) / 2, []);

  /**
   * Initialize particle pool once on mount
   * Pre-allocates MAX_POOL_SIZE particles, all starting as inactive
   */
  useEffect(() => {
    const group = groupRef.current;
    if (!group || poolInitializedRef.current) return;

    const shards: ShardData[] = [];
    const physicsStates: ShardPhysicsState[] = [];

    for (let i = 0; i < MAX_POOL_SIZE; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Default color (will be updated when activated)
      applyVertexColors(geometry, MOOD_COLORS[i % MOOD_COLORS.length]);

      // Fibonacci sphere distribution for consistent positions
      const phi = Math.acos(-1 + (2 * i) / MAX_POOL_SIZE);
      const theta = Math.sqrt(MAX_POOL_SIZE * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true;
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;
      mesh.visible = false; // Start hidden
      mesh.scale.setScalar(0);

      group.add(mesh);
      shards.push({ mesh, direction, geometry });

      // Initialize physics state as inactive
      physicsStates.push({
        lifecycle: 'inactive',
        currentRadius: baseRadius * SPAWN_START_RADIUS_FACTOR,
        velocity: 0,
        phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: i * 137.508,
        previousTarget: baseRadius,
        spawnProgress: 0,
        spawnDelay: 0,
        departProgress: 0,
        animationQueueTime: 0,
      });
    }

    shardsRef.current = shards;
    physicsRef.current = physicsStates;
    poolInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
      poolInitializedRef.current = false;
    };
  }, [material, baseRadius, shardSize, goldenRatio]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  /**
   * Update colors when users change (without full reconstruction)
   */
  const updateColors = useCallback(
    (targetCount: number, users: Partial<Record<MoodId, number>> | undefined) => {
      const shards = shardsRef.current;
      const physics = physicsRef.current;
      if (shards.length === 0) return;

      const colorDistribution = buildColorDistribution(users);

      // Update colors for active and spawning particles
      for (let i = 0; i < Math.min(targetCount, shards.length); i++) {
        const state = physics[i];
        if (state.lifecycle === 'active' || state.lifecycle === 'spawning') {
          const color =
            colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
          applyVertexColors(shards[i].geometry, color);
          // Mark geometry for update
          shards[i].geometry.attributes.color.needsUpdate = true;
        }
      }
    },
    [],
  );

  /**
   * Handle count changes - activate/deactivate particles with animations
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Particle lifecycle management requires coordinating spawn/depart animations, color updates, and state transitions - splitting would fragment the logic
  useEffect(() => {
    const physics = physicsRef.current;
    const shards = shardsRef.current;
    if (physics.length === 0 || shards.length === 0) return;

    const currentTime = currentTimeRef.current;
    const clampedCount = Math.min(count, MAX_POOL_SIZE);
    const previousTarget = targetCountRef.current;
    targetCountRef.current = clampedCount;

    const colorDistribution = buildColorDistribution(users);

    if (clampedCount > previousTarget) {
      // --- INCREASING: Activate more particles ---
      let activated = 0;
      const toActivate = clampedCount - previousTarget;

      for (let i = 0; i < physics.length && activated < toActivate; i++) {
        const state = physics[i];

        if (state.lifecycle === 'inactive') {
          // Activate this particle
          state.lifecycle = 'spawning';
          state.spawnProgress = 0;
          state.currentRadius = baseRadius * SPAWN_START_RADIUS_FACTOR;
          state.velocity = 0;
          state.previousTarget = baseRadius;
          // Stagger spawn timing based on activation order
          state.spawnDelay = ((activated * goldenRatio) % 1) * SPAWN_WAVE_DURATION;
          state.animationQueueTime = currentTime;

          // Update color
          const color =
            colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
          applyVertexColors(shards[i].geometry, color);
          shards[i].geometry.attributes.color.needsUpdate = true;

          // Make visible
          shards[i].mesh.visible = true;
          shards[i].mesh.scale.setScalar(0);

          activated++;
        } else if (state.lifecycle === 'departing') {
          // Cancel departure - reactivate
          state.lifecycle = 'spawning';
          // Continue from current scale (departProgress maps inversely to spawnProgress)
          state.spawnProgress = 1 - state.departProgress;
          state.departProgress = 0;
          state.spawnDelay = 0; // Immediate, no delay for reactivation
          state.animationQueueTime = currentTime;

          activated++;
        }
      }
    } else if (clampedCount < previousTarget) {
      // --- DECREASING: Deactivate excess particles ---
      let deactivated = 0;
      const toDeactivate = previousTarget - clampedCount;

      // Deactivate from the end (highest indices first) for visual consistency
      for (let i = physics.length - 1; i >= 0 && deactivated < toDeactivate; i--) {
        const state = physics[i];

        if (state.lifecycle === 'active' || state.lifecycle === 'spawning') {
          // Start departure animation
          state.lifecycle = 'departing';
          state.departProgress = 0;
          // Stagger departure timing
          state.spawnDelay = ((deactivated * goldenRatio) % 1) * DEPART_WAVE_DURATION;
          state.animationQueueTime = currentTime;

          deactivated++;
        }
      }
    }

    // Update colors for existing particles
    updateColors(clampedCount, users);
  }, [count, users, baseRadius, goldenRatio, updateColors]);

  // Animation loop - lifecycle management + spring physics + ambient motion
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Frame loop handles 4 lifecycle states (inactive/spawning/active/departing) with physics, position, and scale updates - splitting would reduce readability and add function call overhead
  useFrame((state, delta) => {
    const shards = shardsRef.current;
    const physics = physicsRef.current;
    if (shards.length === 0 || physics.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;
    currentTimeRef.current = time;

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

    // Update each particle based on lifecycle state
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      const shardState = physics[i];

      // Skip inactive particles
      if (shardState.lifecycle === 'inactive') {
        continue;
      }

      const timeSinceAnimation = time - shardState.animationQueueTime;

      // --- SPAWNING LIFECYCLE ---
      if (shardState.lifecycle === 'spawning') {
        // Check if spawn should start (after staggered delay)
        if (timeSinceAnimation >= shardState.spawnDelay) {
          shardState.spawnProgress = Math.min(
            shardState.spawnProgress + clampedDelta * SPAWN_ANIMATION_SPEED,
            1,
          );

          // Scale animation with easeOutBack for organic "pop" effect
          const scaleT = easeOutBack(shardState.spawnProgress);
          shard.mesh.scale.setScalar(scaleT);

          // Position animation: lerp from near-globe to target orbit radius
          const positionT = easeOutCubic(shardState.spawnProgress);
          const spawnRadius =
            baseRadius * SPAWN_START_RADIUS_FACTOR +
            (targetRadius - baseRadius * SPAWN_START_RADIUS_FACTOR) * positionT;
          shardState.currentRadius = spawnRadius;
          shardState.previousTarget = spawnRadius;

          // Transition to active when spawn complete
          if (shardState.spawnProgress >= 1) {
            shardState.lifecycle = 'active';
          }
        }
      }

      // --- DEPARTING LIFECYCLE ---
      if (shardState.lifecycle === 'departing') {
        // Check if departure should start (after staggered delay)
        if (timeSinceAnimation >= shardState.spawnDelay) {
          shardState.departProgress = Math.min(
            shardState.departProgress + clampedDelta * DEPART_ANIMATION_SPEED,
            1,
          );

          // Scale down with easeInOutQuad for smooth shrink
          const scaleT = 1 - easeInOutQuad(shardState.departProgress);
          shard.mesh.scale.setScalar(Math.max(scaleT, 0));

          // Float outward as it departs
          const floatT = easeInCubic(shardState.departProgress);
          shardState.currentRadius = shardState.previousTarget + floatT * DEPART_FLOAT_DISTANCE;

          // Transition to inactive when departure complete
          if (shardState.departProgress >= 1) {
            shardState.lifecycle = 'inactive';
            shard.mesh.visible = false;
            shard.mesh.scale.setScalar(0);
            // Reset for next use
            shardState.spawnProgress = 0;
            shardState.departProgress = 0;
            shardState.currentRadius = baseRadius * SPAWN_START_RADIUS_FACTOR;
          }
        }
      }

      // --- ACTIVE LIFECYCLE: Spring Physics ---
      if (shardState.lifecycle === 'active') {
        const offsetBreathPhase = currentBreathPhase + shardState.phaseOffset;
        const phaseTargetRadius =
          targetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;
        const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

        // Detect expansion and apply velocity boost
        const targetDelta = clampedTarget - shardState.previousTarget;
        if (targetDelta > 0.001) {
          shardState.velocity += targetDelta * EXPANSION_VELOCITY_BOOST;
        }
        shardState.previousTarget = clampedTarget;

        // Spring physics
        const springForce = (clampedTarget - shardState.currentRadius) * SPRING_STIFFNESS;
        const dampingForce = -shardState.velocity * SPRING_DAMPING;
        const totalForce = springForce + dampingForce;

        shardState.velocity += totalForce * clampedDelta;
        shardState.currentRadius += shardState.velocity * clampedDelta;
      }

      // --- Apply position for all visible particles ---
      if (shardState.lifecycle !== 'inactive') {
        // Ambient floating motion
        const seed = shardState.ambientSeed;
        const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE;
        const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE;
        const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE;

        shard.mesh.position
          .copy(shard.direction)
          .multiplyScalar(shardState.currentRadius)
          .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

        // Continuous rotation
        shard.mesh.rotation.x += 0.002;
        shard.mesh.rotation.y += 0.003;
      }
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
