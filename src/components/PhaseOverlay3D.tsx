/**
 * PhaseOverlay3D - Elegant 3D phase text overlay for the globe
 *
 * Features:
 * - Billboard text that always faces the camera
 * - Phase name in elegant serif font
 * - Gentle scale pulse synced to countdown seconds
 * - Sparkle intensity increases toward phase transitions
 *
 * Replaces the bottom HUD with an immersive 3D overlay
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type * as THREE from 'three';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';

// Phase configuration
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

// Visual configuration
const CONFIG = {
  // Text positioning
  yOffset: 0, // Center on globe
  zOffset: 0.5, // Slightly in front

  // Text styling
  fontSize: 0.45,
  letterSpacing: 0.12,
  color: '#5a4d42', // Warm brown text

  // Pulse animation
  baseScale: 1.0,
  pulseScale: 0.08, // 8% pulse on each second
  pulseDecay: 0.92, // How fast pulse decays

  // Transition animation
  transitionDuration: 0.4, // seconds for fade transition
};

interface PhaseInfo {
  phaseIndex: number;
  phaseProgress: number;
  secondsRemaining: number;
  cycleProgress: number;
}

/**
 * Calculate current breathing phase info
 */
function calculatePhaseInfo(timeSeconds: number): PhaseInfo {
  const cycleTime = timeSeconds % BREATH_TOTAL_CYCLE;
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < PHASE_DURATIONS.length; i++) {
    const duration = PHASE_DURATIONS[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = PHASE_DURATIONS[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));
  const secondsRemaining = Math.ceil((1 - phaseProgress) * phaseDuration);
  const cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;

  return { phaseIndex, phaseProgress, secondsRemaining, cycleProgress };
}

interface PhaseOverlay3DProps {
  /** Vertical offset from center @default 0 */
  yOffset?: number;
  /** Font size @default 0.45 */
  fontSize?: number;
  /** Text color @default '#5a4d42' */
  color?: string;
  /** Enable pulse animation @default true */
  enablePulse?: boolean;
  /** Show phase name @default true */
  visible?: boolean;
}

/**
 * PhaseOverlay3D - Renders breathing phase as elegant 3D billboard text
 */
export function PhaseOverlay3D({
  yOffset = CONFIG.yOffset,
  fontSize = CONFIG.fontSize,
  color = CONFIG.color,
  enablePulse = true,
  visible = true,
}: PhaseOverlay3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Mesh>(null);

  // Track previous second for pulse trigger
  const prevSecondRef = useRef<number>(-1);
  const pulseRef = useRef<number>(0);

  // Track phase for transitions
  const [phaseName, setPhaseName] = useState<string>('Inhale');
  const prevPhaseRef = useRef<number>(0);
  const transitionRef = useRef<number>(1); // 1 = fully visible

  useFrame((state) => {
    if (!groupRef.current || !visible) return;

    const now = Date.now() / 1000;
    const { phaseIndex, phaseProgress, secondsRemaining } = calculatePhaseInfo(now);

    // Detect phase change for text update and transition
    if (phaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = phaseIndex;
      transitionRef.current = 0; // Start fade-in
      setPhaseName(PHASE_NAMES[phaseIndex] ?? 'Breathe');
    }

    // Animate transition (fade in)
    if (transitionRef.current < 1) {
      transitionRef.current = Math.min(
        1,
        transitionRef.current + state.clock.getDelta() / CONFIG.transitionDuration,
      );
    }

    // Detect second change for pulse
    if (enablePulse && secondsRemaining !== prevSecondRef.current) {
      prevSecondRef.current = secondsRemaining;
      pulseRef.current = 1; // Trigger pulse
    }

    // Decay pulse
    pulseRef.current *= CONFIG.pulseDecay;

    // Calculate scale with pulse
    const pulseAmount = pulseRef.current * CONFIG.pulseScale;
    const scale = CONFIG.baseScale + pulseAmount;

    // Apply scale and transition opacity
    groupRef.current.scale.setScalar(scale * transitionRef.current);

    // Subtle breathing movement - text gently rises/falls with breath
    const breathOffset = Math.sin(phaseProgress * Math.PI) * 0.05;
    groupRef.current.position.y = yOffset + breathOffset;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[0, yOffset, CONFIG.zOffset]}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Text
          ref={textRef}
          fontSize={fontSize}
          letterSpacing={CONFIG.letterSpacing}
          color={color}
          anchorX="center"
          anchorY="middle"
          font="/fonts/CormorantGaramond-Light.ttf"
          characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ "
        >
          {phaseName}
        </Text>
      </Billboard>
    </group>
  );
}

export default PhaseOverlay3D;
