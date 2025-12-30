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
  // Particles
  /**
   * Density of the particle swarm.
   * @group "Particle Swarm"
   * @enum ["sparse", "normal", "dense"]
   */
  particleDensity?: 'sparse' | 'normal' | 'dense';

  /**
   * Enable glass refraction effect for particles.
   *
   * When enabled, particles become translucent icosahedrons that refract
   * and reflect the background scene with mood-colored tints. Creates a
   * crystalline, gem-like appearance that breathes with the meditation cycle.
   *
   * **When to adjust:** Disable on low-end devices for better performance.
   * Performance cost: ~4ms overhead per frame at 1024 quality.
   *
   * @group "Particle Swarm"
   * @default true
   */
  enableRefraction?: boolean;

  /**
   * Refraction render target quality (resolution).
   *
   * Controls the sharpness of refracted backgrounds seen through particles.
   * Higher values = sharper refraction but slower rendering.
   *
   * **When to adjust:**
   * - 512: Mobile devices, low-end hardware (faster, visible pixelation)
   * - 1024: Desktop/laptop, balanced quality (recommended)
   * - 2048: High-end hardware, maximum clarity
   *
   * **Interacts with:** enableRefraction, particleCount
   * **Performance note:** 512 = ~2ms/frame, 1024 = ~4ms/frame, 2048 = ~8ms/frame
   *
   * @group "Particle Swarm"
   * @enum [512, 1024, 2048]
   * @default 1024
   */
  refractionQuality?: 512 | 1024 | 2048;
}

export interface SharedEnvironmentProps {
  /**
   * Enable/disable the environment background and lighting.
   *
   * Renders a calming gradient background with drifting clouds and soft lighting.
   *
   * @group "Environment"
   * @default true
   */
  showEnvironment?: boolean;
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
// ENTITY VISIBILITY (DEBUG-ONLY)
// ============================================================================

export interface EntityVisibilityProps {
  /**
   * Show EarthGlobe entity (Monument Valley styled Earth with rotation).
   *
   * @group "Entity Visibility"
   * @default true
   */
  showGlobe?: boolean;

  /**
   * Show ParticleSwarm entity (orbiting icosahedral shards).
   *
   * @group "Entity Visibility"
   * @default true
   */
  showParticles?: boolean;

  /**
   * Show Environment entity (lighting, shadows, backdrop).
   *
   * @group "Entity Visibility"
   * @default true
   */
  showEnvironment?: boolean;
}

// ============================================================================
// SCENE TYPES
// ============================================================================

export type BreathingLevelProps = SharedVisualProps &
  SharedEnvironmentProps &
  SharedPostProcessingProps &
  EntityVisibilityProps;

export type BreathingSceneProps = BreathingLevelProps & ExperimentalBreathingProps;

export type BreathingDebugSceneProps = BreathingLevelProps &
  ExperimentalBreathingProps &
  BreathingDebugProps;
