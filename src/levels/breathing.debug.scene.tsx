/**
 * BreathingDebugScene - Unified debug environment.
 *
 * Comprehensive debug scene combining:
 * 1. Curve algorithm testing (phase-based vs. rounded-wave)
 * 2. Manual breathing controls (pause, speed, phase scrubbing)
 * 3. Visual debug overlays (orbit bounds, phase markers, trait values)
 * 4. Entity visibility toggles (sphere, particles, environment)
 *
 * Use in Triplex to:
 * - A/B test breathing algorithms
 * - Scrub through breathing cycle frame-by-frame
 * - Visualize ECS trait values and physics bounds
 * - Inspect entity behavior in isolation
 */

import { Html } from '@react-three/drei';
import { BreathDebugPanel } from '../components/BreathDebugPanel';
import { BreathCurveProvider, useBreathCurveConfig } from '../contexts/BreathCurveContext';
import { CanvasProvider, GlobalProvider } from '../contexts/triplex';
import type { BreathingDebugSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

/**
 * Debug breathing scene with all debug features unified in one place.
 *
 * Combines curve testing, manual controls, visualizations, and entity toggles.
 */
export function BreathingDebugScene({
  // ============================================================
  // CURVE TESTING PROPS (from breathing.scene.tsx)
  // ============================================================

  /**
   * The algorithm used to calculate the breathing phase.
   * @group "Breathing Logic"
   * @enum ["phase-based", "rounded-wave"]
   * @default "phase-based"
   */
  curveType = 'phase-based',

  /**
   * Controls the sharpness of pauses (rounded-wave only).
   * @group "Breathing Logic"
   * @min 0.01 @max 0.2 @step 0.01
   * @default 0.05
   */
  waveDelta = 0.05,

  /**
   * Show curve configuration overlay.
   * @group "Breathing Logic"
   * @default false
   */
  showCurveInfo = false,

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
    <GlobalProvider>
      <BreathCurveProvider config={{ curveType, waveDelta }}>
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

          {/* Curve info overlay */}
          {showCurveInfo && (
            <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  position: 'fixed',
                  top: 20,
                  right: 20,
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(100, 200, 255, 0.5)',
                  borderRadius: 8,
                  padding: 16,
                  color: '#64c8ff',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  zIndex: 1000,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Breathing Curve Config</div>
                <div>Type: {curveType}</div>
                <div>Wave Delta: {waveDelta.toFixed(3)}</div>
                <div style={{ fontSize: 10, marginTop: 8, opacity: 0.6 }}>
                  {curveType === 'phase-based' && (
                    <>
                      Phase-based: Production curve
                      <br />
                      Discrete phases, custom easing
                    </>
                  )}
                  {curveType === 'rounded-wave' && (
                    <>
                      Rounded-wave: Experimental curve
                      <br />
                      Continuous arctangent smoothing
                    </>
                  )}
                </div>
              </div>
            </Html>
          )}
        </CanvasProvider>
      </BreathCurveProvider>
    </GlobalProvider>
  );
}

export default BreathingDebugScene;
