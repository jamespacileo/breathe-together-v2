import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { phaseType, rawProgress } from '../entities/breath/traits';

export const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'];
export const PHASE_DESCRIPTIONS = ['Breathing In', 'Holding Breath', 'Breathing Out', 'Resting'];

interface PhaseDisplayRefs {
  phaseNameRef: React.RefObject<HTMLDivElement | null>;
  phaseDescRef?: React.RefObject<HTMLDivElement | null>;
  timerRef: React.RefObject<HTMLDivElement | null>;
  progressBarRef?: React.RefObject<HTMLDivElement | null>;
  progressArcRef?: React.RefObject<SVGCircleElement | null>;
}

/**
 * Hook that manages breath phase display updates via RAF loop
 * Reads from Koota world (single source of truth) and updates DOM refs directly
 */
export function useBreathPhaseDisplay(refs: PhaseDisplayRefs): void {
  const world = useWorld();
  const prevPhaseRef = useRef<number>(-1);
  const { phaseNameRef, phaseDescRef, timerRef, progressBarRef, progressArcRef } = refs;

  useEffect(() => {
    const phaseDurations = [
      BREATH_PHASES.INHALE,
      BREATH_PHASES.HOLD_IN,
      BREATH_PHASES.EXHALE,
      BREATH_PHASES.HOLD_OUT,
    ];
    const phaseStartTimes = phaseDurations.reduce<number[]>((acc, duration, index) => {
      if (index === 0) return [0];
      const lastStart = acc[index - 1] ?? 0;
      acc.push(lastStart + (phaseDurations[index - 1] ?? 0));
      return acc;
    }, []);

    // Helper: Update phase name and description on transition
    const updatePhaseText = (phaseTypeValue: number) => {
      if (phaseNameRef.current) {
        phaseNameRef.current.innerText = PHASE_NAMES[phaseTypeValue];
        phaseNameRef.current.style.animation = 'none';
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        phaseNameRef.current.offsetHeight; // Force reflow
        phaseNameRef.current.style.animation = 'phaseNameEnter 300ms 100ms ease-out forwards';
      }

      if (phaseDescRef?.current) {
        phaseDescRef.current.innerText = PHASE_DESCRIPTIONS[phaseTypeValue];
        phaseDescRef.current.style.animation = 'none';
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        phaseDescRef.current.offsetHeight; // Force reflow
        phaseDescRef.current.style.animation = 'phaseNameEnter 300ms 100ms ease-out forwards';
      }
    };

    // Helper: Update timer display based on progress
    const updateTimer = (rawProgress: number, phaseDuration: number) => {
      if (timerRef.current) {
        const phaseTimer = Math.ceil((1 - rawProgress) * phaseDuration);
        timerRef.current.innerText = `${phaseTimer}s`;
      }
    };

    // Helper: Update progress bar based on cycle position
    const updateProgressBar = (
      phaseStartTime: number,
      rawProgress: number,
      phaseDuration: number,
    ) => {
      if (progressBarRef?.current) {
        const cycleProgress = (phaseStartTime + rawProgress * phaseDuration) / BREATH_TOTAL_CYCLE;
        progressBarRef.current.style.width = `${cycleProgress * 100}%`;
      }
    };

    // Helper: Update SVG arc progress ring for radial HUD
    const updateProgressArc = (
      phaseStartTime: number,
      rawProgress: number,
      phaseDuration: number,
    ) => {
      if (progressArcRef?.current) {
        const cycleProgress = (phaseStartTime + rawProgress * phaseDuration) / BREATH_TOTAL_CYCLE;
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - cycleProgress * circumference;
        progressArcRef.current.style.strokeDashoffset = `${offset}`;
      }
    };

    let frameId = 0;
    const updateLoop = () => {
      // Query breath entity from Koota world
      const breathEntity = world.queryFirst(phaseType, rawProgress);
      if (!breathEntity) {
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

      // Update phase text only on transition
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
        updatePhaseText(currentPhaseType);
      }

      // Update timer and progress bar/arc every frame
      updateTimer(currentRawProgress, phaseDuration);
      updateProgressBar(phaseStartTime, currentRawProgress, phaseDuration);
      updateProgressArc(phaseStartTime, currentRawProgress, phaseDuration);

      // Schedule next frame
      frameId = requestAnimationFrame(updateLoop);
    };

    // Start the loop
    frameId = requestAnimationFrame(updateLoop);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [world, phaseNameRef, phaseDescRef, timerRef, progressBarRef, progressArcRef]);
}
