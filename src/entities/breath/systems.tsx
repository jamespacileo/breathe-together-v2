/**
 * Breath system - updates breath entity every frame
 * Uses UTC time for global synchronization
 */
import type { World } from 'koota';
import { getBreathEntity } from './index';
import { breathPhase, phaseType, orbitRadius, sphereScale, crystallization } from './traits';
import { calculateBreathState } from '../../lib/breathCalc';

/**
 * Main breath system - runs every frame to update breath state
 * Uses Date.now() for UTC-based synchronization (not local elapsed time)
 *
 * This ensures all users worldwide see the same breathing cycle
 */
export function breathSystem(world: World, _delta: number) {
	const breathEntity = getBreathEntity(world);
	if (!breathEntity) {
		// Entity not spawned yet, skip this frame
		return;
	}

	// Use Date.now() for true UTC sync
	// All users in all timezones see the same cycle based on absolute time
	const elapsed = Date.now() / 1000;
	const state = calculateBreathState(elapsed);

	// Update breath entity traits with new state
	breathEntity.set(breathPhase, { value: state.breathPhase });
	breathEntity.set(phaseType, { value: state.phaseType });
	breathEntity.set(orbitRadius, { value: state.orbitRadius });
	breathEntity.set(sphereScale, { value: state.sphereScale });
	breathEntity.set(crystallization, { value: state.crystallization });
}
