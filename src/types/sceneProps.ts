/**
 * Scene Property Types
 *
 * Simplified prop surface with only actually-used properties.
 */

// ============================================================================
// BREATHING LEVEL PROPS
// ============================================================================

export interface BreathingLevelProps {
  /**
   * Density of the particle swarm.
   * @group "Particle Swarm"
   * @enum ["sparse", "normal", "dense"]
   */
  particleDensity?: 'sparse' | 'normal' | 'dense';

  /**
   * Show EarthGlobe entity (Monument Valley styled Earth with rotation).
   * @group "Entity Visibility"
   * @default true
   */
  showGlobe?: boolean;

  /**
   * Show ParticleSwarm entity (orbiting icosahedral shards).
   * @group "Entity Visibility"
   * @default true
   */
  showParticles?: boolean;

  /**
   * Show Environment entity (lighting, shadows, backdrop).
   * @group "Entity Visibility"
   * @default true
   */
  showEnvironment?: boolean;

  /**
   * Show subtle connection lines between nearby particles.
   * Creates ethereal "constellation threads" that visualize connection.
   * Lines pulse with breathing - more visible on inhale.
   * @group "Entity Visibility"
   * @default true
   */
  showConnections?: boolean;
}

// ============================================================================
// DEBUG SCENE PROPS
// ============================================================================

export interface BreathingDebugProps {
  /**
   * Enable manual scrubbing of the breathing phase.
   * @group "Debug"
   * @default false
   */
  enableManualControl?: boolean;

  /**
   * Manually set the breathing phase (0 = exhale, 1 = inhale).
   * @group "Debug"
   * @min 0 @max 1 @step 0.01
   * @default 0.5
   */
  manualPhase?: number;

  /**
   * Pause the breathing animation.
   * @group "Debug"
   * @default false
   */
  isPaused?: boolean;

  /**
   * Speed multiplier for the breathing animation.
   * @group "Debug"
   * @min 0 @max 2 @step 0.1
   * @default 1.0
   */
  timeScale?: number;

  /**
   * Instantly jump to a specific phase in the cycle.
   * @group "Debug"
   */
  jumpToPhase?: 0 | 1 | 2 | 3;

  /**
   * Visualize the boundaries of the particle orbits.
   * @group "Debug"
   * @default false
   */
  showOrbitBounds?: boolean;

  /**
   * Show markers for phase transitions (Inhale, Hold, Exhale).
   * @group "Debug"
   * @default false
   */
  showPhaseMarkers?: boolean;

  /**
   * Display real-time ECS trait values for the breath entity.
   * @group "Debug"
   * @default false
   */
  showTraitValues?: boolean;
}

export type BreathingDebugSceneProps = BreathingLevelProps & BreathingDebugProps;
