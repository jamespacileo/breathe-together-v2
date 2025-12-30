/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Refactored to Three Shader Language (TSL).
 * - Radial breathing synced with orbitRadius trait.
 * - Dynamic scaling to prevent peer-overlap and globe-penetration.
 * - Custom illustrative glass refraction material.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { getMonumentValleyMoodColor } from '../../lib/colors';
import { orbitRadius, sphereScale } from '../breath/traits';
import { FrostedGlassMaterial } from './FrostedGlassMaterial';

export interface ParticleSwarmProps {
  capacity?: number;
  users?: Partial<Record<MoodId, number>>;
  baseShardSize?: number;
}

export function ParticleSwarm({ capacity = 300, users, baseShardSize = 1.2 }: ParticleSwarmProps) {
  const world = useWorld();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matrixRef = useRef(new THREE.Matrix4());
  const colorRef = useRef(new THREE.Color());
  const reusableColorRef = useRef(new THREE.Color());

  // Refs without extracting .current - prevents 60fps allocations
  const tempPosRef = useRef(new THREE.Vector3());
  const tempQuatRef = useRef(new THREE.Quaternion());
  const tempScaleRef = useRef(new THREE.Vector3(1, 1, 1));

  const axisXRef = useRef(new THREE.Vector3(1, 0, 0));
  const axisYRef = useRef(new THREE.Vector3(0, 1, 0));
  const deltaQuatXRef = useRef(new THREE.Quaternion());
  const deltaQuatYRef = useRef(new THREE.Quaternion());

  const data = useMemo(() => {
    const directions = new Float32Array(capacity * 3);
    const rotations = new Float32Array(capacity * 4);
    const colors = new Float32Array(capacity * 3);
    const targetColors = new Float32Array(capacity * 3);
    const fillerCol = new THREE.Color('#e6dcd3');

    for (let i = 0; i < capacity; i++) {
      const phi = Math.acos(-1 + (2 * i) / capacity);
      const theta = Math.sqrt(capacity * Math.PI) * phi;
      const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      directions[i * 3] = dir.x;
      directions[i * 3 + 1] = dir.y;
      directions[i * 3 + 2] = dir.z;

      rotations[i * 4 + 3] = 1; // Identity w

      colors[i * 3] = fillerCol.r;
      colors[i * 3 + 1] = fillerCol.g;
      colors[i * 3 + 2] = fillerCol.b;
      targetColors[i * 3] = fillerCol.r;
      targetColors[i * 3 + 1] = fillerCol.g;
      targetColors[i * 3 + 2] = fillerCol.b;
    }
    return { directions, rotations, colors, targetColors };
  }, [capacity]);

  useEffect(() => {
    reusableColorRef.current.set('#e6dcd3');
    let idx = 0;
    if (users) {
      for (const [moodId, count] of Object.entries(users)) {
        reusableColorRef.current.set(getMonumentValleyMoodColor(moodId as MoodId));
        for (let i = 0; i < (count ?? 0) && idx < capacity; i++, idx++) {
          data.targetColors[idx * 3] = reusableColorRef.current.r;
          data.targetColors[idx * 3 + 1] = reusableColorRef.current.g;
          data.targetColors[idx * 3 + 2] = reusableColorRef.current.b;
        }
      }
    }
    while (idx < capacity) {
      reusableColorRef.current.set('#e6dcd3');
      data.targetColors[idx * 3] = reusableColorRef.current.r;
      data.targetColors[idx * 3 + 1] = reusableColorRef.current.g;
      data.targetColors[idx * 3 + 2] = reusableColorRef.current.b;
      idx++;
    }
  }, [users, data, capacity]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 300-particle transformation + color interpolation + trait validation (dev-only) requires multiple operations
  useFrame((_state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const breathEntity = world.queryFirst(orbitRadius, sphereScale);
    if (!breathEntity) return;

    if (import.meta.env.DEV) {
      if (!breathEntity.has?.(orbitRadius)) {
        console.warn('[ParticleSwarm] orbitRadius trait missing - entity may be corrupt');
      }
      if (!breathEntity.has?.(sphereScale)) {
        console.warn('[ParticleSwarm] sphereScale trait missing - entity may be corrupt');
      }
    }

    const currentRadius = breathEntity.get(orbitRadius)?.value ?? 6.0;
    const currentSphereScale = breathEntity.get(sphereScale)?.value ?? 1.0;

    // Smart scaling: balance angular coverage and globe proximity
    const angularScale = (currentRadius * baseShardSize) / Math.sqrt(capacity);
    const proximityScale = Math.max(0, (currentRadius - currentSphereScale * 1.02) * 0.8);
    const dynamicScale = Math.min(angularScale, proximityScale);

    for (let i = 0; i < capacity; i++) {
      // Position
      tempPosRef.current.set(
        data.directions[i * 3] * currentRadius,
        data.directions[i * 3 + 1] * currentRadius,
        data.directions[i * 3 + 2] * currentRadius,
      );

      // Rotation
      tempQuatRef.current.set(
        data.rotations[i * 4],
        data.rotations[i * 4 + 1],
        data.rotations[i * 4 + 2],
        data.rotations[i * 4 + 3],
      );
      deltaQuatXRef.current.setFromAxisAngle(axisXRef.current, 0.002);
      deltaQuatYRef.current.setFromAxisAngle(axisYRef.current, 0.003);
      tempQuatRef.current.multiply(deltaQuatXRef.current).multiply(deltaQuatYRef.current);

      data.rotations[i * 4] = tempQuatRef.current.x;
      data.rotations[i * 4 + 1] = tempQuatRef.current.y;
      data.rotations[i * 4 + 2] = tempQuatRef.current.z;
      data.rotations[i * 4 + 3] = tempQuatRef.current.w;

      // Compose
      tempScaleRef.current.set(dynamicScale, dynamicScale, dynamicScale);
      matrixRef.current.compose(tempPosRef.current, tempQuatRef.current, tempScaleRef.current);
      mesh.setMatrixAt(i, matrixRef.current);

      // Color
      for (let j = 0; j < 3; j++) {
        data.colors[i * 3 + j] += (data.targetColors[i * 3 + j] - data.colors[i * 3 + j]) * 0.1;
      }
      colorRef.current.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]);
      mesh.setColorAt(i, colorRef.current);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  // GPU memory cleanup: dispose geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <group name="Particle Swarm">
      <instancedMesh
        ref={meshRef}
        name="Particle Swarm Mesh"
        args={[geometry, undefined, capacity]}
        frustumCulled={false}
      >
        <FrostedGlassMaterial />
      </instancedMesh>
    </group>
  );
}

export default ParticleSwarm;
