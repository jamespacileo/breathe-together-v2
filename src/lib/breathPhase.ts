import { BREATH_PHASES } from '../constants';

/**
 * Breathing phase durations in seconds
 * Order: Inhale, Hold-in, Exhale, Hold-out
 */
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

/**
 * Information about the current breathing phase
 */
export interface PhaseInfo {
  /** Index of current phase (0: inhale, 1: hold-in, 2: exhale, 3: hold-out) */
  phaseIndex: number;
  /** Progress through current phase (0-1) */
  phaseProgress: number;
  /** Accumulated time at start of current phase (seconds) */
  accumulatedTime: number;
  /** Duration of current phase (seconds) */
  phaseDuration: number;
}

/**
 * Calculate current breathing phase from cycle time
 *
 * Determines which phase of the breathing cycle (inhale, hold-in, exhale, hold-out)
 * is currently active and how far through that phase we are.
 *
 * @param cycleTime - Current time within the breathing cycle (0-16 seconds)
 * @returns Phase information including index, progress, and timing
 *
 * @example
 * ```ts
 * const info = calculatePhaseInfo(2.5);
 * // { phaseIndex: 0, phaseProgress: 0.833, accumulatedTime: 0, phaseDuration: 3 }
 * // Meaning: 83.3% through the inhale phase
 * ```
 */
export function calculatePhaseInfo(cycleTime: number): PhaseInfo {
  let accumulatedTime = 0;
  let phaseIndex = 0;

  // Find which phase we're in
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
