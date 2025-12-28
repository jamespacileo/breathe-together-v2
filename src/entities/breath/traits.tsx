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
