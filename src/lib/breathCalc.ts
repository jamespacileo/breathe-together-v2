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
 * Phase configuration for data-driven calculation
 */
const PHASES = [
	{
		duration: BREATH_PHASES.INHALE,
		ease: easeOutQuart,
		target: (p: number) => p,
		crystal: () => 0,
	},
	{
		duration: BREATH_PHASES.HOLD_IN,
		ease: easeInOutQuad,
		target: () => 1,
		crystal: (p: number) => 0.5 + p * 0.4,
	},
	{
		duration: BREATH_PHASES.EXHALE,
		ease: easeInSine,
		target: (p: number) => 1 - p,
		crystal: () => 0,
	},
	{
		duration: BREATH_PHASES.HOLD_OUT,
		ease: easeInOutQuad,
		target: () => 0,
		crystal: (p: number) => 0.4 + p * 0.35,
	},
];

/**
 * Calculate all breathing values for a given UTC time
 * Returns a snapshot of the current breath state
 */
export function calculateBreathState(elapsedTime: number): BreathState {
	// Position in the 16-second cycle
	const cycleTime = elapsedTime % BREATH_TOTAL_CYCLE;

	// Determine phase using data-driven loop
	let accumulatedTime = 0;
	let phaseIndex = 0;

	for (let i = 0; i < PHASES.length; i++) {
		const { duration } = PHASES[i];
		if (cycleTime < accumulatedTime + duration) {
			phaseIndex = i;
			break;
		}
		accumulatedTime += duration;
	}

	const phase = PHASES[phaseIndex];
	const phaseTime = cycleTime - accumulatedTime;
	const phaseProgress = Math.min(1, Math.max(0, phaseTime / phase.duration));
	const easedProgress = phase.ease(phaseProgress);

	const breathPhase = phase.target(easedProgress);
	const crystallization = phase.crystal(easedProgress);

	// Calculate derived visual targets
	const sphereScale =
		VISUALS.SPHERE_SCALE_MIN + breathPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);
	const orbitRadius =
		VISUALS.PARTICLE_ORBIT_MAX - breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

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
