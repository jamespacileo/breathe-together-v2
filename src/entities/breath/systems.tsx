/**
 * Breath system - updates breath entity every frame
 * Uses UTC time for global synchronization
 *
 * Supports multiple breathing algorithms:
 * - phase-based: Production curve with discrete phases
 * - rounded-wave: Experimental curve with smooth transitions
 */
import type { World } from 'koota';
import { easing } from 'maath';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { calculateBreathState } from '../../lib/breathCalc';
import { calculateBreathStateRounded } from '../../lib/breathCalcRounded';
import {
  breathCurveConfig,
  breathPhase,
  crystallization,
  debugPhaseJump,
  debugPhaseOverride,
  debugTimeControl,
  orbitRadius,
  phaseType,
  sphereScale,
  targetBreathPhase,
  targetCrystallization,
  targetOrbitRadius,
  targetSphereScale,
} from './traits';

/**
 * Damping configuration for breath traits
 */
const DAMP_CONFIG = [
  { trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.3 },
  { trait: orbitRadius, targetTrait: targetOrbitRadius, speed: 0.4 },
  { trait: sphereScale, targetTrait: targetSphereScale, speed: 0.25 },
  { trait: crystallization, targetTrait: targetCrystallization, speed: 0.5 },
] as const;

/**
 * Main breath system - runs every frame to update breath state
 * Uses Date.now() for UTC-based synchronization (not local elapsed time)
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
    return;
  }

  // ============================================================
  // DEBUG OVERRIDE SECTION
  // Checks for debug traits and applies overrides with priority:
  // 1. debugPhaseOverride.enabled → manual phase value
  // 2. debugTimeControl.isPaused → frozen time
  // 3. debugTimeControl.timeScale !== 1.0 → scaled time
  // 4. debugPhaseJump.targetPhase >= 0 → jump to phase
  // 5. Normal UTC-based calculation
  // ============================================================

  let elapsed: number;

  const phaseOverride = breathEntity.get(debugPhaseOverride);
  const timeControl = breathEntity.get(debugTimeControl);
  const phaseJump = breathEntity.get(debugPhaseJump);

  // Handle manual phase override (highest priority)
  if (phaseOverride?.enabled) {
    elapsed = phaseOverride.value * BREATH_TOTAL_CYCLE;
  }
  // Handle paused time
  else if (timeControl?.isPaused) {
    elapsed = timeControl.manualTime;
  }
  // Handle time scale multiplier
  else if (timeControl && timeControl.timeScale !== 1.0) {
    const realTime = Date.now() / 1000;
    const scaledTime = realTime * timeControl.timeScale;
    elapsed = scaledTime;

    // Update manualTime for when pausing
    if (timeControl.manualTime !== elapsed) {
      breathEntity.set(debugTimeControl, {
        ...timeControl,
        manualTime: elapsed,
      });
    }
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

    // Reset jump after applying
    breathEntity.set(debugPhaseJump, { targetPhase: -1 });
  }
  // Normal UTC-based calculation (production)
  else {
    elapsed = Date.now() / 1000;
  }

  // Read curve config from entity trait (defaults to phase-based)
  const config = breathEntity.get(breathCurveConfig);
  const curveType = config?.curveType ?? 'phase-based';
  const waveDelta = config?.waveDelta ?? 0.05;

  // Select calculation function based on curve type
  const state =
    curveType === 'rounded-wave'
      ? calculateBreathStateRounded(elapsed, {
          delta: waveDelta,
          amplitude: 1.0,
          cycleSeconds: 16,
        })
      : calculateBreathState(elapsed);

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
