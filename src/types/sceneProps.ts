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
  /** @type color */
  sphereColor?: string;
  /** @min 0 @max 1 @step 0.01 */
  sphereOpacity?: number;
  /** @min 0 @max 4 @step 1 */
  sphereDetail?: number;
  /** @min 50 @max 1000 @step 50 */
  particleCount?: number;
}

export interface SharedLightingProps {
  /** @min 0 @max 1 @step 0.05 */
  ambientIntensity?: number;
  /** @type color */
  ambientColor?: string;
  /** @min 0 @max 2 @step 0.1 */
  keyIntensity?: number;
  /** @type color */
  keyColor?: string;
}

export interface SharedEnvironmentProps {
  enableStars?: boolean;
  /** @min 1000 @max 10000 @step 500 */
  starsCount?: number;
  enableFloor?: boolean;
  /** @type color */
  floorColor?: string;
  /** @min 0 @max 1 @step 0.05 */
  floorOpacity?: number;
  enablePointLight?: boolean;
  /** @min 0 @max 5 @step 0.1 */
  lightIntensityMin?: number;
  /** @min 0 @max 5 @step 0.1 */
  lightIntensityRange?: number;
}

// ============================================================================
// EXPERIMENTAL / DEBUG PROPS
// ============================================================================

export interface ExperimentalBreathingProps {
  curveType?: CurveType;
  /** Rounded wave pause sharpness (rounded-wave only). */
  waveDelta?: number;
  showCurveInfo?: boolean;
}

export interface BreathingDebugProps {
  enableManualControl?: boolean;
  /** 0-1 */
  manualPhase?: number;
  isPaused?: boolean;
  timeScale?: number;
  jumpToPhase?: 0 | 1 | 2 | 3;
  showOrbitBounds?: boolean;
  showPhaseMarkers?: boolean;
  showTraitValues?: boolean;
}

export interface ParticleDebugProps {
  showParticleTypes?: boolean;
  showParticleStats?: boolean;
}

// ============================================================================
// SCENE TYPES
// ============================================================================

export type BreathingLevelProps = SharedVisualProps & SharedLightingProps & SharedEnvironmentProps;

export type BreathingSceneProps = BreathingLevelProps & ExperimentalBreathingProps;

export type BreathingDebugSceneProps = BreathingLevelProps &
  ExperimentalBreathingProps &
  BreathingDebugProps &
  ParticleDebugProps;
