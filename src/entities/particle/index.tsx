import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../../constants';
import { usePresence } from '../../hooks/usePresence';
import { getMoodColorCounts } from '../../lib/colors';
import { generateFibonacciSphere, sphericalToCartesian } from '../../lib/fibonacciSphere';
import { Acceleration, Mass, Position, Velocity } from '../../shared/traits';
import { breathPhase } from '../breath/traits';
import { color, index, offset, ownerId, restPosition, seed, size, targetColor } from './traits';

/**
 * ParticleSpawner - Manages particle entities based on presence
 *
 * Spawns a fixed number of particles based on the provided count.
 */
export function ParticleSpawner({
  totalCount = 300,
}: {
  /**
   * Total number of particles to spawn and manage.
   *
   * @min 100
   * @max 1000
   * @step 50
   * @default 300
   */
  totalCount?: number;
} = {}) {
  const world = useWorld();
  const { moods } = usePresence();
  const finalCount = totalCount;

  // Generate base layout
  const layout = useMemo(() => generateFibonacciSphere(finalCount), [finalCount]);

  useEffect(() => {
    const entities: Entity[] = [];
    const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);

    for (let i = 0; i < finalCount; i++) {
      const p = layout[i];
      const [x, y, z] = sphericalToCartesian(p.theta, p.phi, VISUALS.PARTICLE_ORBIT_MAX);

      const entity = world.spawn(
        Position({ x, y, z }),
        Velocity({ x: 0, y: 0, z: 0 }),
        Acceleration({ x: 0, y: 0, z: 0 }),
        Mass({ value: 1 }),
        restPosition({
          x: x / VISUALS.PARTICLE_ORBIT_MAX,
          y: y / VISUALS.PARTICLE_ORBIT_MAX,
          z: z / VISUALS.PARTICLE_ORBIT_MAX,
        }),
        offset({ x: 0, y: 0, z: 0 }),
        color({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
        targetColor({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
        size({ value: p.size }),
        seed({ value: Math.random() * 1000 }),
        ownerId({ value: 'filler' }),
        index({ value: i }),
      );
      entities.push(entity);
    }

    return () => {
      entities.forEach((e) => {
        e.destroy();
      });
    };
  }, [world, layout, finalCount]);

  // Update target colors based on moods
  useEffect(() => {
    const colorCounts = getMoodColorCounts(moods);
    const particles = world.query(targetColor, ownerId);

    let particleIdx = 0;
    const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);
    const particleList = [...particles]; // Stable snapshot for this update

    // Assign user colors
    for (const [hexColor, count] of Object.entries(colorCounts)) {
      const c = new THREE.Color(hexColor);
      for (let i = 0; i < count && particleIdx < particleList.length; i++) {
        const entity = particleList[particleIdx];
        if (entity) {
          entity.set(targetColor, { r: c.r, g: c.g, b: c.b });
          entity.set(ownerId, { value: 'user' });
        }
        particleIdx++;
      }
    }

    // Assign filler colors
    while (particleIdx < particleList.length) {
      const entity = particleList[particleIdx];
      if (entity) {
        entity.set(targetColor, { r: fillerColor.r, g: fillerColor.g, b: fillerColor.b });
        entity.set(ownerId, { value: 'filler' });
      }
      particleIdx++;
    }
  }, [moods, world]);

  return null;
}

/**
 * ParticleRenderer - Renders all particle entities using dual InstancedMesh
 *
 * Uses internal defaults for user and filler appearance.
 *
 * Performance: 2 draw calls (user + filler).
 */
export function ParticleRenderer({
  totalCount = 300,
}: {
  /**
   * Total number of particles to render.
   *
   * Must match ParticleSpawner totalCount for consistency.
   *
   * @min 100
   * @max 1000
   * @step 50
   * @default 300
   */
  totalCount?: number;
} = {}) {
  const world = useWorld();
  const finalCount = totalCount;

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
    if (!userMeshRef.current || !fillerMeshRef.current) return;

    const particles = world.query(Position, color, targetColor, size, index, ownerId);
    const breath = world.queryFirst(breathPhase);
    const phase = breath?.get(breathPhase)?.value ?? 0;

    let userIdx = 0;
    let fillerIdx = 0;

    // Sync instanced meshes with entity state
    particles.forEach((entity) => {
      const pos = entity.get(Position);
      const c = entity.get(color);
      const sizeTrait = entity.get(size);
      const ownerIdTrait = entity.get(ownerId);

      if (!pos || !c || !sizeTrait || !ownerIdTrait) return;

      const s = sizeTrait.value;
      const isUser = ownerIdTrait.value === 'user';
      const baseScale = isUser ? 1.2 : 0.8;
      const pulseIntensity = isUser ? 0.6 : 0.3;

      // Calculate scale with breath pulse
      const pulse = 1.0 + phase * pulseIntensity;
      const finalScale = s * VISUALS.PARTICLE_SIZE * baseScale * pulse;

      matrix.makeScale(finalScale, finalScale, finalScale);
      matrix.setPosition(pos.x, pos.y, pos.z);

      const meshRef = isUser ? userMeshRef : fillerMeshRef;
      const instanceIdx = isUser ? userIdx++ : fillerIdx++;

      meshRef.current?.setMatrixAt(instanceIdx, matrix);

      colorObj.setRGB(c.r, c.g, c.b);
      meshRef.current?.setColorAt(instanceIdx, colorObj);
    });

    userMeshRef.current.instanceMatrix.needsUpdate = true;
    fillerMeshRef.current.instanceMatrix.needsUpdate = true;

    if (userMeshRef.current.instanceColor) {
      userMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (fillerMeshRef.current.instanceColor) {
      fillerMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={userMeshRef} args={[geometry, material, finalCount]}>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </instancedMesh>

      <instancedMesh ref={fillerMeshRef} args={[geometry, material, finalCount]}>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </instancedMesh>
    </group>
  );
}
