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
   * Show holographic 3D UI elements around the globe.
   * When enabled, displays breathing progress ring, phase labels, timer,
   * 4·7·8 markers, and presence constellation in 3D space.
   * @group "Holographic UI"
   * @default false
   */
  showHolographicUI?: boolean;

  /**
   * Show holographic progress ring around globe equator.
   * @group "Holographic UI"
   * @default true
   */
  showHoloProgressRing?: boolean;

  /**
   * Show holographic phase labels (INHALE/HOLD/EXHALE) above globe.
   * @group "Holographic UI"
   * @default true
   */
  showHoloPhaseLabels?: boolean;

  /**
   * Show holographic timer ribbon below globe.
   * @group "Holographic UI"
   * @default true
   */
  showHoloTimer?: boolean;

  /**
   * Show holographic 4·7·8 phase markers.
   * @group "Holographic UI"
   * @default true
   */
  showHoloPhaseMarkers?: boolean;

  /**
   * Show presence constellation (user count as stars).
   * @group "Holographic UI"
   * @default true
   */
  showHoloPresence?: boolean;
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
