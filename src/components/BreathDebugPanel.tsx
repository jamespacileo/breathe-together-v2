/**
 * BreathDebugPanel - Encapsulated debug control panel for breathing animation
 *
 * Groups all debug-only controls (manual phase, pause, time scale, visualizations)
 * into a single component to reduce Triplex sidebar clutter when editing debug scenes.
 *
 * Props include:
 * - Manual controls: enableManualControl, manualPhase, isPaused, timeScale, jumpToPhase
 * - Visual overlays: showOrbitBounds, showPhaseMarkers, showTraitValues
 * - Particle debug: showParticleTypes, showParticleStats
 *
 * All props are optional with sensible defaults (all debug features disabled by default).
 * The panel renders nothing until at least one debug feature is enabled.
 */

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { type BreathDebugConfig, BreathDebugProvider } from '../contexts/breathDebug';
import { BreathDebugVisuals } from './BreathDebugVisuals';

interface BreathDebugPanelProps {
  /**
   * Enable manual breath phase control (frame-by-frame scrubbing).
   *
   * @default false
   */
  enableManualControl?: boolean;

  /**
   * Manual breath phase override (0-1, linear).
   *
   * Only applies when enableManualControl is true.
   * 0 = start of inhale, 1 = end of hold-out.
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.5
   */
  manualPhase?: number;

  /**
   * Pause the breathing animation.
   *
   * @default false
   */
  isPaused?: boolean;

  /**
   * Time scale multiplier for breathing animation speed.
   *
   * 1.0 = normal speed, 2.0 = double speed, 0.5 = half speed.
   *
   * @min 0.1
   * @max 5.0
   * @step 0.1
   * @default 1.0
   */
  timeScale?: number;

  /**
   * Jump to specific breathing phase instantly.
   *
   * 0 = Inhale, 1 = Hold-in, 2 = Exhale, 3 = Hold-out.
   *
   * @default undefined
   */
  jumpToPhase?: 0 | 1 | 2 | 3;

  /**
   * Show particle orbit boundary visualization.
   *
   * Displays sphere radius bounds for particle positioning.
   *
   * @default false
   */
  showOrbitBounds?: boolean;

  /**
   * Show breathing phase transition markers.
   *
   * Visual debug overlay showing phase boundaries (0, 3s, 8s, 13s, 16s).
   *
   * @default false
   */
  showPhaseMarkers?: boolean;

  /**
   * Show real-time trait values overlay.
   *
   * Displays breathPhase, sphereScale, crystallization, and other trait values.
   *
   * @default false
   */
  showTraitValues?: boolean;
}

/**
 * BreathDebugPanel - All-in-one debug control panel
 *
 * Encapsulates debug visualizations and control overlay into a single component.
 * The panel renders debug overlays only when debug features are enabled.
 */
export function BreathDebugPanel({
  enableManualControl = false,
  manualPhase = 0.5,
  isPaused = false,
  timeScale = 1.0,
  jumpToPhase = undefined,
  showOrbitBounds = false,
  showPhaseMarkers = false,
  showTraitValues = false,
}: BreathDebugPanelProps = {}) {
  // Build debug config from props
  const debugConfig = useMemo<BreathDebugConfig | null>(() => {
    const hasDebugProps =
      enableManualControl ||
      isPaused ||
      timeScale !== 1.0 ||
      jumpToPhase !== undefined ||
      showOrbitBounds ||
      showPhaseMarkers ||
      showTraitValues;

    if (!hasDebugProps) return null;

    return {
      manualPhaseOverride: enableManualControl ? manualPhase : undefined,
      isPaused,
      timeScale,
      jumpToPhase,
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

  // If no debug props are set, render nothing
  if (!debugConfig) {
    return null;
  }

  return (
    <BreathDebugProvider config={debugConfig}>
      {/* Breath Debug Visualizations */}
      <BreathDebugVisuals
        showOrbitBounds={showOrbitBounds}
        showPhaseMarkers={showPhaseMarkers}
        showTraitValues={showTraitValues}
      />

      {/* Debug Control Status Overlay */}
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
              Debug mode active.
              <br />
              Production scene unaffected.
            </div>
          </div>
        </Html>
      )}
    </BreathDebugProvider>
  );
}
