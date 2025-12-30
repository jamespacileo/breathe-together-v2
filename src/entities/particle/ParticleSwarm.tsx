/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered with MeshTransmissionMaterial for gem-like pastel aesthetic.
 */

import { MeshTransmissionMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { orbitRadius, sphereScale } from '../breath/traits';

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
  geometry: THREE.IcosahedronGeometry;
  direction: THREE.Vector3;
  color: THREE.Color;
  initialPosition: THREE.Vector3;
  meshRef: React.RefObject<THREE.Mesh>;
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

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(count), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shard data (geometries, positions, colors)
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const colorDistribution = buildColorDistribution(users);

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Apply per-vertex color from distribution or random fallback
      const color =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
      applyVertexColors(geometry, color);

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      const initialPosition = direction.clone().multiplyScalar(baseRadius);

      result.push({
        geometry,
        direction,
        color,
        initialPosition,
        // biome-ignore lint/suspicious/noExplicitAny: React.createRef() type inference issue
        meshRef: { current: null } as any,
      });
    }

    return result;
  }, [count, users, baseRadius, shardSize]);

  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
      }
    };
  }, [shards]);

  // Animation loop - update positions and rotations
  useFrame(() => {
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
    for (const shard of shards) {
      const mesh = shard.meshRef.current;
      if (!mesh) continue;

      // Update position based on clamped breathing radius
      mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

      // Continuous rotation (matching reference: 0.002 X, 0.003 Y)
      mesh.rotation.x += 0.002;
      mesh.rotation.y += 0.003;
    }
  });

  return (
    <group ref={groupRef} name="Particle Swarm">
      {shards.map((shard, index) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: Shards are static and never reordered
          key={index}
          ref={shard.meshRef}
          geometry={shard.geometry}
          position={shard.initialPosition}
          frustumCulled={false}
          onUpdate={(mesh) => {
            mesh.lookAt(0, 0, 0);
          }}
        >
          <MeshTransmissionMaterial
            transmissionSampler
            transmission={1.0}
            thickness={0.3}
            roughness={0.15}
            chromaticAberration={0.06}
            anisotropicBlur={0.05}
            samples={4}
            resolution={256}
            color={shard.color}
            vertexColors
          />
        </mesh>
      ))}
    </group>
  );
}

export default ParticleSwarm;
