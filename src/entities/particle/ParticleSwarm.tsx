/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Simplified approach (Dec 2024):
 * - Pre-allocates a fixed pool of meshes (no recreation on count change)
 * - Calculates Fibonacci positions dynamically each frame
 * - Gentle opacity fade for enter/exit (no scale animation)
 * - Positions naturally redistribute as count changes
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import type { ShardAnimationState } from '../../hooks/useMoodArray';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';

/** Maximum shards we'll ever show - pre-allocated once */
const MAX_CAPACITY = 150;

// Mood colors
const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  gratitude: new THREE.Color(MONUMENT_VALLEY_PALETTE.gratitude),
  presence: new THREE.Color(MONUMENT_VALLEY_PALETTE.presence),
  release: new THREE.Color(MONUMENT_VALLEY_PALETTE.release),
  connection: new THREE.Color(MONUMENT_VALLEY_PALETTE.connection),
};

function applyVertexColors(geometry: THREE.IcosahedronGeometry, color: THREE.Color): void {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export interface ParticleSwarmProps {
  /** Ignored - count comes from shardStates.length */
  count?: number;
  /** Dynamic shard states from useMoodArray */
  shardStates?: ShardAnimationState[];
  /** Callback to tick animations each frame */
  onTickAnimations?: (elapsedTime: number) => void;
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /** Shard size @default 0.35 */
  shardSize?: number;
  /** Globe radius @default 1.5 */
  globeRadius?: number;
  /** Buffer from globe @default 0.3 */
  buffer?: number;
  /** Max shard size @default 0.6 */
  maxShardSize?: number;
}

interface PooledShard {
  mesh: THREE.Mesh;
  geometry: THREE.IcosahedronGeometry;
}

/**
 * Physics state for organic breathing
 */
interface ShardPhysics {
  currentRadius: number;
  velocity: number;
  ambientSeed: number;
  rotSpeedX: number;
  rotSpeedY: number;
}

// Spring constants for smooth breathing
const SPRING_K = 6;
const SPRING_D = 4.5;
const AMBIENT_SCALE = 0.06;

export function ParticleSwarm({
  shardStates,
  onTickAnimations,
  baseRadius = 4.5,
  shardSize = 0.35,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
}: ParticleSwarmProps) {
  // Use maxShardSize to cap shardSize
  const effectiveShardSize = Math.min(shardSize, maxShardSize);
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);

  // Pre-allocate mesh pool ONCE
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  const pool = useMemo(() => {
    const shards: PooledShard[] = [];
    const defaultColor = new THREE.Color('#888888');

    for (let i = 0; i < MAX_CAPACITY; i++) {
      const geometry = new THREE.IcosahedronGeometry(effectiveShardSize, 0);
      applyVertexColors(geometry, defaultColor);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true;
      mesh.frustumCulled = false;
      mesh.visible = false;

      shards.push({ mesh, geometry });
    }

    return shards;
  }, [effectiveShardSize, material]);

  // Physics state for each pooled shard
  const physicsRef = useRef<ShardPhysics[]>([]);

  // Initialize physics and add meshes to group
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear and add all pooled meshes
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const physics: ShardPhysics[] = [];
    for (let i = 0; i < pool.length; i++) {
      group.add(pool[i].mesh);

      const seed = i * 137.508;
      physics.push({
        currentRadius: baseRadius,
        velocity: 0,
        ambientSeed: seed,
        rotSpeedX: 0.7 + ((i * 1.618) % 1) * 0.6,
        rotSpeedY: 0.7 + ((i * 2.236) % 1) * 0.6,
      });
    }
    physicsRef.current = physics;

    return () => {
      for (const shard of pool) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [pool, baseRadius]);

  // Cleanup material
  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  // Animation loop
  useFrame((state, delta) => {
    const physics = physicsRef.current;
    if (pool.length === 0 || physics.length === 0) return;

    const dt = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Tick opacity animations
    onTickAnimations?.(time);

    // Get breathing state
    let targetRadius = baseRadius;
    let phase = 0;
    try {
      const breathEntity = world.queryFirst(orbitRadius);
      if (breathEntity) {
        targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        phase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // ECS errors during unmount
    }

    // Update shader uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = phase;
      material.uniforms.time.value = time;
    }

    const minRadius = globeRadius + effectiveShardSize + buffer;
    const visibleCount = shardStates?.length ?? 0;

    // Update each shard
    for (let i = 0; i < pool.length; i++) {
      const { mesh, geometry } = pool[i];
      const phys = physics[i];
      const shardState = shardStates?.[i];

      // Show/hide based on whether we have state for this index
      if (!shardState || i >= visibleCount) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;

      // Update color from mood
      const color = MOOD_TO_COLOR[shardState.mood];
      if (color) {
        applyVertexColors(geometry, color);
      }

      // Apply opacity via material (use userData to pass to shader or scale for simple approach)
      // For simplicity, we'll scale down slightly when fading
      const opacity = shardState.opacity;

      // Calculate Fibonacci position for THIS shard based on VISIBLE count
      // This naturally redistributes positions as count changes
      const activeIndex = i;
      const activeCount = Math.max(1, visibleCount);
      const phi = Math.acos(-1 + (2 * activeIndex + 1) / activeCount);
      const theta = Math.sqrt(activeCount * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      // Spring physics for smooth radius changes
      const clampedTarget = Math.max(targetRadius, minRadius);
      const springForce = (clampedTarget - phys.currentRadius) * SPRING_K;
      const dampForce = -phys.velocity * SPRING_D;
      phys.velocity += (springForce + dampForce) * dt;
      phys.currentRadius += phys.velocity * dt;

      // Ambient floating motion
      const seed = phys.ambientSeed;
      const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE;
      const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_SCALE * 0.6;
      const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE;

      // Position
      mesh.position
        .copy(direction)
        .multiplyScalar(phys.currentRadius)
        .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

      // Rotation
      mesh.rotation.x += 0.002 * phys.rotSpeedX;
      mesh.rotation.y += 0.003 * phys.rotSpeedY;

      // Scale with opacity for gentle fade (0.3 to 1.0 range to keep visible during fade)
      const fadeScale = 0.3 + opacity * 0.7;
      const breathScale = 1.0 + phase * 0.03;
      mesh.scale.setScalar(fadeScale * breathScale);
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
