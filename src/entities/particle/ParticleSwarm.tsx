/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { easeExhale, easeInhale } from '../../lib/breathCalc';
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
 * Build color distribution array from presence data with randomization
 *
 * Converts mood counts into an array of Three.js Color instances, where each
 * user is represented by their mood color. The array is shuffled using
 * Fisher-Yates algorithm to prevent mood-based clustering.
 *
 * **Example:**
 * ```ts
 * const users = { calm: 3, energized: 2 };
 * // Returns: [energizedColor, calmColor, energizedColor, calmColor, calmColor] (randomized)
 * ```
 *
 * **Performance:** Linear time O(n) where n is total user count. Called once
 * per presence update (typically ~1-5 times per minute).
 *
 * @param users - Mood distribution from presence data (e.g., { calm: 5, energized: 3 })
 * @returns Shuffled array of colors, one per user. Empty array if no users.
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

  // Fisher-Yates shuffle to randomize color order (prevents mood clustering)
  for (let i = colorDistribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colorDistribution[i], colorDistribution[j]] = [colorDistribution[j], colorDistribution[i]];
  }

  return colorDistribution;
}

/**
 * Apply per-vertex color to icosahedron geometry
 *
 * Sets vertex colors for all vertices in the geometry to the specified color.
 * Required for THREE.InstancedMesh with vertexColors enabled.
 *
 * **Implementation:** Creates Float32Array with RGB triplets for each vertex.
 * Icosahedron geometry has 12 vertices by default (detail level 0).
 *
 * **Performance:** Called once per unique shard geometry during initialization.
 * O(v) where v is vertex count.
 *
 * @param geometry - Icosahedron geometry to modify
 * @param color - Three.js color to apply to all vertices
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
 * Lifecycle states for shard animations
 *
 * - spawning: Shard is animating in (scale 0 → 1)
 * - active: Shard is fully visible and participating in breathing
 * - removing: Shard is animating out (scale 1 → 0)
 */
type ShardLifecycleState = 'spawning' | 'active' | 'removing';

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
  /** Lifecycle state for arrival/departure animations */
  lifecycleState: ShardLifecycleState;
  /** Timestamp when lifecycle state changed (for animation timing) */
  stateChangeTime: number;
  /** Target scale (usually 1.0, adjusted for shard size) */
  targetScale: number;
  /** Stable ID for tracking across updates */
  id: string;
  /** Spawn origin position (for arrival animation) */
  spawnOrigin: THREE.Vector3;
  /** Target orbit radius (for arrival animation) */
  targetRadius: number;
}

/**
 * Physics state for organic breathing animation
 *
 * Each shard has independent spring physics + ambient motion for natural feel:
 * - Spring physics: smooth transitions with settling on holds
 * - Phase offset: subtle wave effect (particles don't move in perfect lockstep)
 * - Ambient seed: unique floating pattern per shard
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
}

/**
 * Spring physics constants for relaxed breathing feel
 *
 * Tuned for controlled relaxation breathing:
 * - Stiffness: responsive but not instant (follows breath naturally)
 * - Damping: settles quickly on holds without oscillation
 * - Expansion boost: immediate response when exhale begins
 */
const SPRING_STIFFNESS = 6; // Lower = more lag, higher = snappier
const SPRING_DAMPING = 4.5; // Lower = oscillates, higher = settles faster

/**
 * Expansion velocity boost for immediate exhale response
 *
 * When target radius increases (exhale starts), inject outward velocity
 * proportional to target change. This overcomes spring lag and makes
 * the exhale expansion feel immediate rather than delayed.
 *
 * The boost is asymmetric - only applied during expansion (exhale),
 * not contraction (inhale), for a more natural "release" feel.
 */
const EXPANSION_VELOCITY_BOOST = 2.5; // Multiplier for expansion velocity injection

/**
 * Ambient floating motion constants
 *
 * Secondary motion layer - particles "float" even during holds
 * Creates alive, breathing atmosphere without disrupting synchronization
 */
const AMBIENT_SCALE = 0.08; // Maximum ambient offset
const AMBIENT_Y_SCALE = 0.04; // Vertical motion is more subtle

