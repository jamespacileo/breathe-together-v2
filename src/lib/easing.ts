/**
 * Shared Easing Functions for breathe-together-v2
 *
 * Centralized easing functions with immediate visual feedback.
 * Both inhale and exhale use sin(t × π/2) for instant visible movement
 * that syncs with UI phase transitions.
 *
 * The asymmetry comes from phase DURATIONS (4s inhale, 8s exhale),
 * not from different easing shapes.
 *
 * Used by:
 * - src/lib/breathCalc.ts (core breathing state)
 * - src/components/InspirationalText.tsx (text fade in/out)
 */

/**
 * Clamp a value to the 0-1 range
 *
 * Common utility for normalizing progress values in easing functions.
 *
 * @param value The value to clamp
 * @returns Value clamped between 0 and 1
 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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
export function controlledBreathCurve(t: number, startRamp: number, endRamp: number): number {
  // Clamp input
  t = clamp01(t);

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
 * Inhale easing: Fast intake with smooth landing
 *
 * Uses sin(t × π/2) for immediate visual feedback:
 * - Fast start: High initial velocity syncs with UI phase transition
 * - Smooth landing: Natural deceleration as lungs fill
 *
 * Derivative at t=0: π/2 ≈ 1.57 (fast - visible immediately)
 * Derivative at t=1: 0 (smooth stop)
 *
 * @param t Progress 0-1
 * @returns Eased value 0-1
 */
export function easeInhale(t: number): number {
  return Math.sin(clamp01(t) * Math.PI * 0.5);
}

/**
 * Inhale easing (text variant): Delayed reveal that mirrors exhale timing
 *
 * Uses asymmetric ramps - the mirror of exhale:
 * - Extended soft start (30%): Text stays invisible longer
 * - Steady middle (50%): Controlled reveal catches up
 * - Quick soft end (20%): Arrives at full visibility
 *
 * This mirrors how exhale fades sooner - inhale reveals later,
 * creating the sense of words emerging with the breath.
 *
 * @param t Progress 0-1
 * @returns Eased value 0-1
 */
export function easeInhaleText(t: number): number {
  return controlledBreathCurve(t, 0.3, 0.2);
}

/**
 * Exhale easing: Immediate release with smooth completion
 *
 * Uses sin(t × π/2) for immediate visual feedback:
 * - Fast start: Visible movement the instant exhale begins
 * - Smooth landing: Gentle deceleration as exhale completes
 *
 * Derivative at t=0: π/2 ≈ 1.57 (fast - syncs with UI phase change)
 * Derivative at t=1: 0 (smooth stop)
 *
 * The "slow controlled exhale" feel comes from the longer duration
 * (8s exhale vs 4s inhale), not from slow starting velocity.
 *
 * @param t Progress 0-1
 * @returns Eased value 0-1
 */
export function easeExhale(t: number): number {
  return Math.sin(clamp01(t) * Math.PI * 0.5);
}
