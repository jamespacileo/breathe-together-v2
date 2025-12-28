/**
 * Breath Debug Context
 * Provides debug configuration to BreathEntity for Triplex scenes
 * Allows manual control of breathing animation without production code pollution
 */

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Debug configuration interface
 * Controls manual breathing animation in Triplex
 */
export interface BreathDebugConfig {
	// Manual Controls
	/**
	 * Manual phase override (0-1 slider)
	 * When enabled via enableManualControl, completely overrides UTC-based calculation
	 */
	manualPhaseOverride?: number;

	/**
	 * Freeze breathing animation at current point
	 */
	isPaused?: boolean;

	/**
	 * Time scale multiplier for animation speed
	 * 0.1 = 10x slower, 5.0 = 5x faster
	 */
	timeScale?: number;

	/**
	 * Jump to specific phase instantly
	 * 0=Inhale, 1=Hold-in, 2=Exhale, 3=Hold-out
	 */
	jumpToPhase?: 0 | 1 | 2 | 3;

	// Visual Debug
	/**
	 * Show orbit radius bounds (min/max wireframes)
	 */
	showOrbitBounds?: boolean;

	/**
	 * Show phase transition markers (colored rings)
	 */
	showPhaseMarkers?: boolean;

	/**
	 * Show real-time trait values overlay
	 */
	showTraitValues?: boolean;
}

export const BreathDebugContext = createContext<BreathDebugConfig | null>(null);

/**
 * Hook to access breath debug configuration
 * Returns null if not in debug context (production)
 */
export function useBreathDebug(): BreathDebugConfig | null {
	return useContext(BreathDebugContext);
}

/**
 * Provider component for breath debug context
 * Wraps scene with debug configuration
 */
export function BreathDebugProvider({
	children,
	config,
}: {
	children: ReactNode;
	config: BreathDebugConfig | null;
}) {
	return (
		<BreathDebugContext.Provider value={config}>
			{children}
		</BreathDebugContext.Provider>
	);
}