/**
 * Phase stagger for wave effect
 *
 * Small offset per particle creates flowing wave during breath transitions
 * Kept small (3-5%) to maintain "breathing together" feel
 */
const MAX_PHASE_OFFSET = 0.04; // 4% of breath cycle

/**
 * Arrival/departure animation constants
 *
 * - Duration: 2 seconds (half breath cycle) for natural integration
 * - Stagger: 80ms between sequential spawns for wave effect
 */
const SPAWN_ANIMATION_DURATION = 2000; // milliseconds
const SPAWN_STAGGER_DELAY = 80; // milliseconds between sequential spawns

/**
 * Create a single shard with geometry, mesh, and lifecycle metadata
 *
 * @param index - Shard index for Fibonacci sphere positioning
 * @param totalCount - Total number of shards for distribution calculation
 * @param color - Mood color to apply to shard
 * @param material - Shared frosted glass material
 * @param shardSize - Size of the shard geometry
 * @param baseRadius - Base orbit radius
 * @param spawnDelay - Delay before spawn animation starts (for staggering)
 * @param globeRadius - Globe radius for spawn origin calculation
 * @returns ShardData with initialized lifecycle state
 */
function createShard(
  index: number,
  totalCount: number,
  color: THREE.Color,
  material: THREE.Material,
  shardSize: number,
  baseRadius: number,
  spawnDelay: number = 0,
  globeRadius: number = 1.5,
): ShardData {
  const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
  applyVertexColors(geometry, color);

  // Fibonacci sphere distribution for even spatial placement
  const phi = Math.acos(-1 + (2 * index) / totalCount);
  const theta = Math.sqrt(totalCount * Math.PI) * phi;
  const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

  // Start at globe surface for spawn animation
  const spawnOrigin = direction.clone().multiplyScalar(globeRadius + shardSize);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.useRefraction = true; // Mark for RefractionPipeline
  mesh.position.copy(spawnOrigin); // Start at spawn origin
  mesh.lookAt(0, 0, 0);
  mesh.frustumCulled = false;
  mesh.scale.setScalar(0); // Start at scale 0 for spawn animation

  return {
    mesh,
    direction,
    geometry,
    lifecycleState: 'spawning',
    stateChangeTime: Date.now() + spawnDelay,
    targetScale: 1.0,
    id: `shard-${Date.now()}-${index}`,
    spawnOrigin,
    targetRadius: baseRadius,
  };
}

/**
 * Add new shards to the scene with staggered spawn animations
 * Extracted to reduce complexity of incremental update effect
 */
function addNewShards(
  delta: number,
  prevCount: number,
  count: number,
  users: Partial<Record<MoodId, number>> | undefined,
  material: THREE.Material,
  shardSize: number,
  baseRadius: number,
  globeRadius: number,
  group: THREE.Group,
  currentShards: ShardData[],
  currentPhysics: ShardPhysicsState[],
): void {
  const colorDistribution = buildColorDistribution(users);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < delta; i++) {
    const globalIndex = prevCount + i;
    const color =
      colorDistribution[globalIndex] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];

    // Create shard with staggered spawn delay
    const shard = createShard(
      globalIndex,
      count,
      color,
      material,
      shardSize,
      baseRadius,
      i * SPAWN_STAGGER_DELAY,
      globeRadius,
    );

    // Add to scene
    group.add(shard.mesh);
    currentShards.push(shard);

    // Initialize physics state
    currentPhysics.push({
      currentRadius: baseRadius,
      velocity: 0,
      phaseOffset: ((globalIndex * goldenRatio) % 1) * MAX_PHASE_OFFSET,
      ambientSeed: globalIndex * 137.508,
      previousTarget: baseRadius,
    });
  }
}

/**
 * Mark excess shards for removal with FIFO ordering
 * Extracted to reduce complexity of incremental update effect
 */
function markShardsForRemoval(removeCount: number, currentShards: ShardData[]): void {
  // Mark oldest shards for removal (FIFO)
  for (let i = 0; i < removeCount && i < currentShards.length; i++) {
    const shard = currentShards[i];
    if (shard.lifecycleState !== 'removing') {
      shard.lifecycleState = 'removing';
      shard.stateChangeTime = Date.now();
    }
  }
}

