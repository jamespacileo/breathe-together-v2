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

/**
 * Anticipation signal information for visual hints before phase transitions
 *
 * Inspired by game design patterns (Sekiro, Elden Ring, God of War) where subtle
 * visual "tells" prepare the player's nervous system before an event occurs.
 * These signals are designed to be subliminal - not consciously noticed but
 * subconsciously registered.
 */
export interface AnticipationInfo {
  /** Seconds until next phase transition (0 = transition happening now) */
  timeToTransition: number;
  /** Whether we're in the anticipation window (final 2s of any phase) */
  isAnticipating: boolean;
  /** Anticipation intensity 0→1 (0 = not anticipating, 1 = transition imminent) */
  anticipationProgress: number;
  /** Index of the UPCOMING phase (what we're transitioning TO) */
  nextPhaseIndex: number;
  /** Smooth eased anticipation for organic visual effects (uses ease-in-cubic) */
  easedAnticipation: number;
}

/** Duration of anticipation window in seconds */
const ANTICIPATION_WINDOW = 2.0;

/**
 * Calculate anticipation signals for visual phase transition hints
 *
 * Returns information about how close we are to the next breathing phase
 * transition, designed to drive subtle visual effects that prepare the
 * user's nervous system for the upcoming change.
 *
 * The effect should be subliminal - the user doesn't consciously notice
 * "oh, something is about to happen" but their body subtly prepares.
 *
 * @param phaseInfo - Current phase information from calculatePhaseInfo
 * @returns Anticipation signal data for visual effects
 *
 * @example
 * ```ts
 * const phase = calculatePhaseInfo(cycleTime);
 * const anticipation = calculateAnticipation(phase);
 *
 * if (anticipation.isAnticipating) {
 *   // Apply subtle visual effects that intensify with anticipationProgress
 *   glowIntensity = baseGlow + anticipation.easedAnticipation * 0.3;
 * }
 * ```
 */
export function calculateAnticipation(phaseInfo: PhaseInfo): AnticipationInfo {
  const { phaseProgress, phaseDuration, phaseIndex } = phaseInfo;

  // Time remaining in current phase
  const timeInPhase = phaseProgress * phaseDuration;
  const timeToTransition = phaseDuration - timeInPhase;

  // Are we in the anticipation window?
  const isAnticipating = timeToTransition <= ANTICIPATION_WINDOW;

  // Linear anticipation progress (0 = start of window, 1 = transition)
  const anticipationProgress = isAnticipating ? 1 - timeToTransition / ANTICIPATION_WINDOW : 0;

  // Eased anticipation for smoother visual effects (ease-in-cubic)
  // Starts slow, accelerates toward transition - mimics "gathering energy"
  const easedAnticipation = anticipationProgress * anticipationProgress * anticipationProgress;

  // What phase is coming next?
  const nextPhaseIndex = (phaseIndex + 1) % 4;

  return {
    timeToTransition,
    isAnticipating,
    anticipationProgress,
    nextPhaseIndex,
    easedAnticipation,
  };
}
