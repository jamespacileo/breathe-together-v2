/**
 * BreathWaves - Horizontal wave bands that ripple with breathing
 *
 * Creates a visual rhythm around the globe through horizontal torus rings
 * that expand/contract and change opacity with the breathing cycle.
 *
 * Features:
 * - 3 horizontal bands at different heights
 * - Phase-based color (teal for inhale, gold for exhale)
 * - Scale animation synchronized to breath phase
 * - Subtle rotation for organic movement
 *
 * Uses simple MeshBasicMaterial for reliable rendering.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType } from '../breath/traits';
import { HOLO_COLORS } from './materials';

/**
 * Wave band configuration with stable IDs for React keys
 */
const WAVE_CONFIG = [
  { id: 'wave-upper', height: 0.5, baseRadius: 1.85, tube: 0.012, phaseOffset: 0 },
  { id: 'wave-center', height: 0, baseRadius: 2.0, tube: 0.015, phaseOffset: 0.33 },
  { id: 'wave-lower', height: -0.5, baseRadius: 1.85, tube: 0.012, phaseOffset: 0.66 },
];

interface BreathWavesProps {
  /** Enable wave animation @default true */
  enabled?: boolean;
  /** Base opacity @default 0.25 */
  baseOpacity?: number;
  /** Scale range for breathing animation @default 0.15 */
  breathScale?: number;
  /** Enable rotation animation @default true */
  enableRotation?: boolean;
  /** Debug mode - force specific phase @default -1 */
  debugPhase?: number;
  /** Debug mode - force specific breath value @default -1 */
  debugBreathPhase?: number;
}

/**
 * BreathWaves - Animated horizontal wave bands
 */
export function BreathWaves({
  enabled = true,
  baseOpacity = 0.3,
  breathScale = 0.1,
  enableRotation = true,
  debugPhase = -1,
  debugBreathPhase = -1,
}: BreathWavesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const world = useWorld();

  // Pre-calculate colors
  const inhaleColor = useMemo(() => new THREE.Color(HOLO_COLORS.INHALE), []);
  const exhaleColor = useMemo(() => new THREE.Color(HOLO_COLORS.EXHALE), []);

  // Create geometries and materials
  const { geometries, materials } = useMemo(() => {
    const geos = WAVE_CONFIG.map(
      ({ baseRadius, tube }) => new THREE.TorusGeometry(baseRadius, tube, 16, 64),
    );

    const mats = WAVE_CONFIG.map(
      () =>
        new THREE.MeshBasicMaterial({
          color: HOLO_COLORS.INHALE,
          transparent: true,
          opacity: baseOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
    );

    return { geometries: geos, materials: mats };
  }, [baseOpacity]);

  // Cleanup on unmount
  useDisposeGeometries(geometries);
  useDisposeMaterials(materials);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current || !enabled) return;

    // Slow rotation for organic movement
    if (enableRotation) {
      groupRef.current.rotation.y += 0.0003;
    }

    // Get breath state
    let currentPhase = 0;
    let currentBreathPhase = 0;

    if (debugPhase >= 0) {
      currentPhase = debugPhase;
      currentBreathPhase = debugBreathPhase >= 0 ? debugBreathPhase : 0.5;
    } else {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          currentPhase = breathEntity.get(phaseType)?.value ?? 0;
          currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
        }
      } catch {
        // Ignore ECS errors during unmount
      }
    }

    // Update each wave band
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;

      const config = WAVE_CONFIG[index];
      const material = materials[index];

      // Breathing scale animation (different phase offset per band)
      const offsetBreath = (currentBreathPhase + config.phaseOffset) % 1;
      const breathValue = Math.sin(offsetBreath * Math.PI);
      const scale = 1 + breathValue * breathScale;
      mesh.scale.set(scale, scale, scale);

      // Color based on phase: inhale = teal, exhale = gold
      const isInhaling = currentPhase === 0;
      const isExhaling = currentPhase === 2;

      if (isInhaling) {
        material.color.copy(inhaleColor);
      } else if (isExhaling) {
        material.color.copy(exhaleColor);
      } else {
        // Hold phase - blend between colors
        material.color.copy(inhaleColor).lerp(exhaleColor, 0.5);
      }

      // Opacity breathing
      material.opacity = baseOpacity + breathValue * 0.15;

      // Subtle vertical wave motion
      mesh.position.z =
        config.height + Math.sin(state.clock.elapsedTime + config.phaseOffset * Math.PI * 2) * 0.02;
    });
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef} name="BreathWaves" rotation={[Math.PI / 2, 0, 0]}>
      {WAVE_CONFIG.map((config, index) => (
        <mesh
          key={config.id}
          ref={(el) => {
            meshRefs.current[index] = el;
          }}
          geometry={geometries[index]}
          material={materials[index]}
          position={[0, 0, config.height]}
        />
      ))}
    </group>
  );
}

export default BreathWaves;
