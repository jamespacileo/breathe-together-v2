/**
 * Debug Breathing Scene for Triplex Visual Editor
 *
 * Complete debug control over breathing animation with manual scrubbing,
 * pause/play, time scaling, and visual feedback helpers.
 *
 * Use in Triplex to:
 * 1. Scrub through breathing cycle frame-by-frame (manualPhase 0-1)
 * 2. Pause/play animation (isPaused toggle)
 * 3. Speed up/slow down breathing (timeScale 0.1-5.0)
 * 4. Jump to specific phases instantly (jumpToPhase 0-3)
 * 5. Visualize orbit bounds, phase transitions, and trait values
 * 6. Tweak all visual properties while debugging
 *
 * Note: Debug traits are only active when this scene is loaded.
 * Production app.tsx and breathing.tsx remain unaffected.
 *
 * Uses shared types from src/types/sceneProps.ts and centralized defaults.
 */

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { BreathDebugVisuals } from '../components/BreathDebugVisuals';
import { ParticleDebugVisuals } from '../components/ParticleDebugVisuals';
import {
  BREATHING_DEBUG_DEFAULTS,
  ENVIRONMENT_DEFAULTS,
  EXPERIMENTAL_DEFAULTS,
  getDefaultValues,
  LIGHTING_DEFAULTS,
  PARTICLE_DEBUG_DEFAULTS,
  VISUAL_DEFAULTS,
} from '../config/sceneDefaults';
import { type BreathDebugConfig, BreathDebugProvider } from '../contexts/breathDebug';
import type { BreathingDebugSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

// Merge all defaults for convenient spreading
const DEFAULT_PROPS = {
  ...getDefaultValues(VISUAL_DEFAULTS),
  ...getDefaultValues(LIGHTING_DEFAULTS),
  ...getDefaultValues(ENVIRONMENT_DEFAULTS),
  ...getDefaultValues(BREATHING_DEBUG_DEFAULTS),
  ...getDefaultValues(PARTICLE_DEBUG_DEFAULTS),
  ...getDefaultValues(EXPERIMENTAL_DEFAULTS),
} as const;

/**
 * Debug breathing scene with full manual controls
 *
 * Wraps BreathingLevel with BreathDebugProvider to inject debug configuration
 * into the breath system. Includes visual debug helpers for understanding
 * animation state in real-time.
 */
export function BreathingDebugScene({
  // Breathing Debug Controls
  enableManualControl = DEFAULT_PROPS.enableManualControl,
  manualPhase = DEFAULT_PROPS.manualPhase,
  isPaused = DEFAULT_PROPS.isPaused,
  timeScale = DEFAULT_PROPS.timeScale,
  jumpToPhase = DEFAULT_PROPS.jumpToPhase,

  // Debug Visualizations
  showOrbitBounds = DEFAULT_PROPS.showOrbitBounds,
  showPhaseMarkers = DEFAULT_PROPS.showPhaseMarkers,
  showTraitValues = DEFAULT_PROPS.showTraitValues,

  // Visual Properties
  backgroundColor = DEFAULT_PROPS.backgroundColor,
  sphereColor = DEFAULT_PROPS.sphereColor,
  sphereOpacity = DEFAULT_PROPS.sphereOpacity,
  sphereDetail = DEFAULT_PROPS.sphereDetail,

  // Lighting
  ambientIntensity = DEFAULT_PROPS.ambientIntensity,
  ambientColor = DEFAULT_PROPS.ambientColor,
  keyIntensity = DEFAULT_PROPS.keyIntensity,
  keyColor = DEFAULT_PROPS.keyColor,

  // Environment
  starsCount = DEFAULT_PROPS.starsCount,
  floorColor = DEFAULT_PROPS.floorColor,
  enableStars = DEFAULT_PROPS.enableStars,
  enableFloor = DEFAULT_PROPS.enableFloor,
  floorOpacity = DEFAULT_PROPS.floorOpacity,
  enablePointLight = DEFAULT_PROPS.enablePointLight,
  lightIntensityMin = DEFAULT_PROPS.lightIntensityMin,
  lightIntensityRange = DEFAULT_PROPS.lightIntensityRange,

  // Particles
  particleCount = DEFAULT_PROPS.particleCount,

  showParticleTypes = DEFAULT_PROPS.showParticleTypes,
  showParticleStats = DEFAULT_PROPS.showParticleStats,
}: Partial<BreathingDebugSceneProps> = {}) {
  // Build debug config from props
  const debugConfig = useMemo<BreathDebugConfig | null>(() => {
    // Only create config if we have at least one debug property set
    const hasDebugProps =
      enableManualControl ||
      isPaused ||
      timeScale !== 1.0 ||
      jumpToPhase !== undefined ||
      showOrbitBounds ||
      showPhaseMarkers ||
      showTraitValues;

    if (!hasDebugProps) {
      return null;
    }

    return {
      // Manual Controls
      manualPhaseOverride: enableManualControl ? manualPhase : undefined,
      isPaused,
      timeScale,
      jumpToPhase,

      // Visual Debug
      showOrbitBounds,
      showPhaseMarkers,
      showTraitValues,
    };
  }, [
    enableManualControl,
    manualPhase,
    isPaused,
    timeScale,
    jumpToPhase,
    showOrbitBounds,
    showPhaseMarkers,
    showTraitValues,
  ]);

  return (
    <BreathDebugProvider config={debugConfig}>
      <BreathingLevel
        backgroundColor={backgroundColor}
        sphereColor={sphereColor}
        sphereOpacity={sphereOpacity}
        sphereDetail={sphereDetail}
        ambientIntensity={ambientIntensity}
        ambientColor={ambientColor}
        keyIntensity={keyIntensity}
        keyColor={keyColor}
        starsCount={starsCount}
        floorColor={floorColor}
        enableStars={enableStars}
        enableFloor={enableFloor}
        floorOpacity={floorOpacity}
        enablePointLight={enablePointLight}
        lightIntensityMin={lightIntensityMin}
        lightIntensityRange={lightIntensityRange}
        particleCount={particleCount}
      />

      {/* Debug Visualizations */}
      <BreathDebugVisuals
        showOrbitBounds={showOrbitBounds}
        showPhaseMarkers={showPhaseMarkers}
        showTraitValues={showTraitValues}
      />

      {/* Particle Debug Visualizations */}
      <ParticleDebugVisuals
        showParticleTypes={showParticleTypes}
        showParticleStats={showParticleStats}
      />

      {/* Debug Control Info Overlay */}
      {(enableManualControl || isPaused || timeScale !== 1.0 || jumpToPhase !== undefined) && (
        <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'fixed',
              top: 20,
              left: 20,
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(255, 200, 0, 0.6)',
              borderRadius: 8,
              padding: 16,
              color: '#ffc800',
              fontFamily: 'monospace',
              fontSize: 12,
              zIndex: 1000,
              lineHeight: 1.6,
              maxWidth: 300,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Breath Debug Controls</div>
            {enableManualControl && <div>Phase: {manualPhase.toFixed(3)}</div>}
            {isPaused && <div>Status: ⏸ PAUSED</div>}
            {timeScale !== 1.0 && <div>Speed: {timeScale.toFixed(1)}x</div>}
            {jumpToPhase !== undefined && (
              <div>Jump: {['Inhale', 'Hold-in', 'Exhale', 'Hold-out'][jumpToPhase]}</div>
            )}
            <div
              style={{
                fontSize: 10,
                marginTop: 8,
                opacity: 0.7,
                color: '#ffcc99',
              }}
            >
              Debug traits active.
              <br />
              Production app unaffected.
            </div>
          </div>
        </Html>
      )}
    </BreathDebugProvider>
  );
}

export default BreathingDebugScene;
