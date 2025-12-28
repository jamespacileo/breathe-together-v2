/**
 * Performance monitoring hook for adaptive quality scaling
 *
 * Uses React Three Fiber's built-in performance API to track FPS
 * and recommend quality levels.
 *
 * The R3F performance API normalizes FPS to 0.5-1.0 range:
 * - 0.5 = ~30 FPS (60 FPS monitor)
 * - 1.0 = ~60 FPS (60 FPS monitor)
 * - Below 0.5 = throttling
 * - Above 1.0 = exceeding target FPS (headroom)
 *
 * Quality levels are determined via hysteresis to prevent
 * rapid thrashing between levels during frame rate fluctuations.
 */

import { useThree } from '@react-three/fiber';
import { useState, useEffect, useRef } from 'react';

export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * Performance state returned by the monitor hook
 */
export interface PerformanceState {
	/** R3F performance value (0.5-1.0 normalized to monitor refresh rate) */
	current: number;

	/** Estimated current FPS (multiply current by 60 for typical 60Hz) */
	averageFPS: number;

	/** Recommended quality level based on performance */
	qualityLevel: QualityLevel;

	/** Number of particles to render (based on quality level) */
	recommendedParticleCount: number;

	/** Whether app is actively throttling to maintain framerate */
	isThrottling: boolean;
}

/**
 * Configuration for performance monitoring thresholds
 */
const THRESHOLDS = {
	/** Drop to 'low' if performance.current drops below this */
	LOW: 0.65,

	/** Climb to 'high' if performance.current exceeds this */
	HIGH: 0.85,

	/** Hysteresis time (ms) - prevent quality changes more frequently than this */
	HYSTERESIS_MS: 3000,
};

/**
 * Recommended particle counts per quality level
 * These provide visual variety while respecting performance constraints
 */
const PARTICLE_COUNTS = {
	low: 100,      // 33% reduction
	medium: 200,   // Baseline
	high: 300,     // 50% increase
};

/**
 * Hook to monitor performance and recommend quality levels
 *
 * Returns current performance state and automatically scales recommendation
 * based on frame rate stability.
 *
 * Usage:
 * ```tsx
 * const perf = usePerformanceMonitor();
 * const particleCount = perf.recommendedParticleCount;
 * const qualityLevel = perf.qualityLevel;
 * ```
 *
 * @returns PerformanceState with current metrics and recommendations
 */
export function usePerformanceMonitor(): PerformanceState {
	const performance = useThree((state) => state.performance);
	const [qualityLevel, setQualityLevel] = useState<QualityLevel>('medium');
	const lastChangeTime = useRef(Date.now());

	// Monitor performance and adjust quality level with hysteresis
	useEffect(() => {
		const timeSinceChange = Date.now() - lastChangeTime.current;

		// Only consider changes if enough time has passed (hysteresis)
		if (timeSinceChange < THRESHOLDS.HYSTERESIS_MS) {
			return;
		}

		const perf = performance.current;
		let newLevel: QualityLevel = qualityLevel;

		// Determine new quality level based on thresholds
		if (perf < THRESHOLDS.LOW && qualityLevel !== 'low') {
			newLevel = 'low';
		} else if (perf > THRESHOLDS.HIGH && qualityLevel !== 'high') {
			newLevel = 'high';
		} else if (
			perf >= THRESHOLDS.LOW &&
			perf <= THRESHOLDS.HIGH &&
			qualityLevel !== 'medium'
		) {
			newLevel = 'medium';
		}

		// Update if changed
		if (newLevel !== qualityLevel) {
			setQualityLevel(newLevel);
			lastChangeTime.current = Date.now();
		}
	}, [performance.current, qualityLevel]);

	// Determine particle count from quality level
	const recommendedParticleCount =
		PARTICLE_COUNTS[qualityLevel as keyof typeof PARTICLE_COUNTS];

	return {
		current: performance.current,
		averageFPS: Math.round(60 * performance.current),
		qualityLevel,
		recommendedParticleCount,
		isThrottling: performance.current < 0.8,
	};
}
