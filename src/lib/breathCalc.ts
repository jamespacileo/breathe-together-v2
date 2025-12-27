import { BREATH_PHASE_DURATION, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';

/**
 * Easing function: easeInOutQuad for smooth breathing motion
 */
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
	breathPhase: number; // 0-1
	phaseType: number; // 0-3: inhale, hold-in, exhale, hold-out
	rawProgress: number; // 0-1 within phase
	easedProgress: number; // Smoothed progress
	orbitRadius: number; // Particle orbit radius
	sphereScale: number; // Central sphere scale
	crystallization: number; // Stillness during holds
}

/**
 * Calculate all breathing values for a given UTC time
 * Returns a snapshot of the current breath state
 */
export function calculateBreathState(elapsedTime: number): BreathState {
	// Position in the 16-second cycle
	const cycleTime = elapsedTime % BREATH_TOTAL_CYCLE;

	// Determine phase (0-3)
	const phaseIndex = Math.floor(cycleTime / BREATH_PHASE_DURATION);
	const phaseProgress = (cycleTime % BREATH_PHASE_DURATION) / BREATH_PHASE_DURATION;
	const easedProgress = easeInOutQuad(phaseProgress);

	// Calculate breathPhase (0 = exhaled, 1 = inhaled)
	let breathPhase = 0;
	let crystallization = 0;

	switch (phaseIndex) {
		case 0: // Inhale: 0 → 1
			breathPhase = easedProgress;
			crystallization = 0;
			break;
		case 1: // Hold (full): stay at 1
			breathPhase = 1;
			crystallization = 0.5 + easedProgress * 0.4; // Build stillness
			break;
		case 2: // Exhale: 1 → 0
			breathPhase = 1 - easedProgress;
			crystallization = 0;
			break;
		case 3: // Hold (empty): stay at 0
			breathPhase = 0;
			crystallization = 0.4 + easedProgress * 0.35; // Build stillness
			break;
	}

	// Calculate derived visual values based on breathPhase
	// Particle orbit radius: exhaled (0) = max (expanded), inhaled (1) = min (contracted)
	const orbitRadius =
		VISUALS.PARTICLE_ORBIT_MAX - breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

	// Sphere scale: exhaled (0) = min (small), inhaled (1) = max (large)
	const sphereScale =
		VISUALS.SPHERE_SCALE_MIN + breathPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);

	return {
		breathPhase,
		phaseType: phaseIndex,
		rawProgress: phaseProgress,
		easedProgress,
		orbitRadius,
		sphereScale,
		crystallization,
	};
}
