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

/**
 * Current phase type: 0-3
 * 0 = inhale, 1 = hold-in, 2 = exhale, 3 = hold-out
 */
export const phaseType = trait({ value: 0 });

/**
 * Particle orbit radius: 3.5 (exhale) → 1.8 (inhale)
 * Particles spread when exhaling, contract when inhaling
 * Min 1.8 keeps particles safely outside sphere max 1.4
 */
export const orbitRadius = trait({ value: 3.5 });

/**
 * Central sphere scale: 0.6 (exhale) → 1.4 (inhale)
 * Sphere shrinks when exhaling, grows when inhaling (inverse of particles)
 */
export const sphereScale = trait({ value: 0.6 });

/**
 * Crystallization effect: 0-1
 * Increases during hold phases to indicate stillness
 */
export const crystallization = trait({ value: 0 });
