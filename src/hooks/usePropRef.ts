/**
 * usePropRef - Keep prop values in refs for use in animation loops
 *
 * Solves the stale closure problem in useFrame callbacks where props
 * captured at mount time don't update when the prop changes.
 *
 * @example
 * function MyComponent({ enabled = true }) {
 *   const enabledRef = usePropRef(enabled);
 *
 *   useFrame(() => {
 *     // Always reads the current prop value, not stale closure
 *     if (enabledRef.current) {
 *       // animate...
 *     }
 *   });
 * }
 */

import { useRef } from 'react';

/**
 * Returns a ref that always contains the current prop value.
 * Updates synchronously whenever the prop changes.
 */
export function usePropRef<T>(value: T): React.RefObject<T> {
  const ref = useRef<T>(value);

  // Update ref synchronously on every render to capture prop changes
  // This runs before useFrame callbacks in the same frame
  ref.current = value;

  return ref;
}

/**
 * Returns refs for multiple props at once.
 * Useful when several props need to be tracked for animation loops.
 *
 * @example
 * const { distanceRef, intensityRef } = usePropRefs({
 *   distance: 10,
 *   intensity: 0.5,
 * });
 */
export function usePropRefs<T extends Record<string, unknown>>(
  props: T,
): { [K in keyof T as `${string & K}Ref`]: React.RefObject<T[K]> } {
  const refs = useRef<Record<string, React.RefObject<unknown>>>({});

  // Initialize refs for new keys
  for (const key of Object.keys(props)) {
    if (!refs.current[key]) {
      refs.current[key] = { current: props[key] };
    }
  }

  // Update all ref values synchronously
  for (const key of Object.keys(props)) {
    (refs.current[key] as React.MutableRefObject<unknown>).current = props[key];
  }

  // Return refs with proper naming convention
  const result: Record<string, React.RefObject<unknown>> = {};
  for (const key of Object.keys(props)) {
    result[`${key}Ref`] = refs.current[key];
  }

  return result as { [K in keyof T as `${string & K}Ref`]: React.RefObject<T[K]> };
}
