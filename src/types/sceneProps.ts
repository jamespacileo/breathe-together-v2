/**
 * Scene Property Types
 *
 * Centralized prop definitions for levels and scenes.
 * Visual tuning is now controlled via GaiaUIOverlay settings panel.
 */

// ============================================================================
// BREATHING LEVEL PROPS
// ============================================================================

export interface BreathingLevelProps {
  /**
   * Particle count (harmony).
   * Controls number of orbiting glass shards.
   * @group "Particles"
   * @min 12 @max 200 @step 1
   * @default 48
   */
  harmony?: number;

  /**
   * Index of Refraction - controls light bending through glass.
   * Higher values create more distortion.
   * @group "Glass"
   * @min 1.0 @max 2.5 @step 0.01
   * @default 1.3
   */
  ior?: number;

  /**
   * Glass depth - controls backface normal blending/distortion.
   * @group "Glass"
   * @min 0.0 @max 1.0 @step 0.01
   * @default 0.3
   */
  glassDepth?: number;

  /**
   * Orbit radius - how far particles orbit from center.
   * @group "Particles"
   * @min 2.0 @max 8.0 @step 0.1
   * @default 4.5
   */
  orbitRadius?: number;

  /**
   * Shard size - maximum size of glass shards.
   * @group "Particles"
   * @min 0.1 @max 1.2 @step 0.02
   * @default 0.5
   */
  shardSize?: number;

  /**
   * Atmosphere density - number of ambient floating particles.
   * @group "Atmosphere"
   * @min 0 @max 300 @step 10
   * @default 100
   */
  atmosphereDensity?: number;

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
