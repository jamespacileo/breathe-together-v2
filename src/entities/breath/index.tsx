/**
 * Breath entity - central state container for all breathing animations
 * Following Koota pattern where entities are composed of traits
 *
 * Also supports optional debug traits for manual breathing control in Triplex
 */
import { useEffect } from 'react';
import { useWorld } from 'koota/react';
import {
	breathPhase,
	targetBreathPhase,
	phaseType,
	orbitRadius,
	targetOrbitRadius,
	sphereScale,
	targetSphereScale,
	crystallization,
	targetCrystallization,
	breathCurveConfig,
	debugPhaseOverride,
	debugTimeControl,
	debugPhaseJump,
} from './traits';
import { useBreathCurveConfig } from '../../contexts/BreathCurveContext';
import { useBreathDebug } from '../../contexts/breathDebug';

/**
 * Component that spawns the breath entity once on mount
 * Must be rendered early in the app initialization
 * Also reads breath curve configuration from context
 */
export function BreathEntity() {
	const world = useWorld();
	const curveConfig = useBreathCurveConfig();
	const debugConfig = useBreathDebug();

	useEffect(() => {
		// Check if it already exists
		let entity = world.queryFirst(breathPhase);

		if (!entity) {
			entity = world.spawn(
				breathPhase,
				targetBreathPhase,
				phaseType,
				orbitRadius,
				targetOrbitRadius,
				sphereScale,
				targetSphereScale,
				crystallization,
				targetCrystallization,
				breathCurveConfig
			);
		} else {
			// Ensure all new traits are added to existing entity (for hot-reloading/updates)
			if (!entity.has(targetBreathPhase)) entity.add(targetBreathPhase);
			if (!entity.has(targetOrbitRadius)) entity.add(targetOrbitRadius);
			if (!entity.has(targetSphereScale)) entity.add(targetSphereScale);
			if (!entity.has(targetCrystallization)) entity.add(targetCrystallization);
			if (!entity.has(breathCurveConfig)) entity.add(breathCurveConfig);
		}

		// Update curve config trait from context
		if (entity) {
			entity.set(breathCurveConfig, {
				curveType: curveConfig.curveType,
				waveDelta: curveConfig.waveDelta ?? 0.05,
			});
		}

		// ============================================================
		// DEBUG TRAIT MANAGEMENT
		// Add/update debug traits when debug context is present
		// ============================================================
		if (debugConfig) {
			// Add debug traits if they don't exist
			if (!entity.has(debugPhaseOverride)) entity.add(debugPhaseOverride);
			if (!entity.has(debugTimeControl)) entity.add(debugTimeControl);
			if (!entity.has(debugPhaseJump)) entity.add(debugPhaseJump);

			// Update debug traits from context
			if (debugConfig.manualPhaseOverride !== undefined) {
				entity.set(debugPhaseOverride, {
					enabled: true,
					value: Math.max(0, Math.min(1, debugConfig.manualPhaseOverride)),
				});
			}

			if (
				debugConfig.isPaused !== undefined ||
				debugConfig.timeScale !== undefined
			) {
				const current = entity.get(debugTimeControl) || {
					isPaused: false,
					timeScale: 1.0,
					manualTime: 0,
				};
				entity.set(debugTimeControl, {
					isPaused: debugConfig.isPaused ?? current.isPaused,
					timeScale: debugConfig.timeScale ?? current.timeScale,
					manualTime: current.manualTime,
				});
			}

			if (debugConfig.jumpToPhase !== undefined) {
				entity.set(debugPhaseJump, {
					targetPhase: debugConfig.jumpToPhase,
				});
			}
		}
	}, [world, curveConfig.curveType, curveConfig.waveDelta, debugConfig]);

	return null; // This component renders nothing
}
