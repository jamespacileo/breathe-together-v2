/**
 * TSL (Three.js Shading Language) Type Helpers
 *
 * TSL doesn't have complete TypeScript declarations yet. This module provides
 * helper types and utilities to reduce the need for biome-ignore comments.
 *
 * @see https://threejs.org/docs/pages/TSL.html
 * @see https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
 */

/**
 * Generic TSL node type - accepts any TSL node structure.
 * TSL nodes have complex nested types that TypeScript can't fully represent.
 */
// biome-ignore lint/suspicious/noExplicitAny: TSL nodes have complex nested types that vary by node type
export type TSLNode = { value?: unknown } & Record<string, any>;

/**
 * Type for TSL uniform nodes with a settable value property.
 *
 * TSL uniforms have a `.value` property that can be updated at runtime,
 * but the TypeScript types don't expose this correctly.
 *
 * Usage:
 * ```typescript
 * const uBreathPhase = uniform(float(0)) as TSLUniform<number>;
 * uBreathPhase.value = 0.5; // Now type-safe!
 * ```
 */
export interface TSLUniform<T = number> extends TSLNode {
  value: T;
}

/**
 * Helper to set TSL uniform value with proper typing.
 *
 * Avoids the need for `(uniform as any).value = x` pattern.
 *
 * Usage:
 * ```typescript
 * const uBreathPhase = uniform(float(0));
 * setUniformValue(uBreathPhase, 0.5);
 * ```
 */
export function setUniformValue<T>(uniformNode: TSLNode, value: T): void {
  // TSL uniforms have a .value property at runtime that TypeScript doesn't know about
  (uniformNode as TSLUniform<T>).value = value;
}

/**
 * Helper to get TSL uniform value with proper typing.
 *
 * Usage:
 * ```typescript
 * const uBreathPhase = uniform(float(0));
 * const phase = getUniformValue<number>(uBreathPhase);
 * ```
 */
export function getUniformValue<T>(uniformNode: TSLNode): T {
  return (uniformNode as TSLUniform<T>).value;
}

/**
 * Cast a TSL uniform to a typed uniform.
 *
 * Usage:
 * ```typescript
 * const uBreathPhase = asTSLUniform<number>(uniform(float(0)));
 * uBreathPhase.value = 0.5; // Type-safe
 * ```
 */
export function asTSLUniform<T>(uniformNode: TSLNode): TSLUniform<T> {
  return uniformNode as TSLUniform<T>;
}
