/**
 * ExpansionRings - Concentric circles emanating from globe center
 *
 * Creates ripple-like rings that expand outward during exhale
 * and contract during inhale, visualizing the wave-like nature
 * of breath traveling through the body.
 *
 * Features:
 * - Multiple rings at different radii
 * - Rings pulse/expand with breath phases
 * - Opacity follows breath rhythm
 * - Subtle rotation for organic feel
 * - Monument Valley warm color palette
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

export interface ExpansionRingsProps {
  /** Number of concentric rings @default 5 */
  ringCount?: number;
  /** Segments per ring (smoothness) @default 64 */
  segments?: number;
  /** Minimum radius (contracted state) @default 1.8 */
  minRadius?: number;
  /** Maximum radius (expanded state) @default 5.0 */
  maxRadius?: number;
  /** Base opacity @default 0.35 */
  opacity?: number;
  /** Primary ring color @default '#f8d4b8' */
  primaryColor?: string;
  /** Secondary ring color (alternating) @default '#b8e8d4' */
  secondaryColor?: string;
  /** Ring rotation speed @default 0.05 */
  rotationSpeed?: number;
  /** Enable component @default true */
  enabled?: boolean;
}

/**
 * Per-ring state for animation
 */
interface RingState {
  /** Ring's base radius offset (0-1 within the ring stack) */
  normalizedPosition: number;
  /** Random phase offset for wave effect */
  phaseOffset: number;
  /** Current rotation angle */
  rotation: number;
  /** Rotation direction multiplier */
  rotationDir: number;
  /** Y-axis tilt for 3D effect */
  tiltX: number;
  tiltZ: number;
}

export const ExpansionRings = memo(function ExpansionRings({
  ringCount = 5,
  segments = 64,
  minRadius = 1.8,
  maxRadius = 5.0,
  opacity = 0.35,
  primaryColor = '#f8d4b8',
  secondaryColor = '#b8e8d4',
  rotationSpeed = 0.05,
  enabled = true,
}: ExpansionRingsProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);

  // Initialize ring states
  const ringStates = useMemo(() => {
    const states: RingState[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < ringCount; i++) {
      const normalizedPos = i / (ringCount - 1);
      states.push({
        normalizedPosition: normalizedPos,
        phaseOffset: (i * goldenRatio) % 1,
        rotation: 0,
        rotationDir: i % 2 === 0 ? 1 : -1,
        // Subtle tilt for each ring (±15 degrees max)
        tiltX: (Math.random() - 0.5) * 0.25,
        tiltZ: (Math.random() - 0.5) * 0.25,
      });
    }
    return states;
  }, [ringCount]);

  // Parse colors
  const primaryColorObj = useMemo(() => new THREE.Color(primaryColor), [primaryColor]);
  const secondaryColorObj = useMemo(() => new THREE.Color(secondaryColor), [secondaryColor]);

  // Create ring Line objects (geometry + material combined)
  const ringLines = useMemo(() => {
    const lines: THREE.Line[] = [];

    for (let i = 0; i < ringCount; i++) {
      // Create circle geometry
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);

      // Alternate colors
      const color = i % 2 === 0 ? primaryColorObj : secondaryColorObj;
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        linewidth: 1,
        depthWrite: false,
      });

      const line = new THREE.Line(geo, mat);
      lines.push(line);
    }

    return lines;
  }, [ringCount, segments, primaryColorObj, secondaryColorObj]);

  // Cleanup
  useEffect(() => {
    return () => {
      for (const line of ringLines) {
        line.geometry.dispose();
        (line.material as THREE.LineBasicMaterial).dispose();
      }
    };
  }, [ringLines]);

  // Animation
  useFrame((_state, delta) => {
    if (!enabled || !groupRef.current) return;

    const clampedDelta = Math.min(delta, 0.1);

    // Get breath state from ECS
    let currentBreathPhase = 0.5;
    let currentPhaseType = 0;
    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (breathEntity) {
      try {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      } catch (_e) {
        // Silently catch ECS errors during unmount/remount
      }
    }

    // Rings are most visible during active phases (inhale/exhale)
    const isHold = currentPhaseType === 1 || currentPhaseType === 3;
    const phaseVisibility = isHold ? 0.3 : 1.0;

    // Update each ring
    for (let i = 0; i < ringCount; i++) {
      const ring = ringLines[i];
      const ringState = ringStates[i];

      if (!ring) continue;

      const material = ring.material as THREE.LineBasicMaterial;

      // Update rotation
      ringState.rotation += rotationSpeed * ringState.rotationDir * clampedDelta;

      // Calculate radius based on breath phase
      // Rings expand outward during exhale (phase 0), contract during inhale (phase 1)
      // Each ring has a phase offset for wave effect
      const radiusRange = maxRadius - minRadius;
      const baseRadius = minRadius + ringState.normalizedPosition * radiusRange * 0.5;

      // Breath modulation: rings expand as breath phase decreases (exhale)
      // and contract as breath phase increases (inhale)
      const breathExpansion = (1 - currentBreathPhase) * radiusRange * 0.5;

      // Wave offset: each ring is slightly delayed
      const waveOffset = ringState.phaseOffset * 0.3 * radiusRange;

      const finalRadius = baseRadius + breathExpansion + waveOffset;

      // Apply transforms
      ring.scale.setScalar(finalRadius);
      ring.rotation.y = ringState.rotation;
      ring.rotation.x = ringState.tiltX;
      ring.rotation.z = ringState.tiltZ;

      // Opacity: rings fade based on their expansion state
      // Closer rings are more visible, outer rings fade
      const distanceFade = 1 - (finalRadius - minRadius) / radiusRange;
      const breathFade = 0.5 + (1 - currentBreathPhase) * 0.5; // Brighter during exhale
      material.opacity = opacity * distanceFade * breathFade * phaseVisibility;
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef} name="Expansion Rings">
      {ringLines.map((lineObj) => (
        <primitive key={lineObj.uuid} object={lineObj} />
      ))}
    </group>
  );
});

export default ExpansionRings;
