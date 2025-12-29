/**
 * Experimental Breathing Scene for Triplex Visual Editor
 *
 * Dedicated scene file for exploring different breathing algorithms and visual tuning.
 * Allows A/B testing of curve types (phase-based vs rounded-wave) with live graph.
 *
 * Use in Triplex to:
 * 1. Toggle between "phase-based" and "rounded-wave" breathing curves
 * 2. Adjust "waveDelta" to control pause sharpness on rounded-wave
 * 3. See real-time visual effect on sphere and particles
 * 4. Compare breathing rhythm and crystallization patterns
 * 5. Test all BreathingLevel visual props (colors, lighting, particles)
 *
 * Note: This scene runs independently from production app.tsx.
 * Changes here don't affect the main app. Use when satisfied to update breathing.tsx.
 *
 * Uses shared types from src/types/sceneProps.ts for DRY consistency.
 */

import { Html } from '@react-three/drei';
import { BreathCurveProvider } from '../contexts/BreathCurveContext';
import type { BreathingSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

/**
 * Experimental breathing scene combining curve selection with BreathingLevel
 *
 * Wraps BreathingLevel with BreathCurveProvider to inject curve type selection
 * into the breath system. Allows visual experimentation and comparison.
 */
export function BreathingScene(props: Partial<BreathingSceneProps> = {}) {
  // Extract scene-specific props
  const {
    // Experimental curve props (literal values - Triplex compatible)
    /** @type select @options ["phase-based", "rounded-wave"] */
    curveType = 'phase-based',
    /** @type slider @min 0.01 @max 0.2 @step 0.01 */
    waveDelta = 0.05,
    /** @type toggle */
    showCurveInfo = false,

    // All other props (visual, lighting, environment, post-processing)
    // are spread directly to BreathingLevel without intermediate variables
    ...breathingLevelProps
  } = props;

  return (
    <BreathCurveProvider config={{ curveType, waveDelta }}>
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
    </BreathCurveProvider>
  );
}
