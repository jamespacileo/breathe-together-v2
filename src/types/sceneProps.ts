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
  /** @type color */
  backgroundColor?: string;

  // Sphere color system
  /** @type color @default "#4A8A9A" */
  sphereColorExhale?: string;
  /** @type color @default "#D4A574" */
  sphereColorInhale?: string;

  // Sphere material and geometry
  /** @min 0 @max 1 @step 0.01 @default 0.12 */
  sphereOpacity?: number;
  /** @min 0 @max 4 @step 1 @default 3 */
  sphereDetail?: number;

  // Sphere breathing size
  /** @min 0.1 @max 1.0 @step 0.05 @default 0.3 */
  sphereScaleMin?: number;
  /** @min 0.1 @max 2.0 @step 0.05 @default 0.7 */
  sphereScaleMax?: number;

  // Sphere layer responsiveness
  /** @min 0 @max 5 @step 0.1 @default 3.0 */
  sphereCoreStiffness?: number;
  /** @min 0 @max 5 @step 0.1 @default 1.0 */
  sphereMainResponsiveness?: number;
  /** @min 0 @max 5 @step 0.1 @default 0.5 */
  sphereAuraElasticity?: number;

  /** @min 50 @max 1000 @step 50 @default 300 */
  particleCount?: number;
}

export interface SharedLightingProps {
  /** @group "Lighting" @label "Ambient Intensity" @min 0 @max 1 @step 0.05 */
  ambientIntensity?: number;
  /** @group "Lighting" @label "Ambient Color" @type color */
  ambientColor?: string;
  /** @group "Lighting" @label "Key Intensity" @min 0 @max 2 @step 0.1 */
  keyIntensity?: number;
  /** @group "Lighting" @label "Key Color" @type color */
  keyColor?: string;
  /** @group "Lighting" @label "Fill Intensity" @min 0 @max 1 @step 0.05 */
  fillIntensity?: number;
  /** @group "Lighting" @label "Fill Color" @type color */
  fillColor?: string;
  /** @group "Lighting" @label "Rim Intensity" @min 0 @max 0.5 @step 0.02 */
  rimIntensity?: number;
  /** @group "Lighting" @label "Rim Color" @type color */
  rimColor?: string;
}

export interface SharedEnvironmentProps {
  /** @group "Environment" @label "Preset" @enum ["studio", "sunset", "night", "warehouse", "forest", "apartment", "city", "park", "lobby", "dawn"] */
  preset?:
    | 'apartment'
    | 'city'
    | 'dawn'
    | 'forest'
    | 'lobby'
    | 'night'
    | 'park'
    | 'studio'
    | 'sunset'
    | 'warehouse';
  /** @group "Environment" @label "Enable Sparkles" */
  enableSparkles?: boolean;
  /** @group "Environment" @label "Sparkles Count" @min 10 @max 500 @step 10 */
  sparklesCount?: number;
  /** @group "Environment" @label "Enable Stars" */
  enableStars?: boolean;
  /** @group "Environment" @label "Stars Count" @min 1000 @max 10000 @step 500 */
  starsCount?: number;
  /** @group "Environment" @label "Enable Floor" */
  enableFloor?: boolean;
  /** @group "Environment" @label "Floor Color" @type color */
  floorColor?: string;
  /** @group "Environment" @label "Floor Opacity" @min 0 @max 1 @step 0.05 */
  floorOpacity?: number;
  /** @group "Environment" @label "Enable Point Light" */
  enablePointLight?: boolean;
  /** @group "Environment" @label "Min Intensity" @min 0 @max 5 @step 0.1 */
  lightIntensityMin?: number;
  /** @group "Environment" @label "Intensity Range" @min 0 @max 5 @step 0.1 */
  lightIntensityRange?: number;
}

export interface SharedPostProcessingProps {
  /** @group "Post-Processing" @label "Bloom Intensity" @min 0 @max 5 @step 0.1 */
  bloomIntensity?: number;
  /** @group "Post-Processing" @label "Bloom Threshold" @min 0 @max 2 @step 0.05 */
  bloomThreshold?: number;
  /** @group "Post-Processing" @label "Bloom Smoothing" @min 0 @max 1 @step 0.01 */
  bloomSmoothing?: number;
}

// ============================================================================
// EXPERIMENTAL / DEBUG PROPS
// ============================================================================

export interface ExperimentalBreathingProps {
  /** @group "Breathing Logic" @label "Curve Type" */
  curveType?: CurveType;
  /** @group "Breathing Logic" @label "Wave Delta" @description Rounded wave pause sharpness (rounded-wave only). */
  waveDelta?: number;
  /** @group "Breathing Logic" @label "Show Curve Info" */
  showCurveInfo?: boolean;
}

export interface BreathingDebugProps {
  /** @group "Debug" @label "Manual Control" */
  enableManualControl?: boolean;
  /** @group "Debug" @label "Manual Phase" @min 0 @max 1 @step 0.01 */
  manualPhase?: number;
  /** @group "Debug" @label "Paused" */
  isPaused?: boolean;
  /** @group "Debug" @label "Time Scale" @min 0 @max 2 @step 0.1 */
  timeScale?: number;
  /** @group "Debug" @label "Jump to Phase" */
  jumpToPhase?: 0 | 1 | 2 | 3;
  /** @group "Debug" @label "Show Orbit Bounds" */
  showOrbitBounds?: boolean;
  /** @group "Debug" @label "Show Phase Markers" */
  showPhaseMarkers?: boolean;
  /** @group "Debug" @label "Show Trait Values" */
  showTraitValues?: boolean;
}

export interface ParticleDebugProps {
  /** @group "Debug" @label "Show Particle Types" */
  showParticleTypes?: boolean;
  /** @group "Debug" @label "Show Particle Stats" */
  showParticleStats?: boolean;
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
  BreathingDebugProps &
  ParticleDebugProps;
