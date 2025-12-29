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

import { BreathDebugPanel } from '../components/BreathDebugPanel';
import type { BreathingDebugSceneProps } from '../types/sceneProps';
import { BreathingLevel } from './breathing';

/**
 * Debug breathing scene with full manual controls
 *
 * Simplified scene that wraps BreathingLevel with BreathDebugPanel for debug controls.
 * BreathDebugPanel encapsulates all debug-only props (manual phase, pause, visualizations)
 * while BreathingLevel receives all visual and lighting props.
 *
 * This separation reduces Triplex sidebar clutter: visual props (18) + debug panel props (9)
 * instead of all 31 mixed together.
 */
export function BreathingDebugScene(props: Partial<BreathingDebugSceneProps> = {}) {
  // Extract debug-specific props for BreathDebugPanel
  const {
    // Breathing Debug Controls
    enableManualControl = false,
    manualPhase = 0.5,
    isPaused = false,
    timeScale = 1.0,
    jumpToPhase = undefined,

    // Debug Visualizations
    showOrbitBounds = false,
    showPhaseMarkers = false,
    showTraitValues = false,

    // Particle Debug
    showParticleTypes = false,
    showParticleStats = false,

    // All visual, lighting, and environment props spread directly to BreathingLevel
    ...breathingLevelProps
  } = props;

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
        showParticleTypes={showParticleTypes}
        showParticleStats={showParticleStats}
      />
    </>
  );
}

export default BreathingDebugScene;
