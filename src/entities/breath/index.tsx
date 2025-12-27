/**
 * Breath entity - central state container for all breathing animations
 * Following Koota pattern where entities are composed of traits
 */
import { useEffect } from 'react';
import { useWorld } from 'koota/react';
import { breathPhase, phaseType, orbitRadius, sphereScale, crystallization } from './traits';

/**
 * Component that spawns the breath entity once on mount
 * Must be rendered early in the app initialization
 */
export function BreathEntity() {
	const world = useWorld();

	useEffect(() => {
		// Check if it already exists
		const existing = world.queryFirst(breathPhase);
		if (!existing) {
			world.spawn(
				breathPhase,
				phaseType,
				orbitRadius,
				sphereScale,
				crystallization,
			);
		}
	}, [world]);

	return null; // This component renders nothing
}
