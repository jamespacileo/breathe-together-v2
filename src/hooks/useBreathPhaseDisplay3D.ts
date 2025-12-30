import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { phaseType, rawProgress } from '../entities/breath/traits';

export const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'];

interface PhaseDisplay3DRefs {
  phaseNameRef: React.RefObject<any>;
  timerRef: React.RefObject<any>;
  progressBarRef: React.RefObject<any>;
}

/**
 * Hook that manages breath phase display updates via RAF loop for uikit HUD
 * Reads from Koota world (single source of truth) and updates uikit refs directly
 *
 * Performance: No React state in animation loop, updates refs at 60fps
 * ECS Integration: Queries breath entity traits each frame
 */
export function useBreathPhaseDisplay3D(refs: PhaseDisplay3DRefs): void {
  const world = useWorld();
  const prevPhaseRef = useRef<number>(-1);

  useEffect(() => {
    const phaseDurations = [
      BREATH_PHASES.INHALE,
      BREATH_PHASES.HOLD_IN,
      BREATH_PHASES.EXHALE,
      BREATH_PHASES.HOLD_OUT,
    ];

    // Calculate phase start times (cumulative)
    const phaseStartTimes = phaseDurations.reduce<number[]>((acc, _duration, index) => {
      if (index === 0) return [0];
      const lastStart = acc[index - 1] ?? 0;
      acc.push(lastStart + (phaseDurations[index - 1] ?? 0));
      return acc;
    }, []);

    // Helper: Update phase name on transition
    const updatePhaseText = (phaseTypeValue: number) => {
      if (refs.phaseNameRef.current) {
        const phaseName = PHASE_NAMES[phaseTypeValue] ?? 'Breathing';
        // Try updating via ref first
        if (refs.phaseNameRef.current.text !== undefined) {
          refs.phaseNameRef.current.text = phaseName;
        } else if (refs.phaseNameRef.current.innerText !== undefined) {
          refs.phaseNameRef.current.innerText = phaseName;
        }
      }
    };

    // Helper: Update timer display
    const updateTimer = (rawProgressValue: number, phaseDuration: number) => {
      if (refs.timerRef.current) {
        const phaseTimer = Math.ceil((1 - rawProgressValue) * phaseDuration);
        const timerText = `${phaseTimer}s`;

        if (refs.timerRef.current.text !== undefined) {
          refs.timerRef.current.text = timerText;
        } else if (refs.timerRef.current.innerText !== undefined) {
          refs.timerRef.current.innerText = timerText;
        }
      }
    };

    // Helper: Update progress bar width
    const updateProgressBar = (
      phaseStartTime: number,
      rawProgressValue: number,
      phaseDuration: number,
    ) => {
      if (refs.progressBarRef.current) {
        const cycleProgress =
          (phaseStartTime + rawProgressValue * phaseDuration) / BREATH_TOTAL_CYCLE;
        const progressPercent = cycleProgress * 100;

        // Try updating width property
        if (refs.progressBarRef.current.width !== undefined) {
          refs.progressBarRef.current.width = `${progressPercent}%`;
        } else if (refs.progressBarRef.current.style?.width !== undefined) {
          refs.progressBarRef.current.style.width = `${progressPercent}%`;
        }
      }
    };

    let frameId = 0;

    const updateLoop = () => {
      try {
        // Query breath entity from Koota world
        const breathEntity = world.queryFirst(phaseType, rawProgress);
        if (!breathEntity || !world.has(breathEntity)) {
          frameId = requestAnimationFrame(updateLoop);
          return;
        }

        // Get current breath state from ECS (single source of truth)
        const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
        const currentRawProgress = Math.min(
          1,
          Math.max(0, breathEntity.get(rawProgress)?.value ?? 0),
        );
        const phaseStartTime = phaseStartTimes[currentPhaseType] ?? 0;
        const phaseDuration = phaseDurations[currentPhaseType] ?? phaseDurations[0] ?? 1;

        // Update phase text only on transition (infrequent)
        if (currentPhaseType !== prevPhaseRef.current) {
          prevPhaseRef.current = currentPhaseType;
          updatePhaseText(currentPhaseType);
        }

        // Update timer and progress every frame (60fps)
        updateTimer(currentRawProgress, phaseDuration);
        updateProgressBar(phaseStartTime, currentRawProgress, phaseDuration);
      } catch (_e) {
        // Ignore stale world errors on cleanup/unmount
      }

      // Schedule next frame
      frameId = requestAnimationFrame(updateLoop);
    };

    // Start the RAF loop
    frameId = requestAnimationFrame(updateLoop);

    // Cleanup on unmount
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [world, refs]);
}
