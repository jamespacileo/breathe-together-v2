import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Asymmetric breathing easing functions
 *
 * Uses piecewise sin/cos for natural, human-like breathing:
 * - Inhale: sin(t × π/2) - fast start, smooth landing
 * - Exhale: cos-based - controlled start, natural completion
 * - Holds: Damped oscillation - subtle "alive" movement
 *
 * All functions guarantee exact positions at phase boundaries (0 and 1).
 */

/**
 * Inhale easing: Fast intake with smooth landing
 *
 * Uses sin(t × π/2) for natural breath intake:
 * - Fast start: High initial velocity (lungs hungry for air)
 * - Smooth landing: Decelerates naturally as lungs fill
 *
 * Derivative at t=0: π/2 ≈ 1.57 (fast)
 * Derivative at t=1: 0 (smooth stop)
 *
 * This matches the natural feeling of taking a breath - eager start,
 * gentle completion as you reach full capacity.
 */
function easeInhale(t: number): number {
  const tClamped = Math.max(0, Math.min(1, t));
  return Math.sin(tClamped * Math.PI * 0.5);
}

/**
 * Exhale easing: Controlled release with natural completion
 *
 * Uses cos(t × π/2) for relaxed exhale:
 * - Smooth start: Gentle beginning of release
 * - Accelerating finish: Natural completion as lungs empty
 *
 * Returns 1→0 directly (not 0→1 like inhale), so used differently
 * in the phase calculation.
 *
 * This matches the natural feeling of a relaxed exhale - controlled
 * start, natural acceleration as you let go.
 */
function easeExhale(t: number): number {
  const tClamped = Math.max(0, Math.min(1, t));
  // cos goes 1→0, we need 0→1 for the easing function
  // So return 1 - cos(t × π/2)
  return 1 - Math.cos(tClamped * Math.PI * 0.5);
}

/**
 * Damped oscillation parameters for hold phases
 *
 * Physics: Underdamped harmonic oscillator creates subtle "breathing"
 * even during holds - nothing in nature is perfectly still.
 *
 * amplitude: 0.4% very subtle micro-movement (reduced from 1.2% to avoid
 *            appearing as a "bounce" before exhale begins)
 * damping: Reduces amplitude over the hold phase
 * frequency: ~1.0 cycles per hold for gentler rhythm (reduced from 1.5)
 */
const HOLD_AMPLITUDE = 0.004; // Reduced from 0.012 to avoid visible bounce
const HOLD_DAMPING = 0.6; // Slightly increased to settle faster
const HOLD_FREQUENCY = 1.0; // Reduced from 1.5 for gentler rhythm

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
