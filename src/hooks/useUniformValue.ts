import { useEffect } from 'react';

/**
 * Minimal shape of a uniform-like object with a mutable `.value`.
 */
export interface UniformLike<T> {
  value: T;
}

/**
 * Keep a uniform-like object's `.value` in sync with a React value.
 *
 * Works with Three.js `Uniform`s and TSL uniform objects (which may not be
 * strongly typed as writable in TypeScript).
 *
 * @param uniformRef - Uniform-like object whose `.value` should be updated
 * @param value - New value to assign
 */
export function useUniformValue<T>(uniformRef: UniformLike<T> | null | undefined, value: T): void;
export function useUniformValue(uniformRef: unknown, value: unknown): void;
export function useUniformValue(uniformRef: unknown, value: unknown): void {
  useEffect(() => {
    if (!uniformRef || typeof uniformRef !== 'object') return;
    if (!('value' in uniformRef)) return;

    (uniformRef as { value: unknown }).value = value;
  }, [uniformRef, value]);
}
