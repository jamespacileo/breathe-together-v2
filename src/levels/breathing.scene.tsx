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
export function BreathingScene({
  // Experimental curve props (literal values - Triplex compatible)
  curveType = 'phase-based',
  waveDelta = 0.05,
  showCurveInfo = false,

  // Visual defaults
  backgroundColor = '#0a0f1a',
  sphereColor = '#d4a574',
  sphereOpacity = 0.12,
  sphereDetail = 2,

  // Lighting defaults
  ambientIntensity = 0.15,
  ambientColor = '#a8b8d0',
  keyIntensity = 0.2,
  keyColor = '#e89c5c',

  // Environment defaults
  preset = 'studio',
  enableSparkles = true,
  sparklesCount = 100,
  starsCount = 5000,
  floorColor = '#0a0a1a',
  enableStars = true,
  enableFloor = true,
  floorOpacity = 0.5,
  enablePointLight = true,
  lightIntensityMin = 0.5,
  lightIntensityRange = 1.5,

  // Post-processing defaults
  bloomIntensity = 0.5,
  bloomThreshold = 1.0,
  bloomSmoothing = 0.1,

  // Particle defaults
  particleCount = 300,
}: Partial<BreathingSceneProps> = {}) {
  return (
    <BreathCurveProvider config={{ curveType, waveDelta }}>
      <BreathingLevel
        backgroundColor={backgroundColor}
        sphereColor={sphereColor}
        sphereOpacity={sphereOpacity}
        sphereDetail={sphereDetail}
        ambientIntensity={ambientIntensity}
        ambientColor={ambientColor}
        keyIntensity={keyIntensity}
        keyColor={keyColor}
        preset={preset}
        enableSparkles={enableSparkles}
        sparklesCount={sparklesCount}
        starsCount={starsCount}
        floorColor={floorColor}
        enableStars={enableStars}
        enableFloor={enableFloor}
        floorOpacity={floorOpacity}
        enablePointLight={enablePointLight}
        lightIntensityMin={lightIntensityMin}
        lightIntensityRange={lightIntensityRange}
        bloomIntensity={bloomIntensity}
        bloomThreshold={bloomThreshold}
        bloomSmoothing={bloomSmoothing}
        particleCount={particleCount}
      />

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
