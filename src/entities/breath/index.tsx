/**
 * Breath entity - central state container for all breathing animations
 * Following Koota pattern where entities are composed of traits
 */
import { useEffect } from 'react';
import { useWorld } from 'koota/react';
import { breathPhase, phaseType, orbitRadius, sphereScale, crystallization } from './traits';

// Store the breath entity globally so it can be accessed from systems
let BREATH_ENTITY_REF: any = null;

/**
 * Get the breath entity from the world
 * Returns null if the entity hasn't been spawned yet
 */
export function getBreathEntity(_world: any) {
	return BREATH_ENTITY_REF;
}

/**
 * Component that spawns the breath entity once on mount
 * Must be rendered early in the app initialization
 */
export function BreathEntity() {
	const world = useWorld();

	useEffect(() => {
		// Only spawn if it doesn't exist yet
		if (BREATH_ENTITY_REF === null) {
			const entity = world.spawn(
				breathPhase,
				phaseType,
				orbitRadius,
				sphereScale,
				crystallization,
			);
			BREATH_ENTITY_REF = entity;
		}

		// No cleanup - the entity should persist for the app lifetime
	}, [world]);

	return null; // This component renders nothing
}
