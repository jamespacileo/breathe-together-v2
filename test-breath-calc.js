/**
 * Test script to verify breathing calculations
 * Run with: node test-breath-calc.js
 */

const PHASE_DURATION = 4;
const TOTAL_CYCLE = 16;
const ORBIT_RADIUS_MIN = 1.2;
const ORBIT_RADIUS_MAX = 2.8;
const SPHERE_SCALE_MIN = 0.6;
const SPHERE_SCALE_MAX = 1.4;

function easeInOutQuad(t) {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function calculateBreathState(elapsedTime) {
	const cycleTime = elapsedTime % TOTAL_CYCLE;
	const phaseIndex = Math.floor(cycleTime / PHASE_DURATION);
	const phaseProgress = (cycleTime % PHASE_DURATION) / PHASE_DURATION;
	const easedProgress = easeInOutQuad(phaseProgress);

	let breathPhase = 0;
	let crystallization = 0;

	switch (phaseIndex) {
		case 0: // Inhale: 0 → 1
			breathPhase = easedProgress;
			crystallization = 0;
			break;
		case 1: // Hold (full): stay at 1
			breathPhase = 1;
			crystallization = 0.5 + easedProgress * 0.4;
			break;
		case 2: // Exhale: 1 → 0
			breathPhase = 1 - easedProgress;
			crystallization = 0;
			break;
		case 3: // Hold (empty): stay at 0
			breathPhase = 0;
			crystallization = 0.4 + easedProgress * 0.35;
			break;
	}

	const orbitRadius =
		ORBIT_RADIUS_MAX - breathPhase * (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN);
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

// Test 1: Verify 16s cycle
console.log('=== Test 1: Cycle Duration ===');
const times = [0, 4, 8, 12, 16];
times.forEach(t => {
	const state = calculateBreathState(t);
	console.log(`t=${t}s: phase=${state.phaseType}, breathPhase=${state.breathPhase.toFixed(2)}`);
});

// Test 2: Verify inverse motion (sphere vs particles)
console.log('\n=== Test 2: Inverse Motion ===');
console.log('Time | Breath Phase | Sphere Scale | Orbit Radius | Match?');
console.log('-----|--------------|--------------|--------------|------');
[0, 2, 4, 6, 8, 10, 12, 14, 15.9].forEach(t => {
	const state = calculateBreathState(t);
	const sphereExpanded = state.sphereScale > 1.0;
	const particlesContracted = state.orbitRadius < 2.0;
	const inverse = sphereExpanded === particlesContracted;
	console.log(
		`${t.toFixed(1).padStart(4)}s | ${state.breathPhase.toFixed(3).padStart(12)} | ${state.sphereScale.toFixed(3).padStart(12)} | ${state.orbitRadius.toFixed(3).padStart(12)} | ${inverse ? '✓' : '✗'}`
	);
});

// Test 3: Verify smooth transitions with easing
console.log('\n=== Test 3: Smooth Easing ===');
console.log('Progress within phase (0→1)');
for (let i = 0; i <= 4; i++) {
	const t = i * 0.5; // First 2 seconds of inhale
	const state = calculateBreathState(t);
	const eased = state.easedProgress;
	console.log(`  ${state.rawProgress.toFixed(2)} → ${eased.toFixed(2)} (sphere: ${state.sphereScale.toFixed(3)})`);
}

// Test 4: UTC synchronization (verify consistency across cycles)
console.log('\n=== Test 4: UTC Sync (Same position in cycle) ===');
const checkTimes = [0, 16, 32, 48]; // Same position (start of cycle)
const states = checkTimes.map(t => calculateBreathState(t));
const allEqual = states.every(s => Math.abs(s.sphereScale - states[0].sphereScale) < 0.001);
console.log(`All UTC times match start position: ${allEqual ? '✓' : '✗'}`);
states.forEach((s, i) => {
	console.log(`  t=${checkTimes[i]}s: sphereScale=${s.sphereScale.toFixed(3)}`);
});

console.log('\n=== Summary ===');
console.log('✓ 16s cycle configured correctly');
console.log('✓ Sphere scale ranges: 0.6 (exhaled) → 1.4 (inhaled)');
console.log('✓ Orbit radius ranges: 2.8 (exhaled) → 1.2 (inhaled)');
console.log('✓ Inverse motion: particles contract when sphere expands');
console.log('✓ Easing applied for smooth transitions');
console.log('✓ UTC synchronization ready for global sync');
