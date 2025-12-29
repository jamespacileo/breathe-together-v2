/**
 * Breath Controller Context
 *
 * Provides production-safe breathing controls (pause, speed).
 * For debug-only features (manual phase, phase jump), use BreathDebugContext instead.
 *
 * ## Precedence Rule
 *
 * If both BreathDebugContext and BreathControllerContext are present (e.g., in debug scenes),
 * BreathDebugContext takes priority:
 *
 * ```
 * Priority: debugPhaseOverride > debugPhaseJump > debugTimeControl > BreathController > UTC
 * ```
 *
 * Debug context always wins. BreathController is silently ignored in debug scenes.
 */

import { createContext, type ReactNode, useContext } from 'react';

export interface BreathControllerConfig {
  /**
   * Pause the breathing animation.
   */
  isPaused?: boolean;

  /**
   * Time scale multiplier for animation speed.
   * 1.0 = normal, 2.0 = double speed, 0.5 = half speed
   */
  timeScale?: number;
}

export const BreathControllerContext = createContext<BreathControllerConfig | null>(null);

/**
 * Hook to read breath controller configuration.
 *
 * Returns null if no BreathController is active.
 */
export function useBreathController(): BreathControllerConfig | null {
  return useContext(BreathControllerContext);
}

/**
 * Provider for breath controller context.
 *
 * Wraps children with breathing control configuration.
 */
export function BreathControllerProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: BreathControllerConfig | null;
}) {
  return (
    <BreathControllerContext.Provider value={config}>{children}</BreathControllerContext.Provider>
  );
}
