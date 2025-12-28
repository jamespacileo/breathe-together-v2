/**
 * Breath Curve Context
 *
 * Provides breathing curve selection and configuration to the breath system.
 * Allows runtime switching between different breathing algorithms.
 *
 * Usage:
 * ```tsx
 * <BreathCurveProvider config={{ curveType: 'rounded-wave', waveDelta: 0.05 }}>
 *   <YourScene />
 * </BreathCurveProvider>
 * ```
 */

import { createContext, useContext, ReactNode } from 'react';

export type CurveType = 'phase-based' | 'rounded-wave';

export interface BreathCurveConfig {
	/** Which breathing algorithm to use */
	curveType: CurveType;

	/** Rounded wave pause sharpness (only affects rounded-wave type) */
	waveDelta?: number;
}

/**
 * Context for breath curve configuration
 * Defaults to phase-based if not provided
 */
const BreathCurveContext = createContext<BreathCurveConfig>({
	curveType: 'phase-based',
});

/**
 * Hook to access breath curve configuration
 * Returns phase-based config as fallback
 */
export function useBreathCurveConfig(): BreathCurveConfig {
	return useContext(BreathCurveContext);
}

/**
 * Provider component for breath curve configuration
 * Wrap scenes with this to enable curve type switching
 */
export function BreathCurveProvider({
	children,
	config,
}: {
	children: ReactNode;
	config: BreathCurveConfig;
}) {
	return (
		<BreathCurveContext.Provider value={config}>
			{children}
		</BreathCurveContext.Provider>
	);
}
