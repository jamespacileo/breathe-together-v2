import type { Entity } from 'koota';
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

/**
 * Particle Swarm configuration trait
 */
export const ParticleSwarmTrait = trait({
  /** @min 100 @max 1000 @step 50 */
  count: 300,
  /** @min 0.01 @max 0.2 @step 0.01 */
  minScale: 0.05,
  /** @min 0.05 @max 0.5 @step 0.01 */
  maxScale: 0.1,
});

/**
 * Modular Behavior Traits
 */

export const OrbitBehaviorTrait = trait({
  /** @min 0.1 @max 2.0 @step 0.1 */
  minRadius: 0.8,
  /** @min 2.0 @max 10.0 @step 0.1 */
  maxRadius: 6.0,
  /** @min 0.1 @max 2.0 @step 0.1 */
  spread: 1.0,
});

export const WindBehaviorTrait = trait({
  /** @min 0 @max 5 @step 0.1 */
  strength: 1.0,
});

export const JitterBehaviorTrait = trait({
  /** @min 0 @max 5 @step 0.1 */
  strength: 1.0,
});

export const RepulsionBehaviorTrait = trait({
  /** @min 0 @max 5 @step 0.1 */
  strength: 1.0,
  /** @min -1 @max 2 @step 0.1 */
  radiusOffset: 0.5,
});

/**
 * Link a particle to its parent swarm
 */
export const parentSwarm = trait({ value: null as Entity | null });

// (No active flag; all spawned particles render)
