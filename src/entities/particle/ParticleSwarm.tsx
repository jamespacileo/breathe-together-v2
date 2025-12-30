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
  /** Per-shard rotation axis for micro-rotation (normalized) */
  rotationAxis: THREE.Vector3;
  /** Per-shard rotation speed (radians per frame) */
  rotationSpeed: number;
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

  // Create shards with per-vertex colors and rotation data
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Shard creation requires multiple steps (geometry, colors, positioning, rotation data) - refactoring would reduce readability
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const currentShardSize = shardSize;

    // Build color distribution from users prop or random
    const colorDistribution: THREE.Color[] = [];
    if (users) {
      const moodToColor: Record<MoodId, THREE.Color> = {
        grateful: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
        celebrating: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
        moment: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
        here: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
        anxious: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
        processing: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
        preparing: new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
      };

      for (const [moodId, moodCount] of Object.entries(users)) {
        const color = moodToColor[moodId as MoodId];
        if (color) {
          for (let i = 0; i < (moodCount ?? 0); i++) {
            colorDistribution.push(color);
          }
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(currentShardSize, 0);

      // Set per-vertex color attribute
      const mood =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
      const vertexCount = geometry.attributes.position.count;
      const colors = new Float32Array(vertexCount * 3);
      for (let c = 0; c < colors.length; c += 3) {
        colors[c] = mood.r;
        colors[c + 1] = mood.g;
        colors[c + 2] = mood.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true; // Mark for RefractionPipeline
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      // Generate unique rotation axis and speed for micro-rotation
      // Each shard rotates on its own axis at its own speed for organic feel
      const rotationAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      // Speed range: 0.0008 to 0.004 rad/frame (very slow, subtle)
      const rotationSpeed = 0.0008 + Math.random() * 0.0032;

      result.push({ mesh, direction, geometry, rotationAxis, rotationSpeed });
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
  useFrame(() => {
    const currentShards = shardsRef.current;
    if (currentShards.length === 0) return;

    // Get breathing state from ECS
    let breathingRadius = baseRadius;
    try {
      const breathEntity = world.queryFirst(orbitRadius, sphereScale);
      if (breathEntity) {
        breathingRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Clamp radius to prevent shards from penetrating globe
    const currentRadius = Math.max(breathingRadius, minOrbitRadius);

    // Update each shard
    for (const shard of currentShards) {
      // Update position based on clamped breathing radius
      shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

      // MICRO-ROTATION: Each shard rotates on its own unique axis
      // Creates organic, non-uniform motion that feels alive
      shard.mesh.rotateOnAxis(shard.rotationAxis, shard.rotationSpeed);
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
