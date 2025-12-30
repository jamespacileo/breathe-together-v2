/**
 * BreathingDebugScene - Unified debug environment.
 *
 * Comprehensive debug scene combining:
 * 1. Manual breathing controls (pause, speed, phase scrubbing)
 * 2. Visual debug overlays (orbit bounds, phase markers, trait values)
 * 3. Entity visibility toggles (sphere, particles, environment)
 *
 * Use in Triplex to:
 * - Scrub through breathing cycle frame-by-frame
 * - Visualize ECS trait values and physics bounds
 * - Inspect entity behavior in isolation
 */

import { BreathDebugPanel } from '../components/BreathDebugPanel';
import type { BreathingDebugSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

/**
 * Debug breathing scene with all debug features unified in one place.
 *
 * Combines manual controls, visualizations, and entity toggles.
 */
export function BreathingDebugScene({
  // ============================================================
  // MANUAL BREATHING CONTROLS
  // ============================================================

  /**
   * Enable manual scrubbing of the breathing phase.
   * @group "Debug Controls"
   * @default false
   */
  enableManualControl = false,

  /**
   * Manually set the breathing phase (0 = exhale, 1 = inhale).
   * @group "Debug Controls"
   * @min 0 @max 1 @step 0.01
   * @default 0.5
   */
  manualPhase = 0.5,

  /**
   * Pause the breathing animation.
   * @group "Debug Controls"
   * @default false
   */
  isPaused = false,

  /**
   * Speed multiplier for the breathing animation.
   * @group "Debug Controls"
   * @min 0.1 @max 5.0 @step 0.1
   * @default 1.0
   */
  timeScale = 1.0,

  /**
   * Instantly jump to a specific phase in the cycle.
   * @group "Debug Controls"
   */
  jumpToPhase = undefined,

  // ============================================================
  // VISUAL DEBUG OVERLAYS
  // ============================================================

  /**
   * Visualize particle orbit boundaries.
   * @group "Debug Visuals"
   * @default false
   */
  showOrbitBounds = false,

  /**
   * Show breathing phase transition markers.
   * @group "Debug Visuals"
   * @default false
   */
  showPhaseMarkers = false,

  /**
   * Display real-time ECS trait values.
   * @group "Debug Visuals"
   * @default false
   */
  showTraitValues = false,

  // All other props are passed through to BreathingLevel
  ...breathingLevelProps
}: Partial<BreathingDebugSceneProps> = {}) {
  return (
    <>
      <BreathingLevel {...breathingLevelProps} />

      <BreathDebugPanel
        enableManualControl={enableManualControl}
        manualPhase={manualPhase}
        isPaused={isPaused}
        timeScale={timeScale}
        jumpToPhase={jumpToPhase}
        showOrbitBounds={showOrbitBounds}
        showPhaseMarkers={showPhaseMarkers}
        showTraitValues={showTraitValues}
      />
    </>
  );
}

export default BreathingDebugScene;
