import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Easing functions for relaxation-focused breathing
 *
 * Designed to feel calming and organic:
 * - Inhale: Gentle filling, smooth throughout
 * - Exhale: Controlled, gradual release - key for relaxation
 * - Holds: Subtle micro-movement for organic feel
 */

/** Inhale easing: Smooth S-curve, gentle and steady */
function easeInhale(t: number): number {
  // easeInOutSine - balanced, calming intake
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Exhale easing: Controlled, gradual release
 * Starts gently, maintains steady pace - feels like "letting go" slowly
 * This is the key curve for relaxation breathing
 */
function easeExhale(t: number): number {
  // Custom curve: gentle start, steady middle, soft landing
  // Slower than typical easeOut to feel more controlled
  const sine = -(Math.cos(Math.PI * t) - 1) / 2;
  // Blend with linear for more controlled, steady feel
  return sine * 0.7 + t * 0.3;
}

/**
 * Micro-movement amplitude during hold phases
 * Keeps the scene feeling "alive" - nothing in nature is perfectly still
 */
const HOLD_MICRO_AMPLITUDE = 0.015; // 1.5% subtle oscillation

/**
 * Breath Phase Convention:
 * - breathPhase: 0 = fully exhaled (particles expanded)
 *                1 = fully inhaled (particles contracted)
 */

/**
 * Calculate breathing state for relaxation-focused animation
 *
 * Phase types:
 * - 0: Inhale (gentle filling)
 * - 1: Hold-in (peaceful stillness with micro-movement)
 * - 2: Exhale (controlled, gradual release)
 * - 3: Hold-out (calm stillness with micro-movement)
 */
export function calculateBreathState(elapsedTime: number): BreathState {
  const cycleTime = elapsedTime % BREATH_TOTAL_CYCLE;

  // Phase durations from config (easily changeable)
  const phaseDurations = [
    BREATH_PHASES.INHALE,
    BREATH_PHASES.HOLD_IN,
    BREATH_PHASES.EXHALE,
    BREATH_PHASES.HOLD_OUT,
  ];

  // Find current phase
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

  // Progress within current phase (0-1)
  const phaseDuration = phaseDurations[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const rawProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  // Calculate breath phase based on current phase type
  let breathPhase: number;

  switch (phaseIndex) {
    case 0: // Inhale: 0 → 1 (particles contract inward)
      breathPhase = easeInhale(rawProgress);
      break;

    case 1: // Hold-in: Stay near 1 with subtle micro-movement
      // Gentle oscillation centered at 1, creates "alive" feeling
      breathPhase = 1 - HOLD_MICRO_AMPLITUDE * Math.sin(rawProgress * Math.PI * 2);
      break;

    case 2: // Exhale: 1 → 0 (particles expand outward) - controlled release
      breathPhase = 1 - easeExhale(rawProgress);
      break;

    case 3: // Hold-out: Stay near 0 with subtle micro-movement
      // Gentle oscillation centered at 0, creates "alive" feeling
      breathPhase = HOLD_MICRO_AMPLITUDE * Math.sin(rawProgress * Math.PI * 2);
      break;

    default:
      breathPhase = 0;
  }

  // Clamp to valid range
  breathPhase = Math.max(0, Math.min(1, breathPhase));

  // Derive orbit radius (particles spread on exhale, contract on inhale)
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
