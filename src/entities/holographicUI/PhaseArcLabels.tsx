/**
 * PhaseArcLabels - Curved text labels showing current breathing phase
 *
 * Three arc-positioned labels ("INHALE", "HOLD", "EXHALE") that curve
 * around the globe. The active phase glows brightly while inactive
 * phases remain dim.
 *
 * Features:
 * - Curved text using Troika's curveRadius
 * - Phase-synchronized opacity and glow
 * - Smooth transitions between phases
 * - Positioned above the globe like a compass
 */

import { Text, type TextProps } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';

// Extended Text props to include curveRadius
interface CurvedTextProps extends TextProps {
  curveRadius?: number;
}
const CurvedText = Text as React.FC<CurvedTextProps>;

// Phase configuration
const PHASES = [
  { label: 'INHALE', angle: -Math.PI / 3, color: '#c9a06c' }, // Left arc
  { label: 'HOLD', angle: 0, color: '#7ec5c4' }, // Center
  { label: 'EXHALE', angle: Math.PI / 3, color: '#d4a0a0' }, // Right arc
] as const;

interface PhaseArcLabelsProps {
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Height above globe center @default 1.8 */
  height?: number;
  /** Font size @default 0.12 */
  fontSize?: number;
  /** Active phase opacity @default 1.0 */
  activeOpacity?: number;
  /** Inactive phase opacity @default 0.2 */
  inactiveOpacity?: number;
  /** Override phase index for testing (0=inhale, 1=hold, 2=exhale) */
  testPhaseIndex?: number;
  /** Override phase progress for testing (0-1) */
  testPhaseProgress?: number;
  /** Whether to use test values instead of time-based */
  useTestValues?: boolean;
}

interface PhaseLabelProps {
  label: string;
  angle: number;
  color: string;
  radius: number;
  height: number;
  fontSize: number;
  isActive: boolean;
  phaseProgress: number;
  activeOpacity: number;
  inactiveOpacity: number;
}

function PhaseLabel({
  label,
  angle,
  color,
  radius,
  height,
  fontSize,
  isActive,
  phaseProgress,
  activeOpacity,
  inactiveOpacity,
}: PhaseLabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(inactiveOpacity);
  const scaleRef = useRef(1);

  // Animate opacity and scale smoothly
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const targetOpacity = isActive ? activeOpacity : inactiveOpacity;
    const targetScale = isActive ? 1.1 : 1.0;

    // Smooth interpolation
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 4);
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetScale, delta * 6);

    // Apply scale to group
    const group = groupRef.current;
    group.scale.setScalar(scaleRef.current);

    // Subtle pulse when active
    if (isActive && phaseProgress < 0.15) {
      const pulse = 1 + Math.sin((phaseProgress / 0.15) * Math.PI) * 0.05;
      group.scale.setScalar(scaleRef.current * pulse);
    }
  });

  // Calculate position on arc
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  return (
    <group ref={groupRef} position={[x, height, z]} rotation={[0, -angle, 0]}>
      <CurvedText
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        curveRadius={-radius * 0.8}
        letterSpacing={0.15}
        fontWeight={600}
        fillOpacity={isActive ? activeOpacity : inactiveOpacity}
        material-transparent={true}
        material-depthWrite={false}
      >
        {label}
      </CurvedText>
    </group>
  );
}

export function PhaseArcLabels({
  globeRadius = 1.5,
  height = 1.8,
  fontSize = 0.12,
  activeOpacity = 1.0,
  inactiveOpacity = 0.2,
  testPhaseIndex,
  testPhaseProgress,
  useTestValues = false,
}: PhaseArcLabelsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPhaseRef = useRef(0);
  const phaseProgressRef = useRef(0);

  // Calculate phase from time or use test values
  useFrame(() => {
    if (useTestValues) {
      currentPhaseRef.current = testPhaseIndex ?? 0;
      phaseProgressRef.current = testPhaseProgress ?? 0;
      return;
    }

    // Time-based phase calculation
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;

    if (cycleTime < BREATH_PHASES.INHALE) {
      currentPhaseRef.current = 0;
      phaseProgressRef.current = cycleTime / BREATH_PHASES.INHALE;
    } else if (cycleTime < BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) {
      currentPhaseRef.current = 1;
      phaseProgressRef.current = (cycleTime - BREATH_PHASES.INHALE) / BREATH_PHASES.HOLD_IN;
    } else {
      currentPhaseRef.current = 2;
      phaseProgressRef.current =
        (cycleTime - BREATH_PHASES.INHALE - BREATH_PHASES.HOLD_IN) / BREATH_PHASES.EXHALE;
    }
  });

  const radius = globeRadius + 0.3;

  return (
    <group ref={groupRef}>
      {PHASES.map((phase, index) => (
        <PhaseLabel
          key={phase.label}
          label={phase.label}
          angle={phase.angle}
          color={phase.color}
          radius={radius}
          height={height}
          fontSize={fontSize}
          isActive={currentPhaseRef.current === index}
          phaseProgress={phaseProgressRef.current}
          activeOpacity={activeOpacity}
          inactiveOpacity={inactiveOpacity}
        />
      ))}
    </group>
  );
}