/**
 * Update shard colors without recreating geometries
 * Extracted to reduce complexity of incremental update effect
 */
function updateShardColors(
  users: Partial<Record<MoodId, number>> | undefined,
  currentShards: ShardData[],
): void {
  const colorDistribution = buildColorDistribution(users);
  for (let i = 0; i < currentShards.length; i++) {
    const shard = currentShards[i];
    const color =
      colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
    applyVertexColors(shard.geometry, color);
    shard.geometry.attributes.color.needsUpdate = true;
  }
}

/**
 * Update shard scale and position based on lifecycle state
 * Returns true if shard should be removed
 * Extracted to reduce complexity of animation loop
 */
function updateShardLifecycleAnimation(shard: ShardData, now: number): boolean {
  const elapsed = now - shard.stateChangeTime;
  const progress = Math.min(elapsed / SPAWN_ANIMATION_DURATION, 1);

  if (shard.lifecycleState === 'spawning') {
    // Animate from spawn origin → target orbit position with easeInhale curve
    const easedProgress = easeInhale(progress);

    // Scale from 0 → targetScale
    shard.mesh.scale.setScalar(easedProgress * shard.targetScale);

    // Position: interpolate from spawnOrigin to targetRadius
    const currentRadius =
      shard.spawnOrigin.length() +
      (shard.targetRadius - shard.spawnOrigin.length()) * easedProgress;
    shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

    if (progress >= 1) {
      shard.lifecycleState = 'active';
      // Ensure final position is exact
      shard.mesh.position.copy(shard.direction).multiplyScalar(shard.targetRadius);
    }
    return false;
  }

  if (shard.lifecycleState === 'removing') {
    // Animate from target orbit position → spawn origin with easeExhale curve
    const easedProgress = easeExhale(progress);
    const reverseProgress = 1 - easedProgress;

    // Scale from targetScale → 0
    shard.mesh.scale.setScalar(reverseProgress * shard.targetScale);

    // Position: interpolate from targetRadius back to spawnOrigin
    const currentRadius =
      shard.targetRadius - (shard.targetRadius - shard.spawnOrigin.length()) * easedProgress;
    shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

    return progress >= 1; // Mark for removal
  }

  // Active state: maintain full scale (position handled by physics)
  shard.mesh.scale.setScalar(shard.targetScale);
  return false;
}

/**
 * Update shard physics (spring + ambient motion) and position
 * Extracted to reduce complexity of animation loop
 */
