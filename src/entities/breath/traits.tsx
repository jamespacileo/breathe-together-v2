/**
 * Breath traits - individual components of breath state
 * Following Koota pattern where traits are simple value containers
 */
import { trait } from 'koota';

/**
 * Current breath phase: 0 = exhaled, 1 = inhaled
 * Drives all animations and visual properties
 */
export const breathPhase = trait({ value: 0 });
export const targetBreathPhase = trait({ value: 0 });

/**
 * Current phase type: 0-3
 * 0 = inhale, 1 = hold-in, 2 = exhale, 3 = hold-out
 */
export const phaseType = trait({ value: 0 });

/**
 * Particle orbit radius: 3.5 (exhale) → 1.8 (inhale)
 * Particles spread when exhaling, contract when inhaling
 */
export const orbitRadius = trait({ value: 3.5 });
export const targetOrbitRadius = trait({ value: 3.5 });

/**
 * Central sphere scale: 0.6 (exhale) → 1.4 (inhale)
 * Sphere shrinks when exhaling, grows when inhaling
 */
export const sphereScale = trait({ value: 0.6 });
export const targetSphereScale = trait({ value: 0.6 });

/**
 * Crystallization effect: 0-1
 * Increases during hold phases to indicate stillness
 */
export const crystallization = trait({ value: 0 });
export const targetCrystallization = trait({ value: 0 });

/**
 * Breath curve configuration
 * Stores which breathing algorithm to use (phase-based or rounded-wave)
 * Updated by BreathEntity when context changes
 */
export const breathCurveConfig = trait({
  curveType: 'phase-based' as 'phase-based' | 'rounded-wave',
  waveDelta: 0.05,
});

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
