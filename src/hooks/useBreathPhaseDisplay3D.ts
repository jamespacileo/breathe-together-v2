import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { phaseType, rawProgress } from '../entities/breath/traits';
import * as logger from '../lib/logger';
import type { UikitContainerRef, UikitTextRef } from '../types/uikit';

export const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'];

// Computed once at module load time (not on every function call)
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

const PHASE_START_TIMES = PHASE_DURATIONS.reduce<number[]>((acc, _duration, index) => {
  if (index === 0) return [0];
  const lastStart = acc[index - 1] ?? 0;
  acc.push(lastStart + (PHASE_DURATIONS[index - 1] ?? 0));
  return acc;
}, []);

interface PhaseDisplay3DRefs {
  phaseNameRef: UikitTextRef;
  timerRef: UikitTextRef;
  progressBarRef: UikitContainerRef;
}

/**
 * Hook that manages breath phase display updates for uikit HUD
 * Reads from Koota world (single source of truth) and updates uikit refs directly
 *
 * Performance: No React state, updates refs at 60fps via useFrame
 * ECS Integration: Queries breath entity traits each frame
 */
export function useBreathPhaseDisplay3D(refs: PhaseDisplay3DRefs): void {
  const world = useWorld();
  const prevPhaseRef = useRef<number>(-1);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HUD update logic requires state checks and multiple text property updates across refs - refactoring would reduce readability
  useFrame(() => {
    try {
      const breathEntity = world.queryFirst(phaseType, rawProgress);
      if (!breathEntity || !world.has(breathEntity)) return;

      if (!breathEntity.has?.(phaseType)) {
        logger.warn('[useBreathPhaseDisplay3D] phaseType trait missing - entity may be corrupt');
      }
      if (!breathEntity.has?.(rawProgress)) {
        logger.warn('[useBreathPhaseDisplay3D] rawProgress trait missing - entity may be corrupt');
      }

      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      const currentRawProgress = Math.min(
        1,
        Math.max(0, breathEntity.get(rawProgress)?.value ?? 0),
      );
      const phaseStartTime = PHASE_START_TIMES[currentPhaseType] ?? 0;
      const phaseDuration = PHASE_DURATIONS[currentPhaseType] ?? PHASE_DURATIONS[0] ?? 1;

      // Update phase name on transition
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
        if (refs.phaseNameRef.current) {
          const phaseName = PHASE_NAMES[currentPhaseType] ?? 'Breathing';
          if (refs.phaseNameRef.current.text !== undefined) {
            refs.phaseNameRef.current.text = phaseName;
          } else if (refs.phaseNameRef.current.innerText !== undefined) {
            refs.phaseNameRef.current.innerText = phaseName;
          }
        }
      }

      // Update timer
      if (refs.timerRef.current) {
        const phaseTimer = Math.ceil((1 - currentRawProgress) * phaseDuration);
        const timerText = `${phaseTimer}s`;
        if (refs.timerRef.current.text !== undefined) {
          refs.timerRef.current.text = timerText;
        } else if (refs.timerRef.current.innerText !== undefined) {
          refs.timerRef.current.innerText = timerText;
        }
      }

      // Update progress bar
      if (refs.progressBarRef.current) {
        const cycleProgress =
          (phaseStartTime + currentRawProgress * phaseDuration) / BREATH_TOTAL_CYCLE;
        const progressPercent = cycleProgress * 100;
        if (refs.progressBarRef.current.width !== undefined) {
          refs.progressBarRef.current.width = `${progressPercent}%`;
        } else if (refs.progressBarRef.current.style?.width !== undefined) {
          refs.progressBarRef.current.style.width = `${progressPercent}%`;
        }
      }
    } catch (error) {
      // Ignore stale world errors
      logger.warn(
        '[useBreathPhaseDisplay3D] ECS error (expected during Triplex hot-reload):',
        error,
      );
    }
  });
}
