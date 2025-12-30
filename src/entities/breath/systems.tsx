/**
 * Breath system - updates breath entity every frame
 * Uses UTC time for global synchronization
 *
 * Simplified architecture (Dec 2024):
 * - Only 2 damped traits: breathPhase, orbitRadius
 * - Removed unused: sphereScale, crystallization, easedProgress
 * - Removed velocity traits (easing.damp manages velocity internally)
 */
import type { World } from 'koota';
import { easing } from 'maath';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { calculateBreathState } from '../../lib/breathCalc';
import {
  breathPhase,
  debugPhaseJump,
  debugPhaseOverride,
  debugTimeControl,
  orbitRadius,
  phaseType,
  rawProgress,
  targetBreathPhase,
  targetOrbitRadius,
} from './traits';

/**
 * Damping configuration for breath traits
 * Only breathPhase and orbitRadius need damping (consumed by visual entities)
 */
const DAMP_CONFIG = [
  {
    trait: breathPhase,
    targetTrait: targetBreathPhase,
    speed: 0.3,
  },
  {
    trait: orbitRadius,
    targetTrait: targetOrbitRadius,
    speed: 0.4,
  },
] as const;

/**
 * Main breath system - runs every frame to update breath state
 * Uses Date.now() for UTC-based synchronization (not local elapsed time)
 * Debug time control switches to a local clock for pause/scale.
 *
 * This ensures all users worldwide see the same breathing cycle
 *
 * Supports multiple breathing algorithms via breathCurveConfig trait:
 * - phase-based (default): Production curve with discrete phases
 * - rounded-wave: Experimental curve with smooth arctangent transitions
 */
export function breathSystem(world: World, delta: number) {
  const breathEntity = world.queryFirst(breathPhase);

  if (!breathEntity) {
    // Entity not spawned yet, skip this frame
    if (import.meta.env.DEV) {
      console.warn('[breathSystem] No breath entity found - breathing animation disabled');
    }
    return;
  }

  // ============================================================
  // DEBUG OVERRIDE SECTION
  // Checks for debug traits and applies overrides with priority:
  // 1. debugPhaseOverride.enabled → manual phase value
  // 2. debugPhaseJump.targetPhase >= 0 → jump to phase
  // 3. debugTimeControl.isPaused → frozen time (debug only)
  // 4. debugTimeControl.timeScale → local scaled time (debug only)
  // 5. Normal UTC-based calculation (production)
  // ============================================================

  let elapsed: number;

  const phaseOverride = breathEntity.get(debugPhaseOverride);
  const timeControl = breathEntity.get(debugTimeControl);
  const phaseJump = breathEntity.get(debugPhaseJump);

  // Handle manual phase override (highest priority)
  if (phaseOverride?.enabled) {
    elapsed = phaseOverride.value * BREATH_TOTAL_CYCLE;
  }
  // Handle phase jump
  else if (phaseJump && phaseJump.targetPhase >= 0) {
    // Calculate time offset for target phase
    const phaseStartTimes = [
      0,
      BREATH_PHASES.INHALE,
      BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN,
      BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN + BREATH_PHASES.EXHALE,
    ];
    elapsed = phaseStartTimes[phaseJump.targetPhase];

    // Reset jump after applying and keep debug clock in sync
    breathEntity.set(debugPhaseJump, { targetPhase: -1 });
    if (timeControl) {
      breathEntity.set(debugTimeControl, {
        ...timeControl,
        manualTime: elapsed,
      });
    }
  }
  // Handle debug time control (local clock)
  else if (timeControl) {
    if (timeControl.isPaused) {
      elapsed = timeControl.manualTime;
    } else {
      const nextElapsed = timeControl.manualTime + delta * timeControl.timeScale;
      elapsed = nextElapsed;
      if (timeControl.manualTime !== nextElapsed) {
        breathEntity.set(debugTimeControl, {
          ...timeControl,
          manualTime: nextElapsed,
        });
      }
    }
  }
  // Normal UTC-based calculation (production)
  else {
    elapsed = Date.now() / 1000;
  }

  // Calculate breathing state using phase-based algorithm
  const state = calculateBreathState(elapsed);

  // 1. Update discrete traits (no damping needed - consumed directly by HUD)
  breathEntity.set(phaseType, { value: state.phaseType });
  breathEntity.set(rawProgress, { value: state.rawProgress });

  // 2. Update target traits (for damped animation)
  breathEntity.set(targetBreathPhase, { value: state.breathPhase });
  breathEntity.set(targetOrbitRadius, { value: state.orbitRadius });

  // 3. Damp current values toward targets using maath/easing
  // easing.damp stores velocity internally in the current object
  for (const { trait, targetTrait, speed } of DAMP_CONFIG) {
    const current = breathEntity.get(trait);
    const target = breathEntity.get(targetTrait);
    if (current && target) {
      easing.damp(current, 'value', target.value, speed, delta);
      breathEntity.set(trait, current);
    }
  }
}
