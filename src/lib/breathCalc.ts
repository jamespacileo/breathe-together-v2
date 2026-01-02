import { BREATH_TOTAL_CYCLE, HOLD_OSCILLATION, VISUALS } from '../constants';
import type { BreathState } from '../types';
import { calculatePhaseInfo } from './breathPhase';
import { clamp01, easeExhale, easeInhale } from './easing';

/**
 * Breathing state calculation using shared easing functions.
 *
 * Easing functions are imported from src/lib/easing.ts (single source of truth)
 * Phase detection uses src/lib/breathPhase.ts (single source of truth)
 * Hold oscillation parameters are in src/constants.ts (centralized config)
 */

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

  // Use shared phase detection (single source of truth)
  const { phaseIndex, phaseProgress: rawProgress } = calculatePhaseInfo(cycleTime);

  // Calculate breath phase based on current phase type
  let breathPhase: number;

  switch (phaseIndex) {
    case 0: // Inhale: 0 → 1 (particles contract inward)
      breathPhase = easeInhale(rawProgress);
      break;

    case 1: // Hold-in: Stay near 1 with damped oscillation
      {
        // Physics: Underdamped spring oscillation centered at 1
        // Amplitude decreases over time (damping), creating settling effect
        const dampedAmplitude1 =
          HOLD_OSCILLATION.AMPLITUDE * Math.exp(-HOLD_OSCILLATION.DAMPING * rawProgress);
        breathPhase =
          1 - dampedAmplitude1 * Math.sin(rawProgress * Math.PI * 2 * HOLD_OSCILLATION.FREQUENCY);
      }
      break;

    case 2: // Exhale: 1 → 0 (particles expand outward) - viscous release
      breathPhase = 1 - easeExhale(rawProgress);
      break;

    case 3: // Hold-out: Stay near 0 with damped oscillation
      {
        // Physics: Underdamped spring oscillation centered at 0
        // Same damping behavior for consistent organic feel
        const dampedAmplitude3 =
          HOLD_OSCILLATION.AMPLITUDE * Math.exp(-HOLD_OSCILLATION.DAMPING * rawProgress);
        breathPhase =
          dampedAmplitude3 * Math.sin(rawProgress * Math.PI * 2 * HOLD_OSCILLATION.FREQUENCY);
      }
      break;

    default:
      breathPhase = 0;
  }

  // Clamp to valid range
  breathPhase = clamp01(breathPhase);

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
