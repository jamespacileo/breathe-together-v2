/**
 * BreathingDebugScene - Full manual control and visualization.
 *
 * A comprehensive debug environment for inspecting the breathing animation
 * and particle system behavior. It provides tools for manual scrubbing,
 * time scaling, and visual helpers for ECS traits and physics.
 *
 * Use in Triplex to:
 * 1. Scrub through the breathing cycle frame-by-frame.
 * 2. Visualize orbit bounds, phase transitions, and trait values.
 * 3. Inspect particle ownership (User vs Filler) and performance stats.
 */

import { BreathDebugPanel } from '../components/BreathDebugPanel';
import { CanvasProvider, GlobalProvider } from '../contexts/triplex';
import type { BreathingDebugSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

/**
 * Debug breathing scene with manual controls and visualizations.
 *
 * Wraps BreathingLevel with a BreathDebugPanel. This separation keeps the
 * Triplex sidebar organized by grouping debug-only controls separately
 * from visual environment props.
 */
export function BreathingDebugScene({
  // Breathing Debug Controls
  /**
   * Enable manual scrubbing of the breathing phase.
   * @group "Debug"
   */
  enableManualControl = false,

  /**
   * Manually set the breathing phase (0 = exhale, 1 = inhale).
   * @group "Debug"
   * @min 0 @max 1 @step 0.01
   */
  manualPhase = 0.5,

  /**
   * Pause the breathing animation.
   * @group "Debug"
   */
  isPaused = false,

  /**
   * Speed multiplier for the breathing animation.
   * @group "Debug"
   * @min 0 @max 2 @step 0.1
   */
  timeScale = 1.0,

  /**
   * Instantly jump to a specific phase in the cycle.
   * @group "Debug"
   */
  jumpToPhase = undefined,

  // Debug Visualizations
  /**
   * Visualize the boundaries of the particle orbits.
   * @group "Debug"
   */
  showOrbitBounds = false,

  /**
   * Show markers for phase transitions (Inhale, Hold, Exhale).
   * @group "Debug"
   */
  showPhaseMarkers = false,

  /**
   * Display real-time ECS trait values for the breath entity.
   * @group "Debug"
   */
  showTraitValues = false,

  // All other props are passed through to BreathingLevel
  ...breathingLevelProps
}: Partial<BreathingDebugSceneProps> = {}) {
  return (
    <GlobalProvider>
      <CanvasProvider>
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
      </CanvasProvider>
    </GlobalProvider>
  );
}

export default BreathingDebugScene;
