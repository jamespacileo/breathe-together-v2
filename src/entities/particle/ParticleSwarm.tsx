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

  const tempPos = useRef(new THREE.Vector3()).current;
  const tempQuat = useRef(new THREE.Quaternion()).current;
  const tempScale = useRef(new THREE.Vector3(1, 1, 1)).current;

  const axisX = useRef(new THREE.Vector3(1, 0, 0)).current;
  const axisY = useRef(new THREE.Vector3(0, 1, 0)).current;
  const deltaQuatX = useRef(new THREE.Quaternion()).current;
  const deltaQuatY = useRef(new THREE.Quaternion()).current;

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
    const fillerCol = new THREE.Color('#e6dcd3');
    let idx = 0;
    if (users) {
      for (const [moodId, count] of Object.entries(users)) {
        const col = new THREE.Color(getMonumentValleyMoodColor(moodId as MoodId));
        for (let i = 0; i < (count ?? 0) && idx < capacity; i++, idx++) {
          data.targetColors[idx * 3] = col.r;
          data.targetColors[idx * 3 + 1] = col.g;
          data.targetColors[idx * 3 + 2] = col.b;
        }
      }
    }
    while (idx < capacity) {
      data.targetColors[idx * 3] = fillerCol.r;
      data.targetColors[idx * 3 + 1] = fillerCol.g;
      data.targetColors[idx * 3 + 2] = fillerCol.b;
      idx++;
    }
  }, [users, data, capacity]);

  useFrame((_state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const breathEntity = world.queryFirst(orbitRadius, sphereScale);
    if (!breathEntity) return;

    const currentRadius = breathEntity.get(orbitRadius)?.value ?? 6.0;
    const currentSphereScale = breathEntity.get(sphereScale)?.value ?? 1.0;

    // Smart scaling: balance angular coverage and globe proximity
    const angularScale = (currentRadius * baseShardSize) / Math.sqrt(capacity);
    const proximityScale = Math.max(0, (currentRadius - currentSphereScale * 1.02) * 0.8);
    const dynamicScale = Math.min(angularScale, proximityScale);

    for (let i = 0; i < capacity; i++) {
      // Position
      tempPos.set(
        data.directions[i * 3] * currentRadius,
        data.directions[i * 3 + 1] * currentRadius,
        data.directions[i * 3 + 2] * currentRadius,
      );

      // Rotation
      tempQuat.set(
        data.rotations[i * 4],
        data.rotations[i * 4 + 1],
        data.rotations[i * 4 + 2],
        data.rotations[i * 4 + 3],
      );
      deltaQuatX.setFromAxisAngle(axisX, 0.002);
      deltaQuatY.setFromAxisAngle(axisY, 0.003);
      tempQuat.multiply(deltaQuatX).multiply(deltaQuatY);

      data.rotations[i * 4] = tempQuat.x;
      data.rotations[i * 4 + 1] = tempQuat.y;
      data.rotations[i * 4 + 2] = tempQuat.z;
      data.rotations[i * 4 + 3] = tempQuat.w;

      // Compose
      tempScale.set(dynamicScale, dynamicScale, dynamicScale);
      matrixRef.current.compose(tempPos, tempQuat, tempScale);
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
