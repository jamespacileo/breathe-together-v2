import { trait } from 'koota';

/**
 * Particle traits for individual presence particles
 */

// Position and Velocity are already in shared/traits.tsx, but we might want specific ones
// or just use the shared ones. Let's use shared ones where possible.

/**
 * The base/rest position of the particle in the orbit
 */
export const restPosition = trait({ x: 0, y: 0, z: 0 });

/**
 * The current offset from the rest position (due to wind, noise, etc.)
 */
export const offset = trait({ x: 0, y: 0, z: 0 });

/**
 * Particle color
 */
export const color = trait({ r: 1, g: 1, b: 1 });

/**
 * Target color for smooth transitions
 */
export const targetColor = trait({ r: 1, g: 1, b: 1 });

/**
 * Particle size/scale
 */
export const size = trait({ value: 1 });

/**
 * Which user this particle belongs to
 */
export const ownerId = trait({ value: '' });

/**
 * Random seed for noise/variation
 */
export const seed = trait({ value: 0 });

/**
 * Stable index for instanced rendering
 */
export const index = trait({ value: 0 });

// (No active flag; all spawned particles render)
