/**
 * EnergyMotes - Tiny glowing particles that drift near the orbital paths
 *
 * Features:
 * - Small luminescent particles concentrated around shard orbits
 * - Gentle drifting motion with subtle breathing sync
 * - Warm golden glow that complements the Monument Valley aesthetic
 * - InstancedMesh for performance (single draw call)
 *
 * Visual style: Firefly-like energy particles floating in proximity to shards
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

// Pre-allocated vectors for animation loop
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempScale = new THREE.Vector3();

export interface EnergyMotesProps {
  /** Number of motes @default 80 */
  count?: number;
  /** Inner radius of distribution @default 2.8 */
  innerRadius?: number;
  /** Outer radius of distribution @default 6.2 */
  outerRadius?: number;
  /** Base opacity @default 0.4 */
  opacity?: number;
  /** Mote size @default 0.025 */
  size?: number;
  /** Enable/disable @default true */
  enabled?: boolean;
}

interface MoteState {
  basePosition: THREE.Vector3;
  offset: THREE.Vector3;
  speed: number;
  phase: number;
  size: number;
}

/**
 * EnergyMotes - Renders tiny glowing particles near orbital paths
 */
export const EnergyMotes = memo(function EnergyMotesComponent({
  count = 80,
  innerRadius = 2.8,
  outerRadius = 6.2,
  opacity = 0.4,
  size = 0.025,
  enabled = true,
}: EnergyMotesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const world = useWorld();

  // Store per-mote animation state
  const moteStates = useRef<MoteState[]>([]);

  // Create geometry - small spheres
  const geometry = useMemo(() => new THREE.SphereGeometry(size, 8, 6), [size]);

  // Create glowing material
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f8e4c8',
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [opacity],
  );

  // Cleanup
  useDisposeGeometries([geometry]);
  useDisposeMaterials([material]);

  // Initialize mote positions - distributed in a shell around the globe
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    moteStates.current = [];

    for (let i = 0; i < count; i++) {
      // Distribute in shell between inner and outer radius
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      // Fibonacci sphere distribution for even spread
      const phi = Math.acos(1 - 2 * ((i + 0.5) / count));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const basePosition = new THREE.Vector3(x, y, z);

      // Random offset and animation parameters
      moteStates.current.push({
        basePosition,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
        ),
        speed: 0.3 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        size: 0.7 + Math.random() * 0.6,
      });

      // Set initial matrix
      _tempMatrix.setPosition(basePosition);
      mesh.setMatrixAt(i, _tempMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [count, innerRadius, outerRadius]);

  // Animate motes
  useFrame((state) => {
    if (!enabled) return;
    const mesh = meshRef.current;
    if (!mesh || moteStates.current.length === 0) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      const phase = breathEntity?.get(breathPhase)?.value ?? 0;
      const time = state.clock.elapsedTime;

      // Update material opacity with breathing
      material.opacity = opacity * (0.6 + phase * 0.4);

      for (let i = 0; i < count; i++) {
        const mote = moteStates.current[i];
        if (!mote) continue;

        // Gentle drifting motion
        const drift = time * mote.speed;
        _tempPosition.copy(mote.basePosition);
        _tempPosition.x += Math.sin(drift + mote.phase) * mote.offset.x;
        _tempPosition.y += Math.cos(drift * 0.7 + mote.phase) * mote.offset.y;
        _tempPosition.z += Math.sin(drift * 0.5 + mote.phase * 1.3) * mote.offset.z;

        // Breathing affects distance from center
        const breathRadius = 1.0 + phase * 0.08;
        _tempPosition.multiplyScalar(breathRadius);

        // Scale pulses with breathing
        const scale = mote.size * (0.8 + phase * 0.4);
        _tempScale.setScalar(scale);

        _tempMatrix.compose(_tempPosition, new THREE.Quaternion(), _tempScale);
        mesh.setMatrixAt(i, _tempMatrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false}>
      <sphereGeometry args={[size, 8, 6]} />
    </instancedMesh>
  );
});

export default EnergyMotes;
