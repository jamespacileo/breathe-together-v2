import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';

/**
 * Easing functions for different breath energies
 */
function easeOutQuart(t: number): number {
	return 1 - Math.pow(1 - t, 4);
}

function easeInSine(t: number): number {
	return 1 - Math.cos((t * Math.PI) / 2);
}

function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Breath state interface
 * Breath Phase Convention:
 * - breathPhase: 0 = fully exhaled (particles expanded, orb contracted)
 *                1 = fully inhaled (particles contracted, orb expanded)
 */
export interface BreathState {
	breathPhase: number; // 0-1 (Target)
	phaseType: number; // 0-3: inhale, hold-in, exhale, hold-out
	rawProgress: number; // 0-1 within phase
	easedProgress: number; // Smoothed progress
	crystallization: number; // Stillness during holds (Target)
	sphereScale: number;
	orbitRadius: number;
}

/**
 * Calculate all breathing values for a given UTC time
 * Returns a snapshot of the current breath state
 */
export function calculateBreathState(elapsedTime: number): BreathState {
	// Position in the 16-second cycle
	const cycleTime = elapsedTime % BREATH_TOTAL_CYCLE;

	// Determine phase based on asymmetric durations
	let phaseIndex = 0;
	let phaseTime = cycleTime;
	let phaseDuration: number = BREATH_PHASES.INHALE;

	if (phaseTime < BREATH_PHASES.INHALE) {
		phaseIndex = 0;
		phaseDuration = BREATH_PHASES.INHALE;
	} else {
		phaseTime -= BREATH_PHASES.INHALE;
		if (phaseTime < BREATH_PHASES.HOLD_IN) {
			phaseIndex = 1;
			phaseDuration = BREATH_PHASES.HOLD_IN;
		} else {
			phaseTime -= BREATH_PHASES.HOLD_IN;
			if (phaseTime < BREATH_PHASES.EXHALE) {
				phaseIndex = 2;
				phaseDuration = BREATH_PHASES.EXHALE;
			} else {
				phaseTime -= BREATH_PHASES.EXHALE;
				phaseIndex = 3;
				phaseDuration = BREATH_PHASES.HOLD_OUT;
			}
		}
	}

	const phaseProgress = phaseTime / phaseDuration;
	
	// Calculate breathPhase (0 = exhaled, 1 = inhaled)
	let breathPhase = 0;
	let crystallization = 0;
	let easedProgress = 0;

	switch (phaseIndex) {
		case 0: // Inhale: 0 → 1 (Energetic)
			easedProgress = easeOutQuart(phaseProgress);
			breathPhase = easedProgress;
			crystallization = 0;
			break;
		case 1: // Hold (full): stay at 1
			easedProgress = easeInOutQuad(phaseProgress);
			breathPhase = 1;
			crystallization = 0.5 + easedProgress * 0.4; // Build stillness
			break;
		case 2: // Exhale: 1 → 0 (Relaxed)
			easedProgress = easeInSine(phaseProgress);
			breathPhase = 1 - easedProgress;
			crystallization = 0;
			break;
		case 3: // Hold (empty): stay at 0
			easedProgress = easeInOutQuad(phaseProgress);
			breathPhase = 0;
			crystallization = 0.4 + easedProgress * 0.35; // Build stillness
			break;
	}

	// Calculate derived visual targets
	const sphereScale = VISUALS.SPHERE_SCALE_MIN + breathPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);
	const orbitRadius = VISUALS.PARTICLE_ORBIT_MAX - breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

	return {
		breathPhase,
		phaseType: phaseIndex,
		rawProgress: phaseProgress,
		easedProgress,
		crystallization,
		sphereScale,
		orbitRadius,
	};
}
