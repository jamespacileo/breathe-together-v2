/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards with 3D glass effect
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each icosahedron shard uses MeshTransmissionMaterial for realistic glass appearance
 * with refraction, chromatic aberration, and transparency.
 *
 * Based on tutorial: https://blog.olivierlarose.com/tutorials/3d-glass-effect
 */

import { MeshTransmissionMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
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

  // Glass Material Properties
  /**
   * Glass thickness - controls the depth of the glass material.
   * @min 0 @max 3 @step 0.05
   * @default 0.2
   */
  glassThickness?: number;

  /**
   * Surface roughness - controls how matte or polished the glass appears.
   * @min 0 @max 1 @step 0.1
   * @default 0
   */
  glassRoughness?: number;

  /**
   * Transmission (transparency) - controls how much light passes through.
   * @min 0 @max 1 @step 0.1
   * @default 1
   */
  glassTransmission?: number;

  /**
   * Index of Refraction (IOR) - controls how much light bends through the glass.
   * @min 0 @max 3 @step 0.1
   * @default 1.2
   */
  glassIor?: number;

  /**
   * Chromatic Aberration - color separation effect from light refraction.
   * @min 0 @max 1 @step 0.01
   * @default 0.02
   */
  glassChromaticAberration?: number;

  /**
   * Backside rendering - enables rendering of back faces for hollow objects.
   * @default true
   */
  glassBackside?: boolean;
}

export function ParticleSwarm({
  count = 48,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  glassThickness = 0.2,
  glassRoughness = 0,
  glassTransmission = 1,
  glassIor = 1.2,
  glassChromaticAberration = 0.02,
  glassBackside = true,
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

  // Create shard data (positions and directions)
  const shardData = useMemo(() => {
    const result: { position: THREE.Vector3; direction: THREE.Vector3; color: THREE.Color }[] = [];
    const colorDistribution = buildColorDistribution(users);

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      const position = direction.clone().multiplyScalar(baseRadius);

      // Select mood color from distribution or random fallback
      const color =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];

      result.push({ position, direction, color });
    }

    return result;
  }, [count, users, baseRadius]);

  // Animation loop - update positions and rotations
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

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

    // Update each shard mesh
    group.children.forEach((child, i) => {
      const shard = shardData[i];
      if (shard && child instanceof THREE.Mesh) {
        // Update position based on clamped breathing radius
        child.position.copy(shard.direction).multiplyScalar(currentRadius);

        // Continuous rotation (matching reference: 0.002 X, 0.003 Y)
        child.rotation.x += 0.002;
        child.rotation.y += 0.003;
      }
    });
  });

  return (
    <group ref={groupRef} name="Particle Swarm">
      {shardData.map((shard) => {
        // Stable key based on position (won't change during runtime)
        const key = `shard-${shard.position.x.toFixed(3)}-${shard.position.y.toFixed(3)}-${shard.position.z.toFixed(3)}`;
        return (
          <mesh
            key={key}
            position={shard.position}
            onUpdate={(mesh) => mesh.lookAt(0, 0, 0)}
            frustumCulled={false}
          >
            <icosahedronGeometry args={[shardSize, 0]} />
            <MeshTransmissionMaterial
              thickness={glassThickness}
              roughness={glassRoughness}
              transmission={glassTransmission}
              ior={glassIor}
              chromaticAberration={glassChromaticAberration}
              backside={glassBackside}
              color={shard.color}
              // Performance optimizations
              samples={6}
              resolution={512}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default ParticleSwarm;
