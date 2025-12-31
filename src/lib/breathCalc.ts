import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Controlled breathing easing functions for organic, relaxation-focused animation
 *
 * Uses raised cosine ramps with linear plateau for natural motion:
 * - Inhale/Exhale: Soft start, steady middle, soft end
 * - Holds: Damped oscillation - subtle "alive" movement
 *
 * All functions guarantee exact positions at phase boundaries (0 and 1)
 * while providing the organic feel of controlled breathing.
 */

/**
 * Controlled breath curve with soft start/end and steady middle
 *
 * Creates organic controlled breathing feel with three sections:
 * 1. Soft start: Raised cosine ramp (velocity 0 → steady)
 * 2. Steady middle: Linear/constant velocity (controlled, even flow)
 * 3. Soft end: Raised cosine ramp (velocity steady → 0)
 *
 * The raised cosine provides C1-continuous transitions (smooth velocity)
 * while the linear middle creates the "steady controlled" breathing feel.
 *
 * @param t Progress 0-1
 * @param startRamp Fraction of time for start ramp (0.2-0.35)
 * @param endRamp Fraction of time for end ramp (0.2-0.35)
 */
function controlledBreathCurve(t: number, startRamp: number, endRamp: number): number {
  // Clamp input
  t = Math.max(0, Math.min(1, t));

  // Middle section starts after startRamp and ends before endRamp
  const middleEnd = 1 - endRamp;

  // Calculate steady velocity needed to cover remaining distance
  // Total distance = 1, ramps each cover (ramp * velocity / 2)
  // So: startRamp*v/2 + middleDuration*v + endRamp*v/2 = 1
  // v * (startRamp/2 + middleDuration + endRamp/2) = 1
  // v = 1 / (1 - startRamp/2 - endRamp/2)
  const middleVelocity = 1 / (1 - startRamp / 2 - endRamp / 2);

  // Height reached at end of start ramp
  const startRampHeight = (middleVelocity * startRamp) / 2;
  // Height at start of end ramp
  const endRampStart = 1 - (middleVelocity * endRamp) / 2;

  if (t <= startRamp) {
    // Raised cosine ramp-up: smooth acceleration from 0 to middleVelocity
    // Integral of (1 - cos(πx))/2 from 0 to x = x/2 - sin(πx)/(2π)
    const normalized = t / startRamp;
    const integral = normalized / 2 - Math.sin(Math.PI * normalized) / (2 * Math.PI);
    return middleVelocity * startRamp * integral;
  }
  if (t >= middleEnd) {
    // Raised cosine ramp-down: smooth deceleration from middleVelocity to 0
    const normalized = (t - middleEnd) / endRamp;
    const integral = normalized / 2 - Math.sin(Math.PI * normalized) / (2 * Math.PI);
    return endRampStart + middleVelocity * endRamp * integral;
  }
  // Linear middle: constant velocity for steady, controlled feel
  return startRampHeight + middleVelocity * (t - startRamp);
}

/**
 * Inhale easing: Controlled, organic breath intake
 *
 * Uses raised cosine ramps with linear plateau:
 * - Soft start (25%): Gentle acceleration, overcoming initial resistance
 * - Steady middle (50%): Constant velocity, controlled even intake
 * - Soft end (25%): Gentle deceleration, lungs filling naturally
 */
function easeInhale(t: number): number {
  return controlledBreathCurve(t, 0.25, 0.25);
}

/**
 * Exhale easing: Controlled, relaxing breath release
 *
 * Uses highly asymmetric ramps for immediate visual feedback:
 * - Minimal start (3%): ~0.24s ramp, movement visible almost instantly
 * - Steady middle (67%): Constant velocity, controlled even exhale
 * - Extended soft end (30%): Extra gentle landing for relaxation
 *
 * The tiny start ramp ensures users see expansion begin within the first
 * quarter-second (critical for following breathing cues visually).
 * The long end ramp creates the "letting go" feel.
 */
function easeExhale(t: number): number {
  // Highly asymmetric: minimal start ramp for near-instant visual feedback
  return controlledBreathCurve(t, 0.03, 0.3);
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
