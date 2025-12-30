import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Soft breathing easing with overshoot-and-settle pattern
 *
 * Animation principle: Natural movement overshoots slightly then settles back.
 * This creates organic, living motion rather than mechanical stops.
 *
 * Pattern: target → overshoot (2-3%) → settle back to target
 *
 * All easing uses sine curves for the softest possible transitions -
 * sine waves have zero acceleration at their peaks, creating gentle motion.
 */

// Core sine easing functions - softest possible curves
function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Soft inhale: Gentle sine curve with overshoot at peak
 *
 * Feel: Breath fills lungs smoothly, slightly "overflows", then settles
 * Visual: 0 → 0.97 (smooth) → 1.025 (peak) → 1.0 (settle)
 */
function easeInhale(t: number): number {
  if (t < 0.85) {
    // Main breath: smooth sine ease-in-out
    return easeInOutSine(t / 0.85) * 0.97;
  }
  // Final 15%: overshoot to ~1.025 then settle to 1.0
  const localT = (t - 0.85) / 0.15;
  const overshootAmount = 0.025; // 2.5% overshoot
  const overshootCurve = Math.sin(localT * Math.PI) * overshootAmount;
  return 0.97 + 0.03 * easeOutSine(localT) + overshootCurve;
}

/**
 * Soft exhale: Gentle sine release with undershoot at bottom
 *
 * Feel: Breath releases naturally, "empties" slightly past zero, settles
 * Visual: 1 → 0.03 (smooth) → -0.02 (dip) → 0.0 (settle)
 */
function easeExhale(t: number): number {
  if (t < 0.85) {
    // Main release: smooth sine-based descent
    return 1 - easeInOutSine(t / 0.85) * 0.97;
  }
  // Final 15%: undershoot to ~-0.02 then settle to 0.0
  const localT = (t - 0.85) / 0.15;
  const undershootAmount = 0.02; // 2% undershoot
  const undershootCurve = -Math.sin(localT * Math.PI) * undershootAmount;
  return 0.03 * (1 - easeOutSine(localT)) + undershootCurve;
}

/**
 * Hold-in: Settling after inhale overshoot + gentle micro-movement
 *
 * Feel: Breath is full, body settles, subtle aliveness
 */
function easeHoldIn(t: number): number {
  // Start slightly above 1 (continuing from inhale overshoot), settle toward 1
  const settleFromOvershoot = 1 + 0.015 * (1 - easeOutSine(t * 0.5));
  // Gentle micro-movement during hold
  const microMovement = Math.sin(t * Math.PI * 0.8) * 0.008;
  return settleFromOvershoot + microMovement;
}

/**
 * Hold-out: Settling after exhale undershoot + anticipation for next inhale
 *
 * Feel: Breath is empty, body settles, builds toward next inhale
 */
function easeHoldOut(t: number): number {
  // Start slightly below 0 (continuing from exhale undershoot), settle toward 0
  const settleFromUndershoot = -0.01 * (1 - easeOutSine(t * 0.5));
  // Slight anticipation rise toward end (body preparing for inhale)
  const anticipation = easeInSine(t) * 0.015;
  return settleFromUndershoot + anticipation;
}

/**
 * Utility easing (for crystallization effects)
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Breath Phase Convention:
 * - breathPhase: 0 = fully exhaled (particles expanded, orb contracted)
 *                1 = fully inhaled (particles contracted, orb expanded)
 */

/**
 * Phase configuration for data-driven calculation
 *
 * Each phase uses anatomically-inspired easing:
 * - Inhale: Effort → expansion → approach capacity
 * - Hold-in: Subtle settling/micro-expansion at peak
 * - Exhale: Quick release → controlled descent
 * - Hold-out: Subtle anticipation before next inhale
 */
const PHASES = [
  {
    duration: BREATH_PHASES.INHALE,
    ease: easeInhale,
    // Inhale goes from 0 → 1 (exhaled → full)
    target: (p: number) => p,
    crystal: () => 0,
  },
  {
    duration: BREATH_PHASES.HOLD_IN,
    ease: easeHoldIn,
    // Hold-in stays near 1 with subtle micro-movement
    // The ease function returns values slightly above/below 1
    target: (p: number) => Math.min(1, Math.max(0, p)), // Clamp to valid range
    crystal: (p: number) => 0.5 + easeInOutQuad(p) * 0.4,
  },
  {
    duration: BREATH_PHASES.EXHALE,
    ease: easeExhale,
    // Exhale goes from 1 → 0 (full → exhaled)
    target: (p: number) => 1 - p,
    crystal: () => 0,
  },
  {
    duration: BREATH_PHASES.HOLD_OUT,
    ease: easeHoldOut,
    // Hold-out stays near 0 with subtle anticipation
    // The ease function returns values slightly below/above 0
    target: (p: number) => Math.min(1, Math.max(0, p)), // Clamp to valid range
    crystal: (p: number) => 0.4 + easeInOutQuad(p) * 0.35,
  },
];

/**
 * Calculate all breathing values for a given UTC time
 * Returns a snapshot of the current breath state
 */
export function calculateBreathState(elapsedTime: number): BreathState {
  // Compute phase timing
  const cycleSeconds = BREATH_TOTAL_CYCLE;
  const scale = cycleSeconds / BREATH_TOTAL_CYCLE;
  const phaseDurations = [
    BREATH_PHASES.INHALE * scale,
    BREATH_PHASES.HOLD_IN * scale,
    BREATH_PHASES.EXHALE * scale,
    BREATH_PHASES.HOLD_OUT * scale,
  ];

  const cycleTime = elapsedTime % cycleSeconds;
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < phaseDurations.length; i++) {
    const duration = phaseDurations[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = phaseDurations[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  // Calculate breathing state
  const phase = PHASES[phaseIndex];
  const easedProgress = phase.ease(phaseProgress);

  // Raw breath phase (may have micro-movements outside 0-1 during holds)
  const rawBreathPhase = phase.target(easedProgress);

  // Clamped breath phase for visual calculations
  // Micro-movements during holds are subtle enough to not need clamping for most visuals
  const breathPhase = Math.max(0, Math.min(1, rawBreathPhase));

  const crystallization = phase.crystal(easedProgress);

  // Derive visual parameters from breath phase
  // Use raw phase for subtle micro-movement in visuals
  const visualPhase = rawBreathPhase;
  const sphereScale =
    VISUALS.SPHERE_SCALE_MIN + visualPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);
  const orbitRadius =
    VISUALS.PARTICLE_ORBIT_MAX -
    visualPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

  return {
    breathPhase,
    phaseType: phaseIndex,
    rawProgress: phaseProgress,
    easedProgress,
    crystallization,
    sphereScale,
    orbitRadius,
  };
}
