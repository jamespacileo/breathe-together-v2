/**
 * ParticleSwarm - Monument Valley inspired gem-like icosahedral shards
 *
 * Uses Drei's MeshRefractionMaterial for beautiful pastel gem refraction.
 * Each shard refracts the environment through a colored glass effect.
 */

import { CubeCamera, MeshRefractionMaterial } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib';
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
  /** Index of refraction for gem effect @default 2.4 */
  ior?: number;
  /** Color aberration strength @default 0.02 */
  aberrationStrength?: number;
  /** Number of refraction bounces @default 3 */
  bounces?: number;
  /** Fresnel intensity (edge glow) @default 0.5 */
  fresnel?: number;
}

interface ShardData {
  id: string;
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
  color: THREE.Color;
}

export function ParticleSwarm({
  count = 48,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  ior = 2.4,
  aberrationStrength = 0.02,
  bounces = 3,
  fresnel = 0.5,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);

  // Load HDRI environment for refraction
  const texture = useLoader(
    RGBELoader,
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/aerodynamics_workshop_1k.hdr',
  );

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(count), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shards with individual colors
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const colorDistribution = buildColorDistribution(users);

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Get mood color for this shard (MeshRefractionMaterial uses color prop, not vertex colors)
      const mood =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry);
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      // Create stable unique ID from Fibonacci sphere position
      const id = `shard-${phi.toFixed(6)}-${theta.toFixed(6)}`;

      result.push({ id, mesh, direction, geometry, color: mood });
    }

    return result;
  }, [count, users, baseRadius, shardSize]);

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
      // Silently catch ECS errors during unmount/remount in Triplex
    }

    // Clamp radius to prevent shards from penetrating globe
    const currentRadius = Math.max(breathingRadius, minOrbitRadius);

    // Update each shard
    for (const shard of currentShards) {
      // Update position based on clamped breathing radius
      shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

      // Continuous rotation (matching reference: 0.002 X, 0.003 Y)
      shard.mesh.rotation.x += 0.002;
      shard.mesh.rotation.y += 0.003;
    }
  });

  return (
    <CubeCamera resolution={256} frames={1} envMap={texture}>
      {(envTexture) => (
        <group ref={groupRef} name="Particle Swarm">
          {shards.map((shard) => (
            <primitive key={shard.id} object={shard.mesh}>
              <MeshRefractionMaterial
                envMap={envTexture}
                color={shard.color}
                ior={ior}
                aberrationStrength={aberrationStrength}
                bounces={bounces}
                fresnel={fresnel}
                toneMapped={false}
              />
            </primitive>
          ))}
        </group>
      )}
    </CubeCamera>
  );
}

export default ParticleSwarm;
