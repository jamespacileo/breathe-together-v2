/**
 * Breath traits - individual components of breath state
 * Following Koota pattern where traits are simple value containers
 *
 * Architecture (Dec 2024):
 * - Direct values from breathCalc (no damping/target intermediates)
 * - 4 traits: breathPhase, phaseType, rawProgress, orbitRadius
 * - All values updated directly each frame for perfect HUD/visual sync
 */
import { trait } from 'koota';

/**
 * Current breath phase: 0 = exhaled, 1 = inhaled
 * Drives all animations and visual properties
 *
 * Consumed by: EarthGlobe, AtmosphericParticles, CameraRig
 */
export const breathPhase = trait({ value: 0 });

/**
 * Current phase type: 0-3
 * 0 = inhale, 1 = hold-in, 2 = exhale, 3 = hold-out
 *
 * Consumed by: HUD (phase name display)
 */
export const phaseType = trait({ value: 0 });

/**
 * Progress within the current phase (0-1)
 * Derived from the centralized breath clock
 *
 * Consumed by: HUD (timer countdown, progress bar)
 */
export const rawProgress = trait({ value: 0 });

/**
 * Particle orbit radius: 6.0 (exhale) → 0.75 (inhale)
 * Particles spread when exhaling, contract when inhaling
 *
 * Consumed by: ParticleSwarm
 */
export const orbitRadius = trait({ value: 3.5 });

/**
 * DEBUG TRAITS - Only spawned in debug/Triplex contexts
 * Allow manual control of breathing animation without affecting production
 */

/**
 * Manual phase override (0-1 slider in Triplex)
 * When enabled, completely overrides UTC-based calculation
 */
export const debugPhaseOverride = trait({
  enabled: false,
  value: 0,
});

/**
 * Time manipulation controls for debug/testing
 * - isPaused: Freeze animation at current manualTime
 * - timeScale: Speed multiplier (0.1 = 10x slower, 5.0 = 5x faster)
 * - manualTime: Frozen time value when paused
 */
export const debugTimeControl = trait({
  isPaused: false,
  timeScale: 1.0,
  manualTime: 0,
});

/**
 * Jump to specific phase instantly
 * targetPhase: 0=Inhale, 1=Hold-in, 2=Exhale, 3=Hold-out, -1=disabled
 * Automatically resets to -1 after applying
 */
export const debugPhaseJump = trait({
  targetPhase: -1,
});
