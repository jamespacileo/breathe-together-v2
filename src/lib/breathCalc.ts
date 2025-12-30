import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Quartic ease-out function for smooth deceleration
 *
 * Used during the **inhale phase** to create a natural, energetic start that
 * gradually slows. Creates a powerful initial expansion that gently settles.
 *
 * **Visual Effect:** Particles rapidly contract at start, then smoothly slow
 * to their final position. Sphere expands with initial energy, then settles.
 *
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

/**
 * Sinusoidal ease-in function for gentle acceleration
 *
 * Used during the **exhale phase** to create a calm, meditative release.
 * Starts very slowly and gradually accelerates into a natural flow.
 *
 * **Visual Effect:** Particles begin expanding almost imperceptibly, then
 * smoothly accelerate. Sphere contracts with peaceful, meditative quality.
 *
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

/**
 * Quadratic ease-in-out function for balanced motion
 *
 * Used during **hold phases** (both hold-in and hold-out) to create subtle
 * movement that feels stable yet alive. Provides gentle breathing feel even
 * during holds.
 *
 * **Visual Effect:** Smooth, symmetrical motion during crystallization pulses.
 * Creates organic "aliveness" without disturbing the meditative stillness.
 *
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
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
 */
const PHASES = [
  {
    duration: BREATH_PHASES.INHALE,
    ease: easeOutQuart,
    target: (p: number) => p,
    crystal: () => 0,
  },
  {
    duration: BREATH_PHASES.HOLD_IN,
    ease: easeInOutQuad,
    target: () => 1,
    crystal: (p: number) => 0.5 + p * 0.4,
  },
  {
    duration: BREATH_PHASES.EXHALE,
    ease: easeInSine,
    target: (p: number) => 1 - p,
    crystal: () => 0,
  },
  {
    duration: BREATH_PHASES.HOLD_OUT,
    ease: easeInOutQuad,
    target: () => 0,
    crystal: (p: number) => 0.4 + p * 0.35,
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

  const breathPhase = phase.target(easedProgress);
  const crystallization = phase.crystal(easedProgress);

  // Derive visual parameters from breath phase
  const sphereScale =
    VISUALS.SPHERE_SCALE_MIN + breathPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);
  const orbitRadius =
    VISUALS.PARTICLE_ORBIT_MAX -
    breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

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
