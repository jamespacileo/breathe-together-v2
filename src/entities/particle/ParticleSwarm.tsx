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
import { orbitRadius, sphereScale } from '../breath/traits';
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
 * Build color distribution array from users prop
 * Extracted to reduce cognitive complexity of shard creation
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
 * Apply per-vertex color to geometry
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
  /** Unique rotation speed multipliers for organic feel */
  rotationSpeed: THREE.Vector3;
  /** Unique rotation axis offset */
  rotationOffset: THREE.Vector3;
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

  // Create shards with per-vertex colors and unique rotation characteristics
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const colorDistribution = buildColorDistribution(users);

    // Seeded random for consistent results across renders
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

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

      // Unique rotation characteristics per shard (±30% variance)
      // Creates organic, non-mechanical feel
      const rotationSpeed = new THREE.Vector3(
        0.002 * (0.7 + seededRandom(i * 3) * 0.6), // X: 0.0014 to 0.002
        0.003 * (0.7 + seededRandom(i * 3 + 1) * 0.6), // Y: 0.0021 to 0.003
        0.001 * (0.7 + seededRandom(i * 3 + 2) * 0.6), // Z: 0.0007 to 0.001 (subtle)
      );

      // Random initial rotation offset so shards don't start aligned
      const rotationOffset = new THREE.Vector3(
        seededRandom(i * 7) * Math.PI * 2,
        seededRandom(i * 7 + 1) * Math.PI * 2,
        seededRandom(i * 7 + 2) * Math.PI * 2,
      );

      result.push({ mesh, direction, geometry, rotationSpeed, rotationOffset });
    }

    return result;
  }, [count, users, baseRadius, shardSize, material]);

  // Add meshes to group and store ref
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

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [shards]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Animation loop - update positions and rotations
  useFrame((_, delta) => {
    const currentShards = shardsRef.current;
    if (currentShards.length === 0) return;

    // Get breathing state from ECS
    let breathingRadius = baseRadius;
    let breathScale = 1;
    try {
      const breathEntity = world.queryFirst(orbitRadius, sphereScale);
      if (breathEntity) {
        breathingRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        breathScale = breathEntity.get(sphereScale)?.value ?? 1;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Clamp radius to prevent shards from penetrating globe
    const currentRadius = Math.max(breathingRadius, minOrbitRadius);

    // Normalize delta to 60fps baseline (16.67ms)
    const normalizedDelta = delta * 60;

    // Update each shard with unique rotation characteristics
    for (const shard of currentShards) {
      // Update position based on clamped breathing radius
      shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

      // Unique rotation per shard (creates organic, non-mechanical motion)
      shard.mesh.rotation.x += shard.rotationSpeed.x * normalizedDelta;
      shard.mesh.rotation.y += shard.rotationSpeed.y * normalizedDelta;
      shard.mesh.rotation.z += shard.rotationSpeed.z * normalizedDelta;

      // Subtle breath-synced wobble (±2° oscillation)
      // Uses sine wave offset by shard's unique rotation to desync wobbles
      const wobbleIntensity = 0.035; // ~2 degrees
      const wobblePhase = shard.rotationOffset.x + breathScale * Math.PI * 2;
      shard.mesh.rotation.x += Math.sin(wobblePhase) * wobbleIntensity * 0.1;
      shard.mesh.rotation.z += Math.cos(wobblePhase * 0.7) * wobbleIntensity * 0.05;
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
