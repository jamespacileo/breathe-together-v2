/**
 * ShadowPools - Soft colored shadows beneath orbiting shards
 *
 * Creates a grounding effect by rendering transparent circles below each shard.
 * Shadows are color-matched to their corresponding shards and scale with breathing.
 *
 * Features:
 * - Projected onto a virtual floor plane (y = -3)
 * - Color-matched to shard mood colors (dimmed)
 * - Scale pulses with breathing phase
 * - Uses instanced rendering for performance (1 draw call)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';

// Shadow colors (dimmed versions of mood colors)
const SHADOW_COLORS = {
  joy: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy).multiplyScalar(0.3),
  peace: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace).multiplyScalar(0.3),
  solitude: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude).multiplyScalar(0.3),
  love: new THREE.Color(MONUMENT_VALLEY_PALETTE.love).multiplyScalar(0.3),
};

const MOOD_TO_SHADOW: Record<MoodId, THREE.Color> = {
  grateful: SHADOW_COLORS.joy,
  celebrating: SHADOW_COLORS.joy,
  moment: SHADOW_COLORS.peace,
  here: SHADOW_COLORS.peace,
  anxious: SHADOW_COLORS.solitude,
  processing: SHADOW_COLORS.solitude,
  preparing: SHADOW_COLORS.love,
};

const SHADOW_COLORS_ARRAY = [
  SHADOW_COLORS.joy,
  SHADOW_COLORS.peace,
  SHADOW_COLORS.solitude,
  SHADOW_COLORS.love,
];

export interface ShadowPoolsProps {
  /** Number of shadows (should match shard count) @default 48 */
  count?: number;
  /** Users by mood for color distribution */
  users?: Partial<Record<MoodId, number>>;
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /** Floor plane Y position @default -3 */
  floorY?: number;
  /** Base shadow radius @default 0.4 */
  shadowRadius?: number;
  /** Base shadow opacity @default 0.08 */
  shadowOpacity?: number;
}

/**
 * ShadowPools - Instanced shadow circles beneath shards
 */
export function ShadowPools({
  count = 48,
  users,
  baseRadius = 4.5,
  floorY = -3,
  shadowRadius = 0.4,
  shadowOpacity = 0.08,
}: ShadowPoolsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const world = useWorld();

  // Create geometry and material
  const geometry = useMemo(() => new THREE.CircleGeometry(shadowRadius, 16), [shadowRadius]);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: shadowOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [shadowOpacity],
  );

  // Build color distribution from users prop
  const colorDistribution = useMemo(() => {
    const colors: THREE.Color[] = [];
    if (users) {
      for (const [moodId, moodCount] of Object.entries(users)) {
        const color = MOOD_TO_SHADOW[moodId as MoodId];
        if (color) {
          for (let i = 0; i < (moodCount ?? 0); i++) {
            colors.push(color);
          }
        }
      }
    }
    return colors;
  }, [users]);

  // Calculate shard directions (same as ParticleSwarm for consistency)
  const shardDirections = useMemo(() => {
    const directions: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      directions.push(new THREE.Vector3().setFromSphericalCoords(1, phi, theta));
    }
    return directions;
  }, [count]);

  // Set up instance colors
  useEffect(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      const color =
        colorDistribution[i] ??
        SHADOW_COLORS_ARRAY[Math.floor(Math.random() * SHADOW_COLORS_ARRAY.length)];
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [count, colorDistribution]);

  // Cleanup GPU resources
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Update shadow positions and scales based on breathing
  useFrame(() => {
    if (!meshRef.current) return;

    let currentRadius = baseRadius;
    let phase = 0;

    try {
      const breathEntity = world?.queryFirst?.(breathPhase, orbitRadius);
      if (breathEntity) {
        currentRadius = breathEntity.get?.(orbitRadius)?.value ?? baseRadius;
        phase = breathEntity.get?.(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Shadow scale pulses with breathing (larger on inhale)
    const shadowScale = 1.0 + phase * 0.4;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler(-Math.PI / 2, 0, 0); // Face up
    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    const scale = new THREE.Vector3(shadowScale, shadowScale, 1);

    for (let i = 0; i < count; i++) {
      const direction = shardDirections[i];

      // Project shard position to floor plane
      position.set(direction.x * currentRadius, floorY, direction.z * currentRadius);

      matrix.compose(position, quaternion, scale);
      meshRef.current.setMatrixAt(i, matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update opacity based on breathing (more visible on inhale)
    material.opacity = shadowOpacity * (0.6 + phase * 0.6);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      name="Shadow Pools"
    />
  );
}

export default ShadowPools;
