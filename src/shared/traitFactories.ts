import { trait } from 'koota';

/**
 * Factory functions for creating common trait patterns.
 * Reduces duplication across entity trait definitions.
 */

/**
 * Creates a 3D vector trait (x, y, z)
 */
export const createVector3Trait = (defaults = { x: 0, y: 0, z: 0 }) => trait(defaults);

/**
 * Creates a simple value trait with a single number/generic value
 */
export const createValueTrait = <T extends string | number | bigint | boolean | object>(
  defaultValue: T,
) => trait({ value: defaultValue });

/**
 * Creates an RGB color trait (r, g, b)
 */
export const createColorTrait = (defaults = { r: 0, g: 0, b: 0 }) => trait(defaults);
