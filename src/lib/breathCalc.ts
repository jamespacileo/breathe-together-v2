import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Easing functions for different breath phases
 *
 * Each phase has its own easing curve for natural breathing feel:
 * - Inhale: easeOutQuart (fast start, gentle finish)
 * - Hold phases: easeInOutQuad (smooth sustain)
 * - Exhale: easeInSine (gentle release)
 */
function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

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
 * Simplified (Dec 2024): Removed crystallization (never used by any entity)
 */
const PHASES = [
  {
    duration: BREATH_PHASES.INHALE,
    ease: easeOutQuart,
    target: (p: number) => p,
  },
  {
    duration: BREATH_PHASES.HOLD_IN,
    ease: easeInOutQuad,
    target: () => 1,
  },
  {
    duration: BREATH_PHASES.EXHALE,
    ease: easeInSine,
    target: (p: number) => 1 - p,
  },
  {
    duration: BREATH_PHASES.HOLD_OUT,
    ease: easeInOutQuad,
    target: () => 0,
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