function updateShardPhysics(
  shard: ShardData,
  physicsState: ShardPhysicsState,
  targetRadius: number,
  currentBreathPhase: number,
  baseRadius: number,
  minOrbitRadius: number,
  clampedDelta: number,
  time: number,
): void {
  // Apply phase offset for wave effect
  const offsetBreathPhase = currentBreathPhase + physicsState.phaseOffset;

  // Calculate target radius with phase offset applied
  const phaseTargetRadius =
    targetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;

  // Clamp target to prevent penetrating globe
  const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

  // Detect expansion (exhale) and apply velocity boost
  const targetDelta = clampedTarget - physicsState.previousTarget;
  if (targetDelta > 0.001) {
    physicsState.velocity += targetDelta * EXPANSION_VELOCITY_BOOST;
  }
  physicsState.previousTarget = clampedTarget;

  // Spring physics: F = -k(x - target) - c*v
  const springForce = (clampedTarget - physicsState.currentRadius) * SPRING_STIFFNESS;
  const dampingForce = -physicsState.velocity * SPRING_DAMPING;
  const totalForce = springForce + dampingForce;

  // Integrate velocity and position
  physicsState.velocity += totalForce * clampedDelta;
  physicsState.currentRadius += physicsState.velocity * clampedDelta;

  // Ambient floating motion (secondary layer)
  const seed = physicsState.ambientSeed;
  const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE;
  const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE;
  const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE;

  // Compute final position: spring-smoothed radius + ambient offset
  shard.mesh.position
    .copy(shard.direction)
    .multiplyScalar(physicsState.currentRadius)
    .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

  // Continuous rotation
  shard.mesh.rotation.x += 0.002;
  shard.mesh.rotation.y += 0.003;
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

  // Track previous count to detect changes
  const prevCountRef = useRef(count);
  const prevUsersRef = useRef(users);

  // Incremental shard management: add/remove only changed shards
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const prevCount = prevCountRef.current;
    const currentShards = shardsRef.current;
    const currentPhysics = physicsRef.current;

    // Calculate the change in shard count
    const delta = count - prevCount;

    if (delta > 0) {
      // ADD new shards
      addNewShards(
        delta,
        prevCount,
        count,
        users,
        material,
        shardSize,
        baseRadius,
        globeRadius,
        group,
        currentShards,
        currentPhysics,
      );
    } else if (delta < 0) {
      // REMOVE excess shards (mark as 'removing' for animation)
      markShardsForRemoval(Math.abs(delta), currentShards);
    }

    // UPDATE colors if user distribution changed (without recreating shards)
    const usersChanged = JSON.stringify(prevUsersRef.current) !== JSON.stringify(users);
    if (usersChanged && delta === 0) {
      updateShardColors(users, currentShards);
    }

    prevCountRef.current = count;
    prevUsersRef.current = users;
  }, [count, users, baseRadius, shardSize, material, globeRadius]);

  // Initial setup: create all shards on first mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: Effect runs once on mount - guarded by shardsRef.current.length check
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Only run on first mount (when shardsRef is empty)
    if (shardsRef.current.length > 0) return;

    const colorDistribution = buildColorDistribution(users);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const newShards: ShardData[] = [];
    const newPhysics: ShardPhysicsState[] = [];

    for (let i = 0; i < count; i++) {
      const color =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];

      const shard = createShard(i, count, color, material, shardSize, baseRadius, 0, globeRadius);

      // Initial shards start in 'active' state with full scale (no spawn animation on load)
      shard.lifecycleState = 'active';
      shard.mesh.scale.setScalar(1.0);
      shard.mesh.position.copy(shard.direction).multiplyScalar(baseRadius); // Set to final position

      group.add(shard.mesh);
      newShards.push(shard);

      newPhysics.push({
        currentRadius: baseRadius,
        velocity: 0,
        phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: i * 137.508,
        previousTarget: baseRadius,
      });
    }

    shardsRef.current = newShards;
    physicsRef.current = newPhysics;

    // Cleanup on unmount
    return () => {
      for (const shard of newShards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
      shardsRef.current = [];
      physicsRef.current = [];
    };
  }, []); // Only run once on mount

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Animation loop - lifecycle animations + spring physics + ambient motion
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    if (currentShards.length === 0 || physics.length === 0) return;

    // Cap delta to prevent physics explosion on tab switch
    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;
    const now = Date.now();

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

    // Track indices of shards to remove after animation completes
    const shardsToRemove: number[] = [];

    // Update each shard with lifecycle animation + spring physics + ambient motion
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const physicsState = physics[i];

      // Update lifecycle scale animation
      const shouldRemove = updateShardLifecycleAnimation(shard, now);
      if (shouldRemove) {
        shardsToRemove.push(i);
        continue; // Skip physics/position updates for removed shards
      }

      // Update spring physics and position
      updateShardPhysics(
        shard,
        physicsState,
        targetRadius,
        currentBreathPhase,
        baseRadius,
        minOrbitRadius,
        clampedDelta,
        time,
      );
    }

    // Cleanup: remove shards that completed removal animation
    if (shardsToRemove.length > 0) {
      const group = groupRef.current;
      // Remove in reverse order to preserve indices
      for (let i = shardsToRemove.length - 1; i >= 0; i--) {
        const index = shardsToRemove[i];
        const shard = currentShards[index];

        // Dispose GPU resources
        shard.geometry.dispose();

        // Remove from scene
        if (group) {
          group.remove(shard.mesh);
        }

        // Remove from arrays
        currentShards.splice(index, 1);
        physics.splice(index, 1);
      }
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
