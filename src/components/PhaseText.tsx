/**
 * PhaseText - Breathing phase indicator positioned near the globe
 *
 * Features:
 * - Shows current phase name (INHALE, HOLD, EXHALE)
 * - Subtle countdown/progress indicator
 * - Positioned below the globe in 3D space
 * - Fades based on phase transitions
 *
 * Integrates with ECS breathPhase, phaseType, and rawProgress traits.
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { BREATH_PHASES } from '../constants';
import { breathPhase, phaseType, rawProgress } from '../entities/breath/traits';

// Phase type mappings
const PHASE_NAMES: Record<number, string> = {
  0: 'INHALE',
  1: 'HOLD',
  2: 'EXHALE',
  3: 'HOLD',
};

const PHASE_DURATIONS: Record<number, number> = {
  0: BREATH_PHASES.INHALE,
  1: BREATH_PHASES.HOLD_IN,
  2: BREATH_PHASES.EXHALE,
  3: BREATH_PHASES.HOLD_OUT,
};

// Colors matching holographic UI style
const PHASE_COLORS: Record<number, string> = {
  0: '#00ffff', // Cyan for inhale
  1: '#88ddff', // Soft blue for hold
  2: '#00ffff', // Cyan for exhale
  3: '#88ddff', // Soft blue for hold-out
};

// Position configuration - below the globe
const POSITION: [number, number, number] = [0, -2.5, 0];

// Poll interval for state updates (ms)
const UPDATE_INTERVAL = 50;

export interface PhaseTextProps {
  /** Whether to show the phase text @default true */
  visible?: boolean;
  /** Position relative to scene origin @default [0, -2.5, 0] */
  position?: [number, number, number];
  /** Show countdown timer @default true */
  showCountdown?: boolean;
}

interface PhaseState {
  phaseName: string;
  phaseColor: string;
  progress: number;
  remaining: number;
  phase: number;
}

export function PhaseText({
  visible = true,
  position = POSITION,
  showCountdown = true,
}: PhaseTextProps) {
  const world = useWorld();
  const [state, setState] = useState<PhaseState>({
    phaseName: 'INHALE',
    phaseColor: PHASE_COLORS[0],
    progress: 0,
    remaining: BREATH_PHASES.INHALE,
    phase: 0,
  });

  // Ref for throttling state updates
  const lastUpdateRef = useRef(0);

  // Position ref for Html component
  const positionRef = useRef(new THREE.Vector3(...position));

  // Animation loop - update state at throttled rate
  useFrame(() => {
    if (!visible) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;
    lastUpdateRef.current = now;

    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType, rawProgress);
      if (breathEntity) {
        const currentPhase = breathEntity.get(phaseType)?.value ?? 0;
        const currentProgress = breathEntity.get(rawProgress)?.value ?? 0;
        const phaseDuration = PHASE_DURATIONS[currentPhase] ?? 4;
        const remaining = Math.ceil(phaseDuration * (1 - currentProgress));

        setState({
          phaseName: PHASE_NAMES[currentPhase] ?? 'BREATHE',
          phaseColor: PHASE_COLORS[currentPhase] ?? '#00ffff',
          progress: currentProgress,
          remaining,
          phase: currentPhase,
        });
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!visible) return null;

  return (
    <Html
      position={positionRef.current}
      center
      distanceFactor={12}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div className="phase-text-container">
        <div className="phase-name" style={{ color: state.phaseColor }}>
          {state.phaseName}
        </div>
        {showCountdown && state.remaining > 0 && (
          <div className="phase-countdown" style={{ color: state.phaseColor }}>
            {state.remaining}
          </div>
        )}
        {/* Progress dots */}
        <div className="phase-progress">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="phase-dot"
              style={{
                backgroundColor: state.phase === i ? state.phaseColor : 'transparent',
                borderColor: state.phaseColor,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .phase-text-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 8px;
          border: 1px solid rgba(0, 255, 255, 0.3);
        }

        .phase-name {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-shadow:
            0 0 10px currentColor,
            0 0 20px currentColor;
        }

        .phase-countdown {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 24px;
          font-weight: 300;
          text-shadow:
            0 0 10px currentColor,
            0 0 20px currentColor;
          opacity: 0.9;
        }

        .phase-progress {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .phase-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid;
          transition: background-color 0.3s ease;
        }
      `}</style>
    </Html>
  );
}

export default PhaseText;
