import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Physics-based easing functions for organic breathing animation
 *
 * Uses spring dynamics and damping principles to create natural motion:
 * - Inhale: Smootherstep (Perlin) - physically smooth acceleration/deceleration
 * - Exhale: Viscous release - exponential decay blended for controlled feel
 * - Holds: Damped oscillation - subtle "alive" movement
 *
 * All functions guarantee exact positions at phase boundaries (0 and 1)
 * while providing the organic feel of physical systems.
 */

/**
 * Soft S-curve using arctangent
 *
 * Unlike smootherstep which reaches 97% by t=0.8 (feels "done early"),
 * this curve distributes motion more evenly:
 * - t=0.2 → ~14% (slow start)
 * - t=0.5 → 50% (midpoint)
 * - t=0.8 → ~86% (still visible motion in final 20%)
 *
 * Creates controlled, deliberate feel that uses the full duration.
 *
 * @param t Progress 0-1
 * @param steepness Controls S-curve sharpness (2-4 typical, lower = more linear)
 */
function softSCurve(t: number, steepness: number): number {
  const halfK = steepness * 0.5;
  return 0.5 * (1 + Math.atan(steepness * (t - 0.5)) / Math.atan(halfK));
}

/**
 * Inhale easing: Controlled, deliberate breath intake
 *
 * Uses soft arctangent S-curve for even time distribution:
 * - Slow, controlled start (overcoming initial resistance)
 * - Steady progression through middle (visible motion throughout)
 * - Gentle settling at end (lungs filling naturally)
 *
 * Steepness 2.5 balances smoothness with "uses full duration" feel.
 */
function easeInhale(t: number): number {
  return softSCurve(t, 2.5);
}

/**
 * Exhale easing: Controlled, relaxing breath release
 *
 * Uses soft S-curve with slightly lower steepness than inhale:
 * - Creates "letting go" feel with steady, even progression
 * - Lower steepness (2.0) = more linear = more controlled release
 * - No rushing - motion visible throughout full 4 seconds
 *
 * For relaxation breathing, the exhale should feel unhurried and steady.
 */
function easeExhale(t: number): number {
  // Slightly more linear than inhale for steady, controlled release
  return softSCurve(t, 2.0);
}

/**
 * Damped oscillation parameters for hold phases
 *
 * Physics: Underdamped harmonic oscillator creates subtle "breathing"
 * even during holds - nothing in nature is perfectly still.
 *
 * amplitude: 1.2% keeps it subtle but perceptible
 * damping: Reduces amplitude over the hold phase
 * frequency: ~1.5 cycles per hold for gentle rhythm
 */
const HOLD_AMPLITUDE = 0.012;
const HOLD_DAMPING = 0.5; // How much oscillation decreases over hold
const HOLD_FREQUENCY = 1.5; // Oscillation cycles per hold phase

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

    case 1: // Hold-in: Stay near 1 with damped oscillation
      {
        // Physics: Underdamped spring oscillation centered at 1
        // Amplitude decreases over time (damping), creating settling effect
        const dampedAmplitude1 = HOLD_AMPLITUDE * Math.exp(-HOLD_DAMPING * rawProgress);
        breathPhase = 1 - dampedAmplitude1 * Math.sin(rawProgress * Math.PI * 2 * HOLD_FREQUENCY);
      }
      break;

    case 2: // Exhale: 1 → 0 (particles expand outward) - viscous release
      breathPhase = 1 - easeExhale(rawProgress);
      break;

    case 3: // Hold-out: Stay near 0 with damped oscillation
      {
        // Physics: Underdamped spring oscillation centered at 0
        // Same damping behavior for consistent organic feel
        const dampedAmplitude3 = HOLD_AMPLITUDE * Math.exp(-HOLD_DAMPING * rawProgress);
        breathPhase = dampedAmplitude3 * Math.sin(rawProgress * Math.PI * 2 * HOLD_FREQUENCY);
      }
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
