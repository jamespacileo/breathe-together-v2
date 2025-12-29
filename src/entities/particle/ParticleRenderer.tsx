import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Position } from '../../shared/traits';
import { breathPhase } from '../breath/traits';
import { color, ownerId, ParticleSwarmTrait, parentSwarm, size } from './traits';

export interface ParticleRendererProps {
  /**
   * Maximum number of particles that can be rendered.
   * @group "Performance"
   * @min 100 @max 2000 @step 100
   */
  maxCapacity?: number;
}

/**
 * Helper to update a single particle instance in the mesh
 */
function updateInstance(
  entity: Entity,
  phase: number,
  matrix: THREE.Matrix4,
  colorObj: THREE.Color,
  indices: { user: number; filler: number },
  userMesh: THREE.InstancedMesh | null,
  fillerMesh: THREE.InstancedMesh | null,
  maxCapacity: number,
  world: any, // Pass world to check if swarm is alive
) {
  if (!world.has(entity)) return;

  try {
    const pos = entity.get(Position);
    const c = entity.get(color);
    const sizeTrait = entity.get(size);
    const ownerIdTrait = entity.get(ownerId);
    const parent = entity.get(parentSwarm);

    if (!pos || !c || !sizeTrait || !ownerIdTrait) return;

    const isUser = ownerIdTrait.value === 'user';
    const swarmEntity = parent?.value;
    const swarmConfig =
      swarmEntity && world.has(swarmEntity) ? swarmEntity.get(ParticleSwarmTrait) : null;

    const minScale = swarmConfig?.minScale ?? 0.05;
    const maxScale = swarmConfig?.maxScale ?? 0.1;

    const pulse = 1.0 + phase * (isUser ? 0.6 : 0.3);
    const swarmScale = minScale + (maxScale - minScale) * phase;
    const finalScale = sizeTrait.value * swarmScale * (isUser ? 1.2 : 0.8) * pulse * 10;

    matrix.makeScale(finalScale, finalScale, finalScale);
    matrix.setPosition(pos.x, pos.y, pos.z);

    const mesh = isUser ? userMesh : fillerMesh;
    const idx = isUser ? indices.user++ : indices.filler++;

    if (idx < maxCapacity && mesh) {
      mesh.setMatrixAt(idx, matrix);
      colorObj.setRGB(c.r, c.g, c.b);
      mesh.setColorAt(idx, colorObj);
    }
  } catch (_e) {
    // Entity might have been destroyed during the frame
  }
}

/**
 * ParticleRenderer - Renders all particle entities using dual InstancedMesh
 */
export function ParticleRenderer({ maxCapacity = 1000 }: ParticleRendererProps = {}) {
  const world = useWorld();

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const userMeshRef = useRef<THREE.InstancedMesh>(null);
  const fillerMeshRef = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((_, _delta) => {
    try {
      if (!userMeshRef.current || !fillerMeshRef.current) return;

      const particles = world.query(Position, color, size, ownerId, parentSwarm);
      const breath = world.queryFirst(breathPhase);
      const phase = breath?.get(breathPhase)?.value ?? 0;

      const indices = { user: 0, filler: 0 };

      particles.forEach((entity) => {
        updateInstance(
          entity,
          phase,
          matrix,
          colorObj,
          indices,
          userMeshRef.current,
          fillerMeshRef.current,
          maxCapacity,
          world,
        );
      });

      userMeshRef.current.count = indices.user;
      fillerMeshRef.current.count = indices.filler;

      userMeshRef.current.instanceMatrix.needsUpdate = true;
      fillerMeshRef.current.instanceMatrix.needsUpdate = true;

      if (userMeshRef.current.instanceColor) userMeshRef.current.instanceColor.needsUpdate = true;
      if (fillerMeshRef.current.instanceColor)
        fillerMeshRef.current.instanceColor.needsUpdate = true;
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }
  });

  return (
    <group name="Particle System Group">
      <instancedMesh
        name="User Particles"
        ref={userMeshRef}
        args={[geometry, material, maxCapacity]}
      />
      <instancedMesh
        name="Filler Particles"
        ref={fillerMeshRef}
        args={[geometry, material, maxCapacity]}
      />
    </group>
  );
}
