/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 *
 * Animation: Spring physics with phase-aware dynamics and noise modulation
 * - Inhale: Purposeful, steady inward pull (moderate spring, low damping)
 * - Hold-in: Suspended stillness with micro-drift (stiff spring, high damping)
 * - Exhale: Gentle release, letting go (soft spring, overdamped)
 * - Hold-out: Grounded calm (moderate spring, high damping)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { orbitRadius, phaseType } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';

// Create noise generator for organic variation
const noise3D = createNoise3D();

/**
 * Phase-aware spring parameters for controlled relaxation breathing
 *
 * Each breath phase has distinct physics characteristics:
 * - spring: How quickly the shard moves toward target (stiffness)
 * - damping: How much velocity is preserved (1 = no damping, 0 = full stop)
 * - noiseScale: Amplitude of organic position variation
 */
interface SpringParams {
  spring: number;
  damping: number;
  noiseScale: number;
}

/**
 * Get spring physics parameters based on current breath phase
 *
 * Tuned for controlled relaxation breathing feel:
 * - Inhale feels purposeful and steady
 * - Hold-in feels suspended but alive
 * - Exhale feels like gentle release
 * - Hold-out feels grounded and calm
 */
function getPhaseSpringParams(phase: number): SpringParams {
  switch (phase) {
    case 0: // Inhale - purposeful, steady pull inward
      return { spring: 0.08, damping: 0.82, noiseScale: 0.06 };
    case 1: // Hold-in - suspended stillness, minimal drift
      return { spring: 0.15, damping: 0.92, noiseScale: 0.02 };
    case 2: // Exhale - gentle release, letting go
      return { spring: 0.05, damping: 0.88, noiseScale: 0.08 };
    case 3: // Hold-out - grounded calm
      return { spring: 0.12, damping: 0.9, noiseScale: 0.03 };
    default:
      return { spring: 0.08, damping: 0.85, noiseScale: 0.05 };
  }
}

/**
 * Per-shard physics state for spring simulation
 */
interface ShardPhysics {
  currentRadius: number;
  velocity: number;
  noiseOffset: number; // Unique noise phase offset per shard
}

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
 * Build color distribution array from presence data
 *
 * Converts mood counts into an array of Three.js Color instances, where each
 * user is represented by their mood color. This array is used for distributing
 * colors across particle shards.
 *
 * **Example:**
 * ```ts
 * const users = { calm: 3, energized: 2 };
 * // Returns: [calmColor, calmColor, calmColor, energizedColor, energizedColor]
 * ```
 *
 * **Performance:** Linear time O(n) where n is total user count. Called once
 * per presence update (typically ~1-5 times per minute).
 *
 * @param users - Mood distribution from presence data (e.g., { calm: 5, energized: 3 })
 * @returns Array of colors, one per user. Empty array if no users.
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

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
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
  const physicsRef = useRef<ShardPhysics[]>([]);
  const elapsedRef = useRef(0); // Track time for noise animation

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

  // Add meshes to group, store ref, and initialize physics state
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Add new shards
    for (const shard of shards) {
      group.add(shard.mesh);
    }
    shardsRef.current = shards;

    // Initialize physics state for each shard
    physicsRef.current = shards.map((_, index) => ({
      currentRadius: baseRadius,
      velocity: 0,
      // Unique noise offset per shard for organic variation
      noiseOffset: (index / shards.length) * Math.PI * 2,
    }));

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

  // Animation loop - spring physics with phase-aware dynamics and noise
  useFrame((_, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    if (currentShards.length === 0 || physics.length === 0) return;

    // Update elapsed time for noise animation
    elapsedRef.current += delta;
    const elapsed = elapsedRef.current;

    // Get breathing state from ECS
    let targetRadius = baseRadius;
    let currentPhase = 0;
    try {
      const breathEntity = world.queryFirst(orbitRadius);
      if (breathEntity) {
        targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        currentPhase = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Get phase-aware spring parameters
    const { spring, damping, noiseScale } = getPhaseSpringParams(currentPhase);

    // Clamp target radius to prevent shards from penetrating globe
    targetRadius = Math.max(targetRadius, minOrbitRadius);

    // Update each shard with spring physics
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const state = physics[i];

      // Calculate noise offset for this shard (organic variation)
      // Uses 3D noise sampled at shard's direction for spatial coherence
      const noiseValue = noise3D(
        shard.direction.x * 2 + elapsed * 0.15,
        shard.direction.y * 2 + state.noiseOffset,
        shard.direction.z * 2 + elapsed * 0.1,
      );
      const noiseOffset = noiseValue * noiseScale;

      // Target with noise modulation
      const noisyTarget = targetRadius + noiseOffset;

      // Spring physics: F = -k * (x - target)
      // Velocity integration with damping
      const displacement = noisyTarget - state.currentRadius;
      state.velocity += displacement * spring;
      state.velocity *= damping;

      // Position integration (delta-normalized for frame-rate independence)
      // Scale by 60 to normalize around 60fps baseline
      state.currentRadius += state.velocity * delta * 60;

      // Clamp to valid range (prevent shards going inside globe or too far out)
      state.currentRadius = Math.max(
        minOrbitRadius,
        Math.min(state.currentRadius, baseRadius * 1.5),
      );

      // Update mesh position
      shard.mesh.position.copy(shard.direction).multiplyScalar(state.currentRadius);

      // Continuous rotation with slight per-shard variation
      // Slower rotation during holds for stillness feel
      const rotationMultiplier = currentPhase === 1 || currentPhase === 3 ? 0.6 : 1.0;
      shard.mesh.rotation.x += 0.002 * rotationMultiplier;
      shard.mesh.rotation.y += 0.003 * rotationMultiplier;
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
