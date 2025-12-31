import { Billboard, Ring, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
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

interface PhaseInfo {
  phaseIndex: number;
  phaseProgress: number;
  accumulatedTime: number;
  phaseDuration: number;
}

/**
 * Calculate current breathing phase from cycle time
 */
function calculatePhaseInfo(cycleTime: number): PhaseInfo {
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

  return { phaseIndex, phaseProgress, accumulatedTime, phaseDuration };
}

interface PhaseOverlay3DProps {
  /** Globe radius to position text around @default 1.5 */
  globeRadius?: number;
  /** Whether the overlay is visible @default true */
  visible?: boolean;
}

/**
 * PhaseOverlay3D - 3D billboarded phase indicator that curves around the globe
 *
 * Design:
 * - Phase name positioned on the globe surface, always facing camera
 * - Circular progress ring in 3D space
 * - Countdown timer and presence count below
 * - All elements use Billboard for camera-facing behavior
 *
 * Performance: Uses useFrame for 60fps updates without React state
 */
export function PhaseOverlay3D({ globeRadius = 1.5, visible = true }: PhaseOverlay3DProps) {
  const phaseNameRef = useRef<THREE.Mesh>(null);
  const timerRef = useRef<THREE.Mesh>(null);
  const presenceRef = useRef<THREE.Mesh>(null);
  const progressRingRef = useRef<THREE.Mesh>(null);
  const progressBgRef = useRef<THREE.Mesh>(null);

  // Text positioning - slightly in front of globe surface
  const textRadius = globeRadius * 1.15; // Position text just outside the globe

  // Presence count state (updates less frequently)
  const presenceCountRef = useRef(75);

  // Update presence count every 2 seconds
  useEffect(() => {
    const updatePresence = () => {
      const baseCount = 75;
      const variation = Math.floor(Math.random() * 10) - 5;
      presenceCountRef.current = baseCount + variation;
    };
    updatePresence();
    const interval = setInterval(updatePresence, 2000);
    return () => clearInterval(interval);
  }, []);

  // Track previous values to minimize text updates
  const prevPhase = useRef(-1);
  const prevTimer = useRef(-1);
  const prevPresence = useRef(-1);

  // 60fps update loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAF loop updates multiple text elements and progress ring - complexity is inherent to the 60fps animation requirements
  useFrame(() => {
    if (!visible) return;

    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
      calculatePhaseInfo(cycleTime);
    const phaseTime = phaseProgress * phaseDuration;

    // Update phase name only on transition
    if (phaseIndex !== prevPhase.current && phaseNameRef.current) {
      prevPhase.current = phaseIndex;
      // Access the troika-three-text property
      const textMesh = phaseNameRef.current as THREE.Mesh & { text?: string };
      if ('text' in textMesh) {
        textMesh.text = PHASE_NAMES[phaseIndex] ?? 'Breathe';
      }
    }

    // Update timer countdown
    const remaining = Math.ceil((1 - phaseProgress) * phaseDuration);
    if (remaining !== prevTimer.current && timerRef.current) {
      prevTimer.current = remaining;
      const textMesh = timerRef.current as THREE.Mesh & { text?: string };
      if ('text' in textMesh) {
        textMesh.text = `${remaining}`;
      }
    }

    // Update presence count
    if (presenceCountRef.current !== prevPresence.current && presenceRef.current) {
      prevPresence.current = presenceCountRef.current;
      const textMesh = presenceRef.current as THREE.Mesh & { text?: string };
      if ('text' in textMesh) {
        textMesh.text = `${presenceCountRef.current} breathing`;
      }
    }

    // Update progress ring - rotate based on cycle progress
    if (progressRingRef.current) {
      const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;
      // Use thetaLength to show progress (ring fills clockwise from top)
      const material = progressRingRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = 0.6 + cycleProgress * 0.2;
      }
      // Update ring geometry by scaling or use shader
      // For now, we'll use rotation to indicate progress
      progressRingRef.current.rotation.z = -cycleProgress * Math.PI * 2;
    }
  });

  // Colors matching the warm palette
  const colors = useMemo(
    () => ({
      text: '#5a4d42',
      textDim: '#8b7a6a',
      accent: '#c9a06c',
      ringBg: 'rgba(160, 140, 120, 0.15)',
      ringFill: '#c9a06c',
    }),
    [],
  );

  if (!visible) return null;

  return (
    // Position group in world space - in front of globe (1.5), behind particles (4.5)
    <group position={[0, 0, textRadius]}>
      {/* Billboard only affects orientation, not position */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* Phase name */}
        <Text
          ref={phaseNameRef}
          position={[0, 0.15, 0]}
          fontSize={0.28}
          color={colors.text}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYrEPjuw-NxBKL_y94.woff2"
          letterSpacing={0.15}
          textAlign="center"
        >
          HOLD
        </Text>

        {/* Timer countdown */}
        <Text
          ref={timerRef}
          position={[0, -0.12, 0]}
          fontSize={0.16}
          color={colors.textDim}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2"
          letterSpacing={0.05}
        >
          4
        </Text>

        {/* Presence count */}
        <Text
          ref={presenceRef}
          position={[0, -0.38, 0]}
          fontSize={0.09}
          color={colors.textDim}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2"
          letterSpacing={0.08}
        >
          75 breathing
        </Text>

        {/* Progress ring background */}
        <Ring ref={progressBgRef} args={[0.52, 0.54, 64]} position={[0, -0.05, -0.01]}>
          <meshBasicMaterial color={colors.textDim} transparent opacity={0.1} />
        </Ring>

        {/* Progress ring - shows cycle progress */}
        <Ring
          ref={progressRingRef}
          args={[0.52, 0.55, 64, 1, 0, Math.PI * 2]}
          position={[0, -0.05, 0]}
          rotation={[0, 0, Math.PI / 2]} // Start from top
        >
          <meshBasicMaterial color={colors.accent} transparent opacity={0.6} />
        </Ring>
      </Billboard>
    </group>
  );
}
