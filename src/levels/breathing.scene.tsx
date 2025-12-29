/**
 * BreathingScene - Experimental curve playground.
 *
 * A dedicated scene for A/B testing different breathing algorithms and visual tuning.
 * It allows toggling between production "phase-based" curves and experimental
 * "rounded-wave" curves with real-time visual feedback.
 *
 * Use in Triplex to:
 * 1. Compare breathing rhythms and crystallization patterns.
 * 2. Adjust pause sharpness (waveDelta) for continuous curves.
 * 3. Visualize the impact of curve changes on the sphere and particles.
 */

import { Html } from '@react-three/drei';
import { BreathCurveProvider } from '../contexts/BreathCurveContext';
import { CanvasProvider, GlobalProvider } from '../contexts/triplex';
import type { BreathingSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

/**
 * Experimental breathing scene with curve selection.
 *
 * Wraps the standard BreathingLevel with a BreathCurveProvider to inject
 * custom breathing logic into the ECS systems.
 */
export function BreathingScene({
  // Experimental curve props
  /**
   * The algorithm used to calculate the breathing phase.
   * @group "Breathing Logic"
   * @enum ["phase-based", "rounded-wave"]
   */
  curveType = 'phase-based',

  /**
   * Controls the sharpness of pauses at the top and bottom of the breath (rounded-wave only).
   * @group "Breathing Logic"
   * @min 0.01
   * @max 0.2
   * @step 0.01
   */
  waveDelta = 0.05,

  /**
   * Show an on-screen overlay with current curve configuration.
   * @group "Breathing Logic"
   */
  showCurveInfo = false,

  // All other props are passed through to BreathingLevel
  ...breathingLevelProps
}: Partial<BreathingSceneProps> = {}) {
  return (
    <GlobalProvider>
      <BreathCurveProvider config={{ curveType, waveDelta }}>
        <CanvasProvider>
          <BreathingLevel {...breathingLevelProps} />

          {/* Optional: Debug overlay showing current curve type and configuration */}
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
                      <br />
                      {waveDelta < 0.03 && 'Sharp pauses (δ < 0.03)'}
                      {waveDelta >= 0.03 && waveDelta < 0.08 && 'Balanced pauses (δ ~ 0.05)'}
                      {waveDelta >= 0.08 && 'Smooth transitions (δ > 0.08)'}
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

export default BreathingScene;
