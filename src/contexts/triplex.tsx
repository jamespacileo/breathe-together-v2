/**
 * Triplex Configuration Context
 *
 * Provides visual quality and performance tuning options when running in Triplex editor.
 * Returns null in production builds (when not inside Triplex provider).
 * Entities should provide fallback defaults when context is unavailable.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { SphereConfig } from '../constants';

export interface TriplexConfigContext {
	particleScale: number;
	qualityPreset: 'low' | 'medium' | 'high';
	sphereConfig: SphereConfig;
}

export const TriplexConfig = createContext<TriplexConfigContext | null>(null);

/**
 * Hook to access Triplex configuration from within entities
 *
 * @returns Triplex config object if running in Triplex, null in production
 *
 * @example
 * ```tsx
 * const triplexConfig = useTriplexConfig();
 * const particleCount = Math.round(defaultCount * (triplexConfig?.particleScale ?? 1.0));
 * ```
 */
export function useTriplexConfig(): TriplexConfigContext | null {
	return useContext(TriplexConfig);
}
