/**
 * Pure breath calculation logic
 * Box Breathing: 4s inhale, 4s hold, 4s exhale, 4s hold (16s total)
 * UTC-synced - all users globally synchronized via Date.now()
 */

// Box Breathing: 4s per phase, 16s total
const PHASE_DURATION = 4;
const TOTAL_CYCLE = 16;

// Visual ranges
const ORBIT_RADIUS_MIN = 1.8; // Particles contract (inhale) - safely outside max sphere 1.4
const ORBIT_RADIUS_MAX = 3.5; // Particles expand (exhale) - greater spread for breathing emphasis
const SPHERE_SCALE_MIN = 0.6; // Sphere small (exhale)
const SPHERE_SCALE_MAX = 1.4; // Sphere large (inhale)

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
	const cycleTime = elapsedTime % TOTAL_CYCLE;

	// Determine phase (0-3)
	const phaseIndex = Math.floor(cycleTime / PHASE_DURATION);
	const phaseProgress = (cycleTime % PHASE_DURATION) / PHASE_DURATION;
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
		ORBIT_RADIUS_MAX - breathPhase * (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN);

	// Sphere scale: exhaled (0) = min (small), inhaled (1) = max (large)
	const sphereScale =
		SPHERE_SCALE_MIN + breathPhase * (SPHERE_SCALE_MAX - SPHERE_SCALE_MIN);

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
