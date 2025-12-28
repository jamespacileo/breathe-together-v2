/**
 * Experimental breathing calculation using rounded square wave
 *
 * Alternative to phase-based calculation (breathCalc.ts).
 * Creates natural "pauses" at peaks and troughs using arctangent smoothing.
 *
 * Mathematical foundation:
 * - Base: square wave with arctangent smoothing
 * - Formula: f(t) = (2a/π) * arctan(sin(2πtf) / δ)
 * - δ (delta) controls pause sharpness
 * - Lower δ = sharper pauses at peaks/troughs
 * - Higher δ = smoother flowing transitions
 *
 * Benefits over phase-based:
 * - More continuous, less discrete
 * - Natural hold points at breathing peaks
 * - Smoother state transitions
 * - Subjectively feels more natural for some users
 */

import { VISUALS } from '../constants';

export interface BreathState {
  breathPhase: number; // 0-1, position in cycle
  phaseType: number; // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
  rawProgress: number; // 0-1, raw time progress
  easedProgress: number; // 0-1, eased progress
  crystallization: number; // 0-1, holds effect intensity
  sphereScale: number; // visual sphere scale
  orbitRadius: number; // particle orbit radius
}

/**
 * Rounded square wave function
 * Creates smooth square-like wave with tunable pause points
 *
 * @param t - Normalized time (0-1) in current cycle
 * @param delta - Pause sharpness control (lower = sharper)
 *   - 0.01: Very sharp pauses at peaks/troughs
 *   - 0.05: Recommended balance (default)
 *   - 0.1: Smoother, less pronounced pauses
 *   - 0.2: Nearly sinusoidal, minimal holds
 * @param amplitude - Wave height (typically 1.0)
 * @param frequency - Wave cycles per unit time (typically 1.0 for one cycle per period)
 * @returns Wave value from -amplitude to +amplitude
 */
function roundedSquareWave(t: number, delta: number, amplitude: number, frequency: number): number {
  // Clamp to avoid division issues
  const safeDelta = Math.max(delta, 0.001);

  // Base sine wave to feed into arctangent
  const sine = Math.sin(2 * Math.PI * t * frequency);

  // Arctangent smoothing: creates S-curve that looks like square wave
  // When |sin(x)| is large: atan(sin/δ) ≈ ±π/2 (saturates at ±amplitude)
  // When |sin(x)| is small: atan(sin/δ) ≈ sin/δ (linear)
  const wave = ((2 * amplitude) / Math.PI) * Math.atan(sine / safeDelta);

  return wave;
}

export interface RoundedWaveConfig {
  /** Pause sharpness (0.01-0.2, lower = sharper pauses) */
  delta: number;

  /** Wave amplitude (keep at 1.0 for standard breathing) */
  amplitude: number;

  /** Total cycle duration in seconds (typically 16s for box breathing) */
  cycleSeconds: number;
}

export const DEFAULT_ROUNDED_WAVE_CONFIG: RoundedWaveConfig = {
  delta: 0.05, // Balanced sharpness - natural feeling pauses
  amplitude: 1.0, // Full range
  cycleSeconds: 16, // Standard box breathing cycle
};

/**
 * Calculate breathing state using rounded square wave
 *
 * Generates same BreathState interface as phase-based calculation,
 * allowing drop-in replacement in breath system.
 *
 * @param elapsedTime - Time in seconds (from Date.now() / 1000)
 * @param config - Wave configuration (uses defaults if not provided)
 * @returns BreathState with all necessary visual parameters
 */
export function calculateBreathStateRounded(
  elapsedTime: number,
  config: RoundedWaveConfig = DEFAULT_ROUNDED_WAVE_CONFIG,
): BreathState {
  const { delta, amplitude, cycleSeconds } = config;

  // Normalize time to 0-1 over complete breathing cycle
  const t = (elapsedTime % cycleSeconds) / cycleSeconds;

  // Frequency: how many wave cycles in this period (we want 1 complete cycle)
  const frequency = 1.0 / cycleSeconds;

  // Calculate wave position (-amplitude to +amplitude)
  const wave = roundedSquareWave(t, delta, amplitude, frequency);

  // Map wave to breathPhase (0-1)
  const breathPhase = (wave / amplitude + 1) / 2;

  // Detect current phase type based on wave position
  // We define "holds" as times when velocity is low (near peaks/troughs)
  const holdThreshold = 0.7 * amplitude;
  let phaseType: number;
  if (wave > holdThreshold) {
    phaseType = 1; // hold-in (inhale peak)
  } else if (wave < -holdThreshold) {
    phaseType = 3; // hold-out (exhale peak)
  } else if (wave > 0) {
    phaseType = 0; // inhale (rising)
  } else {
    phaseType = 2; // exhale (falling)
  }

  // Crystallization: intensity of pause effect
  // High when velocity approaches zero (near peaks)
  // Low during active transitions
  const cosineVelocity = Math.cos(2 * Math.PI * t * frequency);
  const crystallization = 1 - Math.abs(cosineVelocity);

  // Visual parameter scaling (same as phase-based system)
  const sphereScale =
    VISUALS.SPHERE_SCALE_MIN + breathPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);

  const orbitRadius =
    VISUALS.PARTICLE_ORBIT_MAX -
    breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

  return {
    breathPhase,
    phaseType,
    rawProgress: t,
    easedProgress: breathPhase, // For rounded wave, eased = breathPhase
    crystallization,
    sphereScale,
    orbitRadius,
  };
}
