/**
 * Shared Scene Property Types
 *
 * Reduced prop surface for MVP Triplex tuning.
 */

export type CurveType = 'phase-based' | 'rounded-wave';

// ============================================================================
// SHARED PROPS
// ============================================================================

export interface SharedVisualProps {
  /**
   * Background color of the scene.
   * @group "Scene Appearance"
   * @type color
   */
  backgroundColor?: string;

  // Particles
  /**
   * Density of the particle swarm.
   * @group "Particle Swarm"
   * @enum ["sparse", "normal", "dense"]
   */
  particleDensity?: 'sparse' | 'normal' | 'dense';
}

export interface SharedLightingProps {
  /**
   * Lighting mood preset.
   * @group "Lighting"
   * @enum ["warm", "cool", "neutral", "dramatic"]
   */
  lightingPreset?: 'warm' | 'cool' | 'neutral' | 'dramatic';

  /**
   * Global intensity multiplier for all lights.
   * @group "Lighting"
   * @min 0
   * @max 2
   * @step 0.1
   */
  lightingIntensity?: number;
}

export interface SharedEnvironmentProps {
  /**
   * Environment mood preset (stars, nebula, floor).
   * @group "Environment"
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   */
  environmentPreset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density (stars, sparkles, nebula opacity).
   * @group "Environment"
   * @min 0
   * @max 1
   * @step 0.1
   */
  environmentAtmosphere?: number;
}

export interface SharedPostProcessingProps {
  /**
   * Bloom effect intensity preset.
   * @group "Scene Appearance"
   * @enum ["subtle", "medium", "dramatic", "none"]
   */
  bloom?: 'subtle' | 'medium' | 'dramatic' | 'none';
}

// ============================================================================
// EXPERIMENTAL / DEBUG PROPS
// ============================================================================

export interface ExperimentalBreathingProps {
  /**
   * The algorithm used to calculate the breathing phase.
   * @group "Breathing Logic"
   * @label "Curve Type"
   */
  curveType?: CurveType;

  /**
   * Controls the sharpness of pauses at the top and bottom of the breath (rounded-wave only).
   * @group "Breathing Logic"
   * @label "Wave Delta"
   * @min 0.01
   * @max 0.2
   * @step 0.01
   */
  waveDelta?: number;

  /**
   * Show an on-screen overlay with current curve configuration.
   * @group "Breathing Logic"
   * @label "Show Curve Info"
   */
  showCurveInfo?: boolean;
}

export interface BreathingDebugProps {
  /**
   * Enable manual scrubbing of the breathing phase.
   * @group "Debug"
   * @label "Manual Control"
   */
  enableManualControl?: boolean;

  /**
   * Manually set the breathing phase (0 = exhale, 1 = inhale).
   * @group "Debug"
   * @label "Manual Phase"
   * @min 0
   * @max 1
   * @step 0.01
   */
  manualPhase?: number;

  /**
   * Pause the breathing animation.
   * @group "Debug"
   * @label "Paused"
   */
  isPaused?: boolean;

  /**
   * Speed multiplier for the breathing animation.
   * @group "Debug"
   * @label "Time Scale"
   * @min 0
   * @max 2
   * @step 0.1
   */
  timeScale?: number;

  /**
   * Instantly jump to a specific phase in the cycle.
   * @group "Debug"
   * @label "Jump to Phase"
   */
  jumpToPhase?: 0 | 1 | 2 | 3;

  /**
   * Visualize the boundaries of the particle orbits.
   * @group "Debug"
   * @label "Show Orbit Bounds"
   */
  showOrbitBounds?: boolean;

  /**
   * Show markers for phase transitions (Inhale, Hold, Exhale).
   * @group "Debug"
   * @label "Show Phase Markers"
   */
  showPhaseMarkers?: boolean;

  /**
   * Display real-time ECS trait values for the breath entity.
   * @group "Debug"
   * @label "Show Trait Values"
   */
  showTraitValues?: boolean;
}

// ============================================================================
// SCENE TYPES
// ============================================================================

export type BreathingLevelProps = SharedVisualProps &
  SharedLightingProps &
  SharedEnvironmentProps &
  SharedPostProcessingProps;

export type BreathingSceneProps = BreathingLevelProps & ExperimentalBreathingProps;

export type BreathingDebugSceneProps = BreathingLevelProps &
  ExperimentalBreathingProps &
  BreathingDebugProps;
