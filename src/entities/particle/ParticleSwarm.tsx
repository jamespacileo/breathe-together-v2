/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses THREE.InstancedMesh for efficient rendering (single draw call).
 * Each instance has per-instance color for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 */

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
  direction: THREE.Vector3;
  rotationSpeed: THREE.Vector2;
}

// Temporary objects for matrix calculations (avoid allocations in render loop)
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3(1, 1, 1);

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
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const shardDataRef = useRef<ShardData[]>([]);
  const rotationsRef = useRef<THREE.Euler[]>([]);

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(count), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared geometry for all instances
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(shardSize, 0), [shardSize]);

  // Create material with vertexColors for instanceColor support
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        vertexColors: false, // Using instanceColor instead
      }),
    [],
  );

  // Build color distribution from users prop or random
  const colorDistribution = useMemo(() => {
    const colors: THREE.Color[] = [];
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
            colors.push(color);
          }
        }
      }
    }
    return colors;
  }, [users]);

  // Initialize shard data (directions and initial rotations)
  const shardData = useMemo(() => {
    const data: ShardData[] = [];
    const rotations: THREE.Euler[] = [];

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      // Rotation speeds (matching original: 0.002 X, 0.003 Y)
      const rotationSpeed = new THREE.Vector2(0.002, 0.003);

      // Initial rotation (point at center)
      const rotation = new THREE.Euler();

      data.push({ direction, rotationSpeed });
      rotations.push(rotation);
    }

    return { data, rotations };
  }, [count]);

  // Store refs for use in animation loop
  useEffect(() => {
    shardDataRef.current = shardData.data;
    rotationsRef.current = shardData.rotations;
  }, [shardData]);

  // Setup instanced mesh with initial transforms and colors
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    // Mark for RefractionPipeline
    mesh.userData.useRefraction = true;
    mesh.frustumCulled = false;

    // Set initial positions and colors
    for (let i = 0; i < count; i++) {
      const { direction } = shardData.data[i];

      // Initial position
      tempPosition.copy(direction).multiplyScalar(baseRadius);

      // Initial rotation (look at center)
      tempMatrix.lookAt(tempPosition, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
      tempQuaternion.setFromRotationMatrix(tempMatrix);

      // Set instance matrix
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mesh.setMatrixAt(i, tempMatrix);

      // Set instance color
      const color =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [count, shardData, colorDistribution, baseRadius]);

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - update positions and rotations
  useFrame(() => {
    const mesh = instancedMeshRef.current;
    const currentShardData = shardDataRef.current;
    const rotations = rotationsRef.current;

    if (!mesh || currentShardData.length === 0) return;

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

    // Update each instance
    for (let i = 0; i < currentShardData.length; i++) {
      const { direction, rotationSpeed } = currentShardData[i];
      const rotation = rotations[i];

      // Update position based on clamped breathing radius
      tempPosition.copy(direction).multiplyScalar(currentRadius);

      // Continuous rotation (matching reference: 0.002 X, 0.003 Y)
      rotation.x += rotationSpeed.x;
      rotation.y += rotationSpeed.y;
      tempQuaternion.setFromEuler(rotation);

      // Compose and set matrix
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mesh.setMatrixAt(i, tempMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[geometry, material, count]}
      name="Particle Swarm"
    />
  );
}

export default ParticleSwarm;
