/**
 * Breath entity - central state container for all breathing animations
 * Following Koota pattern where entities are composed of traits
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
} from './traits';

/**
 * Component that spawns the breath entity once on mount
 * Must be rendered early in the app initialization
 */
export function BreathEntity() {
	const world = useWorld();

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
				targetCrystallization
			);
		} else {
			// Ensure all new traits are added to existing entity (for hot-reloading/updates)
			if (!entity.has(targetBreathPhase)) entity.add(targetBreathPhase);
			if (!entity.has(targetOrbitRadius)) entity.add(targetOrbitRadius);
			if (!entity.has(targetSphereScale)) entity.add(targetSphereScale);
			if (!entity.has(targetCrystallization)) entity.add(targetCrystallization);
		}
	}, [world]);

	return null; // This component renders nothing
}
