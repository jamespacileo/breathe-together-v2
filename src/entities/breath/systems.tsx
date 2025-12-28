/**
 * Breath system - updates breath entity every frame
 * Uses UTC time for global synchronization
 */
import type { World } from 'koota';
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
import { calculateBreathState } from '../../lib/breathCalc';
import { easing } from 'maath';

/**
 * Damping configuration for breath traits
 */
const DAMP_CONFIG = [
	{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.1 },
	{ trait: orbitRadius, targetTrait: targetOrbitRadius, speed: 0.4 },
	{ trait: sphereScale, targetTrait: targetSphereScale, speed: 0.25 },
	{ trait: crystallization, targetTrait: targetCrystallization, speed: 0.5 },
] as const;

/**
 * Main breath system - runs every frame to update breath state
 * Uses Date.now() for UTC-based synchronization (not local elapsed time)
 *
 * This ensures all users worldwide see the same breathing cycle
 */
export function breathSystem(world: World, delta: number) {
	const breathEntity = world.queryFirst(breathPhase);

	if (!breathEntity) {
		// Entity not spawned yet, skip this frame
		return;
	}

	// Use Date.now() for true UTC sync
	const elapsed = Date.now() / 1000;
	const state = calculateBreathState(elapsed);

	// 1. Update discrete traits and targets
	breathEntity.set(targetBreathPhase, { value: state.breathPhase });
	breathEntity.set(phaseType, { value: state.phaseType });
	breathEntity.set(targetOrbitRadius, { value: state.orbitRadius });
	breathEntity.set(targetSphereScale, { value: state.sphereScale });
	breathEntity.set(targetCrystallization, { value: state.crystallization });

	// 2. Damp current values toward targets using maath/easing
	// We use a temporary object to avoid replacing the trait object with entity.set()
	// This allows easing.damp to maintain velocity state internally
	DAMP_CONFIG.forEach(({ trait, targetTrait, speed }) => {
		const current = breathEntity.get(trait);
		const target = breathEntity.get(targetTrait);
		if (current && target) {
			// Create temp object for damping to maintain velocity state
			const temp = { value: current.value };
			easing.damp(temp, 'value', target.value, speed, delta);
			// Update trait with damped value
			breathEntity.set(trait, { value: temp.value });
		}
	});
}
