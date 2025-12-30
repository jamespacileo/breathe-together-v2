import { BREATH_PHASES, BREATH_TOTAL_CYCLE, VISUALS } from '../constants';
import type { BreathState } from '../types';

/**
 * Anatomically-inspired easing functions for natural breathing feel
 *
 * Natural breathing mechanics:
 * - Inhale: Diaphragm contracts, pulling lungs down. Initial resistance,
 *   then lungs expand freely, slowing as capacity approaches.
 * - Exhale: Passive release of tension, then controlled descent as
 *   intercostal muscles engage for smooth finish.
 * - Holds: Not static - subtle "settling" and micro-movements feel alive.
 */

/**
 * Inhale easing: Slow start (effort), accelerate (lungs open), slow finish (capacity)
 * Custom curve with slight initial resistance, then smooth S-curve
 */
function easeInhale(t: number): number {
  // Blend of easeInOut with slight initial hesitation
  // First 15%: slow start (diaphragm engagement)
  // Middle: smooth acceleration (lungs expanding)
  // Last 15%: gradual approach to full (capacity limit)
  if (t < 0.15) {
    // Cubic ease-in for initial effort
    return 0.15 * (t / 0.15) ** 2.5;
  }
  if (t > 0.85) {
    // Smooth ease-out approaching full
    const localT = (t - 0.85) / 0.15;
    return 0.85 + 0.15 * (1 - (1 - localT) ** 2.5);
  }
  // Middle section: smooth sine-based progression
  const localT = (t - 0.15) / 0.7;
  return 0.15 + 0.7 * (0.5 - 0.5 * Math.cos(localT * Math.PI));
}

/**
 * Exhale easing: Quick release (passive), then controlled slowdown
 * Natural exhale starts with tension release, ends with control
 */
function easeExhale(t: number): number {
  // Ease-out cubic with extended tail
  // First 40%: quick release (passive relaxation)
  // Last 60%: controlled descent (engaging core for smooth finish)
  if (t < 0.4) {
    // Quick initial release
    const localT = t / 0.4;
    return 0.6 * (1 - (1 - localT) ** 2);
  }
  // Slower controlled finish
  const localT = (t - 0.4) / 0.6;
  return 0.6 + 0.4 * (1 - (1 - localT) ** 3);
}

/**
 * Hold easing with micro-movement: Not static, subtle "settling" feel
 * Creates sense of life without visible movement
 */
function easeHoldIn(t: number): number {
  // Subtle settling curve - slight expansion then micro-release
  // Mimics the natural "peak" of a held breath
  const settle = Math.sin(t * Math.PI) * 0.02; // 2% micro-movement
  return 1 + settle; // Peaks slightly above 1, returns to 1
}

function easeHoldOut(t: number): number {
  // Subtle anticipation curve - slight dip then rise toward next inhale
  // Mimics the natural "readiness" before breathing in
  const anticipation = -Math.sin(t * Math.PI * 0.8) * 0.015; // 1.5% micro-movement
  return anticipation; // Dips slightly below 0, rises toward 0
}

/**
 * Legacy easing functions (kept for reference/fallback)
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Breath Phase Convention:
 * - breathPhase: 0 = fully exhaled (particles expanded, orb contracted)
 *                1 = fully inhaled (particles contracted, orb expanded)
 */

/**
 * Phase configuration for data-driven calculation
 *
 * Each phase uses anatomically-inspired easing:
 * - Inhale: Effort → expansion → approach capacity
 * - Hold-in: Subtle settling/micro-expansion at peak
 * - Exhale: Quick release → controlled descent
 * - Hold-out: Subtle anticipation before next inhale
 */
const PHASES = [
  {
    duration: BREATH_PHASES.INHALE,
    ease: easeInhale,
    // Inhale goes from 0 → 1 (exhaled → full)
    target: (p: number) => p,
    crystal: () => 0,
  },
  {
    duration: BREATH_PHASES.HOLD_IN,
    ease: easeHoldIn,
    // Hold-in stays near 1 with subtle micro-movement
    // The ease function returns values slightly above/below 1
    target: (p: number) => Math.min(1, Math.max(0, p)), // Clamp to valid range
    crystal: (p: number) => 0.5 + easeInOutQuad(p) * 0.4,
  },
  {
    duration: BREATH_PHASES.EXHALE,
    ease: easeExhale,
    // Exhale goes from 1 → 0 (full → exhaled)
    target: (p: number) => 1 - p,
    crystal: () => 0,
  },
  {
    duration: BREATH_PHASES.HOLD_OUT,
    ease: easeHoldOut,
    // Hold-out stays near 0 with subtle anticipation
    // The ease function returns values slightly below/above 0
    target: (p: number) => Math.min(1, Math.max(0, p)), // Clamp to valid range
    crystal: (p: number) => 0.4 + easeInOutQuad(p) * 0.35,
  },
];

/**
 * Calculate all breathing values for a given UTC time
 * Returns a snapshot of the current breath state
 */
export function calculateBreathState(elapsedTime: number): BreathState {
  // Compute phase timing
  const cycleSeconds = BREATH_TOTAL_CYCLE;
  const scale = cycleSeconds / BREATH_TOTAL_CYCLE;
  const phaseDurations = [
    BREATH_PHASES.INHALE * scale,
    BREATH_PHASES.HOLD_IN * scale,
    BREATH_PHASES.EXHALE * scale,
    BREATH_PHASES.HOLD_OUT * scale,
  ];

  const cycleTime = elapsedTime % cycleSeconds;
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < phaseDurations.length; i++) {
    const duration = phaseDurations[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = phaseDurations[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  // Calculate breathing state
  const phase = PHASES[phaseIndex];
  const easedProgress = phase.ease(phaseProgress);

  // Raw breath phase (may have micro-movements outside 0-1 during holds)
  const rawBreathPhase = phase.target(easedProgress);

  // Clamped breath phase for visual calculations
  // Micro-movements during holds are subtle enough to not need clamping for most visuals
  const breathPhase = Math.max(0, Math.min(1, rawBreathPhase));

  const crystallization = phase.crystal(easedProgress);

  // Derive visual parameters from breath phase
  // Use raw phase for subtle micro-movement in visuals
  const visualPhase = rawBreathPhase;
  const sphereScale =
    VISUALS.SPHERE_SCALE_MIN + visualPhase * (VISUALS.SPHERE_SCALE_MAX - VISUALS.SPHERE_SCALE_MIN);
  const orbitRadius =
    VISUALS.PARTICLE_ORBIT_MAX -
    visualPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN);

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
