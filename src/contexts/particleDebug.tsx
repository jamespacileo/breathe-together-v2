/**
 * Particle Debug Context
 *
 * Optional debug configuration for particle visual overrides.
 * Used in debug scenes (e.g., breathing.debug.scene.tsx) to temporarily override
 * particle visual configurations without affecting production code.
 *
 * Returns null in production (no debug pollution).
 *
 * Follows the same pattern as BreathDebugContext for consistency.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { ParticleVisualConfig } from '../entities/particle/config';

/**
 * Particle debug configuration
 *
 * All properties are optional. When undefined, production defaults are used.
 * Set to null (entire context) to disable debug mode.
 */
export interface ParticleDebugConfig {
  /**
   * Debug override for user particle visual configuration
   * When defined, overrides DEFAULT_USER_PARTICLE_CONFIG in ParticleRenderer
   */
  userConfig?: ParticleVisualConfig;

  /**
   * Debug override for filler particle visual configuration
   * When defined, overrides DEFAULT_FILLER_PARTICLE_CONFIG in ParticleRenderer
   */
  fillerConfig?: ParticleVisualConfig;

  /**
   * Show particle type visualization overlay
   * Renders wireframe indicators for user vs filler particle orbits
   */
  showParticleTypes?: boolean;

  /**
   * Show particle statistics overlay
   * Displays real-time counts: active/total users, active/total fillers
   */
  showParticleStats?: boolean;
}

const ParticleDebugContext = createContext<ParticleDebugConfig | null>(null);

/**
 * Hook to access particle debug configuration
 *
 * Returns null in production (no debug context configured).
 * Safe to call unconditionally; simply returns null if debug is not enabled.
 *
 * @example
 * ```tsx
 * const debug = useParticleDebug();
 * const activeUserConfig = debug?.userConfig ?? DEFAULT_USER_PARTICLE_CONFIG;
 * ```
 */
export function useParticleDebug(): ParticleDebugConfig | null {
  return useContext(ParticleDebugContext);
}

/**
 * Provider for particle debug configuration
 *
 * Wraps debug scenes with particle configuration overrides.
 * Does not affect production code (ParticleRenderer checks for undefined configs).
 *
 * @example
 * ```tsx
 * <ParticleDebugProvider config={particleDebugConfig}>
 *   <BreathingLevel />
 *   <ParticleDebugVisuals />
 * </ParticleDebugProvider>
 * ```
 */
export function ParticleDebugProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: ParticleDebugConfig | null;
}) {
  return (
    <ParticleDebugContext.Provider value={config}>
      {children}
    </ParticleDebugContext.Provider>
  );
}
