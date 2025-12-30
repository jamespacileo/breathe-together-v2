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
 * Fisher-Yates shuffle for randomizing array in-place
 *
 * Provides uniform random distribution of elements.
 * Used to randomize color assignment across particles.
 *
 * @param array - Array to shuffle in-place
 * @returns The same array, now shuffled
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
 *
 * Converts mood counts into an array of Three.js Color instances, where each
 * user is represented by their mood color. The array is shuffled to create
 * a visually random distribution of colors across the sphere.
 *
 * **Example:**
 * ```ts
 * const users = { calm: 3, energized: 2 };
 * // Returns shuffled: [energizedColor, calmColor, calmColor, energizedColor, calmColor]
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

  // Shuffle for random color distribution across sphere
  return shuffleArray(colorDistribution);
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

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
}

/**
 * Physics state for organic breathing animation
 *
 * Each shard has independent spring physics + ambient motion for natural feel:
 * - Spring physics: smooth transitions with settling on holds
 * - Phase offset: subtle wave effect (particles don't move in perfect lockstep)
 * - Ambient seed: unique floating pattern per shard
 * - Spawn animation: scale + position animation for arrival
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
  /** Spawn animation progress (0 = just spawned, 1 = fully arrived) */
  spawnProgress: number;
  /** Staggered spawn delay in seconds (particles appear in waves) */
  spawnDelay: number;
  /** Whether spawn animation has started */
  spawnStarted: boolean;
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
 * Spawn animation constants
 *
 * Controls the arrival animation for new particles:
 * - Total duration: how long the full wave takes to complete
 * - Animation speed: how fast each individual particle scales up
 * - Start radius: particles spawn from center (globe surface)
 */
const SPAWN_WAVE_DURATION = 1.2; // Total time for all particles to start spawning
const SPAWN_ANIMATION_SPEED = 2.5; // How fast each particle animates (higher = faster)
const SPAWN_START_RADIUS_FACTOR = 0.3; // Start at 30% of target radius (near globe)

/**
 * Ease-out back function for organic "pop" effect
 *
 * Creates slight overshoot then settle - feels like particles are
 * "blooming" into existence rather than mechanically appearing.
 *
 * @param t - Progress value 0 to 1
 * @returns Eased value with slight overshoot
 */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * Ease-out cubic for smooth position interpolation
 *
 * @param t - Progress value 0 to 1
 * @returns Eased value
 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
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
  const spawnStartTimeRef = useRef<number>(-1); // Track when particles started spawning

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

  // Create shards with per-vertex colors
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const colorDistribution = buildColorDistribution(users);

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Apply per-vertex color from distribution or random fallback
      const mood =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
      applyVertexColors(geometry, mood);

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true; // Mark for RefractionPipeline
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      result.push({ mesh, direction, geometry });
    }

    return result;
  }, [count, users, baseRadius, shardSize, material]);

  // Add meshes to group and initialize physics state
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Add new shards and initialize physics state
    const physicsStates: ShardPhysicsState[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      group.add(shard.mesh);

      // Start at scale 0 for spawn animation
      shard.mesh.scale.setScalar(0);

      // Calculate staggered spawn delay using golden ratio for even distribution
      // This creates a wave effect where particles appear in a pleasing sequence
      const spawnDelay = ((i * goldenRatio) % 1) * SPAWN_WAVE_DURATION;

      // Initialize physics state with spawn animation fields
      physicsStates.push({
        currentRadius: baseRadius * SPAWN_START_RADIUS_FACTOR, // Start near globe
        velocity: 0,
        phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: i * 137.508, // Golden angle in degrees for unique patterns
        previousTarget: baseRadius,
        spawnProgress: 0,
        spawnDelay,
        spawnStarted: false,
      });
    }

    shardsRef.current = shards;
    physicsRef.current = physicsStates;
    spawnStartTimeRef.current = -1; // Reset spawn timer to trigger new wave

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [shards, baseRadius]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Animation loop - spawn animation + spring physics + ambient motion
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    if (currentShards.length === 0 || physics.length === 0) return;

    // Cap delta to prevent physics explosion on tab switch
    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Initialize spawn start time on first frame
    if (spawnStartTimeRef.current < 0) {
      spawnStartTimeRef.current = time;
    }
    const timeSinceSpawn = time - spawnStartTimeRef.current;

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

    // Update each shard with spawn animation + spring physics + ambient motion
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];

      // --- Spawn Animation ---
      // Check if this shard should start spawning (based on staggered delay)
      if (!shardState.spawnStarted && timeSinceSpawn >= shardState.spawnDelay) {
        shardState.spawnStarted = true;
      }

      // Animate spawn progress if started but not complete
      if (shardState.spawnStarted && shardState.spawnProgress < 1) {
        shardState.spawnProgress = Math.min(
          shardState.spawnProgress + clampedDelta * SPAWN_ANIMATION_SPEED,
          1,
        );

        // Scale animation with easeOutBack for organic "pop" effect
        const scaleT = easeOutBack(shardState.spawnProgress);
        shard.mesh.scale.setScalar(scaleT);

        // Position animation: lerp from near-globe to target orbit radius
        // Uses easeOutCubic for smooth deceleration as it reaches destination
        const positionT = easeOutCubic(shardState.spawnProgress);
        const spawnRadius =
          baseRadius * SPAWN_START_RADIUS_FACTOR +
          (targetRadius - baseRadius * SPAWN_START_RADIUS_FACTOR) * positionT;
        shardState.currentRadius = spawnRadius;
        shardState.previousTarget = spawnRadius;
      }

      // Skip physics and position updates if not yet spawned
      if (!shardState.spawnStarted) {
        continue;
      }

      // --- Spring Physics (only after spawn animation complete) ---
      if (shardState.spawnProgress >= 1) {
        // Apply phase offset for wave effect
        // This creates subtle stagger in breathing motion
        const offsetBreathPhase = currentBreathPhase + shardState.phaseOffset;

        // Calculate target radius with phase offset applied
        // Map breath phase (0-1) to orbit radius range
        // breathPhase 0 = exhaled (max radius), breathPhase 1 = inhaled (min radius)
        const phaseTargetRadius =
          targetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;

        // Clamp target to prevent penetrating globe
        const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

        // Detect expansion (exhale) and apply velocity boost for immediate response
        // This overcomes spring lag so exhale feels like an immediate "release"
        const targetDelta = clampedTarget - shardState.previousTarget;
        if (targetDelta > 0.001) {
          // Expanding outward (exhale starting) - inject outward velocity
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
      }

      // --- Ambient Floating Motion (secondary layer) ---
      // Uses different frequencies per axis for organic feel
      const seed = shardState.ambientSeed;
      const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE;
      const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE;
      const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE;

      // Compute final position: spring-smoothed radius + ambient offset
      shard.mesh.position
        .copy(shard.direction)
        .multiplyScalar(shardState.currentRadius)
        .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

      // Continuous rotation (matching reference: 0.002 X, 0.003 Y)
      shard.mesh.rotation.x += 0.002;
      shard.mesh.rotation.y += 0.003;
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
