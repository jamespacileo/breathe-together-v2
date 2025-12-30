import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Easing function for natural breathing motion
 *
 * easeInOutSine creates the classic "breathing" curve:
 * - Gentle start (like beginning to inhale/exhale)
 * - Smooth acceleration through the middle
 * - Gentle finish (like completing the breath)
 * - Uses the FULL duration of each phase
 *
 * This is the natural choice for rhythmic, organic motion.
 */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Breath Phase Convention:
 * - breathPhase: 0 = fully exhaled (particles expanded, orb contracted)
 *                1 = fully inhaled (particles contracted, orb expanded)
 */

/**
 * Phase configuration for breathing animation
 *
 * All phases use easeInOutSine for organic, breathing-like motion.
 * The sine wave naturally models rhythmic expansion/contraction.
 */
const PHASES = [
  {
    duration: BREATH_PHASES.INHALE,
    ease: easeInOutSine,
    target: (p: number) => p, // 0 → 1 (particles contract inward)
  },
  {
    duration: BREATH_PHASES.HOLD_IN,
    ease: easeInOutSine,
    target: () => 1, // Stay at 1 (particles held close)
  },
  {
    duration: BREATH_PHASES.EXHALE,
    ease: easeInOutSine,
    target: (p: number) => 1 - p, // 1 → 0 (particles expand outward)
  },
  {
    duration: BREATH_PHASES.HOLD_OUT,
    ease: easeInOutSine,
    target: () => 0, // Stay at 0 (particles held expanded)
  },
];

/**
 * Calculate breathing state for a given elapsed time (typically Date.now() / 1000)
 *
 * Returns only the values actively consumed by entities:
 * - breathPhase: Main animation driver (0-1)
 * - phaseType: Which phase (0-3) for HUD display
 * - rawProgress: Progress within phase (0-1) for HUD timer
 * - orbitRadius: Derived value for ParticleSwarm
 *
 * Removed (Dec 2024): easedProgress, crystallization, sphereScale (never used)
 */
export function calculateBreathState(elapsedTime: number): BreathState {
  const cycleTime = elapsedTime % BREATH_TOTAL_CYCLE;

  // Find current phase
  let accumulatedTime = 0;
  let phaseIndex = 0;

  const phaseDurations = [
    BREATH_PHASES.INHALE,
    BREATH_PHASES.HOLD_IN,
    BREATH_PHASES.EXHALE,
    BREATH_PHASES.HOLD_OUT,
  ];

  for (let i = 0; i < phaseDurations.length; i++) {
    const duration = phaseDurations[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  // Calculate progress within current phase
  const phaseDuration = phaseDurations[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const rawProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  // Apply phase-specific easing and target function
  const phase = PHASES[phaseIndex];
  const easedProgress = phase.ease(rawProgress);
  const breathPhase = phase.target(easedProgress);

  // Derive orbit radius from breath phase (particles spread on exhale, contract on inhale)
  const orbitRadius =
    VISUALS.PARTICLE_ORBIT_MAX -
    breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

  return {
    breathPhase,
    phaseType: phaseIndex,
    rawProgress,
    orbitRadius,
  };
}
