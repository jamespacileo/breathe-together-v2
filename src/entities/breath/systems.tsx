/**
 * Breath system - updates breath entity every frame
 * Uses UTC time for global synchronization
 *
 * Architecture (Dec 2024):
 * - Direct trait updates (no damping) - easing is already in breathCalc
 * - Removes lag between HUD and visual animations
 * - 4 traits: breathPhase, phaseType, rawProgress, orbitRadius
 */
import type { World } from 'koota';
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
} from './traits';

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
  // breathCalc already applies smooth easing per-phase (easeOutQuart, easeInSine, etc.)
  const state = calculateBreathState(elapsed);

  // Set all traits directly - no damping layer needed
  // This ensures HUD and visual animations are perfectly synchronized
  breathEntity.set(breathPhase, { value: state.breathPhase });
  breathEntity.set(phaseType, { value: state.phaseType });
  breathEntity.set(rawProgress, { value: state.rawProgress });
  breathEntity.set(orbitRadius, { value: state.orbitRadius });
}
