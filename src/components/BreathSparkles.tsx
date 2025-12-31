/**
 * BreathSparkles - Particle burst effect synchronized to breathing phases
 *
 * Features:
 * - Sparkles intensify (opacity + speed) toward end of each phase
 * - Subtle "burst" effect at phase transitions
 * - Creates anticipation and marks breathing rhythm visually
 *
 * Used as visual countdown indicator alongside PhaseOverlay3D
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';

// Phase durations for calculation
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

// Visual configuration
const CONFIG = {
  // Base sparkle properties
  baseCount: 80,
  baseOpacity: 0.3,
  baseSpeed: 0.2,
  baseSize: 3,

  // Intensification near phase end
  maxOpacity: 0.7,
  maxSpeed: 0.8,
  maxSize: 5,

  // When to start intensifying (0.7 = last 30% of phase)
  intensifyThreshold: 0.7,

  // Burst at transition
  burstDuration: 0.3, // seconds
  burstOpacity: 0.9,
  burstSize: 6,

  // Colors - warm palette matching globe
  colors: ['#f8d0a8', '#ffe4c4', '#ffd4b8', '#e8c4b8'],
};

interface PhaseInfo {
  phaseIndex: number;
  phaseProgress: number;
  cycleProgress: number;
}

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
  const cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;

  return { phaseIndex, phaseProgress, cycleProgress };
}

interface BreathSparklesProps {
  /** Radius of sparkle sphere @default 4 */
  radius?: number;
  /** Base particle count @default 80 */
  count?: number;
  /** Enable intensification effect @default true */
  enableIntensify?: boolean;
  /** Custom color @default warm peach */
  color?: string;
}

/**
 * BreathSparkles - Renders sparkles that intensify with breathing rhythm
 */
export function BreathSparkles({
  radius = 4,
  count = CONFIG.baseCount,
  enableIntensify = true,
  color = CONFIG.colors[0],
}: BreathSparklesProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Animated values for smooth transitions
  const [opacity, setOpacity] = useState(CONFIG.baseOpacity);
  const [speed, setSpeed] = useState(CONFIG.baseSpeed);
  const [size, setSize] = useState(CONFIG.baseSize);

  // Track phase for burst detection
  const prevPhaseRef = useRef<number>(0);
  const burstRef = useRef<number>(0);

  useFrame((state) => {
    if (!enableIntensify) return;

    const now = Date.now() / 1000;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(now);

    // Detect phase transition for burst
    if (phaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = phaseIndex;
      burstRef.current = 1; // Trigger burst
    }

    // Decay burst
    burstRef.current = Math.max(
      0,
      burstRef.current - state.clock.getDelta() / CONFIG.burstDuration,
    );

    // Calculate intensification factor (0 at start of phase, 1 at end)
    let intensify = 0;
    if (phaseProgress > CONFIG.intensifyThreshold) {
      // Smoothly ramp from 0 to 1 in the last portion of phase
      intensify = (phaseProgress - CONFIG.intensifyThreshold) / (1 - CONFIG.intensifyThreshold);
      // Ease in for smoother buildup
      intensify = intensify * intensify;
    }

    // Combine with burst
    const burstFactor = burstRef.current;

    // Calculate final values
    const targetOpacity = THREE.MathUtils.lerp(
      CONFIG.baseOpacity,
      burstFactor > 0 ? CONFIG.burstOpacity : CONFIG.maxOpacity,
      Math.max(intensify, burstFactor),
    );

    const targetSpeed = THREE.MathUtils.lerp(CONFIG.baseSpeed, CONFIG.maxSpeed, intensify);

    const targetSize = THREE.MathUtils.lerp(
      CONFIG.baseSize,
      burstFactor > 0 ? CONFIG.burstSize : CONFIG.maxSize,
      Math.max(intensify, burstFactor),
    );

    // Smooth transitions
    setOpacity((prev) => THREE.MathUtils.lerp(prev, targetOpacity, 0.1));
    setSpeed((prev) => THREE.MathUtils.lerp(prev, targetSpeed, 0.1));
    setSize((prev) => THREE.MathUtils.lerp(prev, targetSize, 0.1));
  });

  return (
    <group ref={groupRef}>
      <Sparkles
        count={count}
        size={size}
        scale={[radius * 2.5, radius * 2.5, radius * 2.5]}
        speed={speed}
        opacity={opacity}
        color={color}
      />
    </group>
  );
}

export default BreathSparkles;
