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
 * Main breath system - runs every frame to update breath state
 * Uses Date.now() for UTC-based synchronization (not local elapsed time)
 *
 * This ensures all users worldwide see the same breathing cycle
 */
export function breathSystem(world: World, delta: number) {
	const breathEntity = world.queryFirst(
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
	// This provides smooth, frame-rate independent transitions

	// Phase damping
	const phaseTemp = { value: breathEntity.get(breathPhase)?.value ?? 0 };
	const targetPhaseValue = breathEntity.get(targetBreathPhase)?.value ?? 0;
	easing.damp(phaseTemp, 'value', targetPhaseValue, 0.1, delta);
	breathEntity.set(breathPhase, { value: phaseTemp.value });

	// Orbit Radius damping
	const orbitTemp = { value: breathEntity.get(orbitRadius)?.value ?? 3.5 };
	const targetOrbitValue = breathEntity.get(targetOrbitRadius)?.value ?? 3.5;
	easing.damp(orbitTemp, 'value', targetOrbitValue, 0.4, delta);
	breathEntity.set(orbitRadius, { value: orbitTemp.value });

	// Sphere Scale damping (The "Meaty" feel)
	const scaleTemp = { value: breathEntity.get(sphereScale)?.value ?? 0.6 };
	const targetScaleValue = breathEntity.get(targetSphereScale)?.value ?? 0.6;
	easing.damp(scaleTemp, 'value', targetScaleValue, 0.25, delta);
	breathEntity.set(sphereScale, { value: scaleTemp.value });

	// Crystallization damping
	const crystTemp = { value: breathEntity.get(crystallization)?.value ?? 0 };
	const targetCrystValue = breathEntity.get(targetCrystallization)?.value ?? 0;
	easing.damp(crystTemp, 'value', targetCrystValue, 0.5, delta);
	breathEntity.set(crystallization, { value: crystTemp.value });
}
