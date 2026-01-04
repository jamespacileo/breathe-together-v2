/**
 * HolographicUI Test Scene - Deterministic Visual Testing
 *
 * A dedicated Triplex scene for testing the HolographicBreathUI components
 * with deterministic, reproducible states. Enables:
 *
 * 1. Phase Snapshots - View each phase at fixed progress values
 * 2. Component Isolation - Test rings, glyphs, or waves independently
 * 3. Visual Regression - Compare renders at known states
 *
 * DETERMINISTIC TESTING APPROACH:
 * - All animations driven by debug props (not UTC time)
 * - Specific phase/progress combinations can be captured as snapshots
 * - Triplex props allow scrubbing through states interactively
 *
 * SNAPSHOT TEST POINTS (for visual regression):
 * - Inhale Start:   debugPhase=0, debugProgress=0
 * - Inhale Mid:     debugPhase=0, debugProgress=0.5
 * - Inhale End:     debugPhase=0, debugProgress=1
 * - Hold Start:     debugPhase=1, debugProgress=0
 * - Hold Mid:       debugPhase=1, debugProgress=0.5
 * - Hold End:       debugPhase=1, debugProgress=1
 * - Exhale Start:   debugPhase=2, debugProgress=0
 * - Exhale Mid:     debugPhase=2, debugProgress=0.5
 * - Exhale End:     debugPhase=2, debugProgress=1
 */

import { Environment as DreiEnvironment, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

import { EarthGlobe } from '../entities/earthGlobe';
import { HolographicBreathUI } from '../entities/holographicBreathUI';

/**
 * Test scene props for deterministic visual testing
 */
interface HolographicUITestSceneProps {
  // ==========================================================================
  // PHASE CONTROL (Deterministic)
  // ==========================================================================

  /**
   * Current breathing phase to display.
   * 0 = Inhale, 1 = Hold, 2 = Exhale
   * @min 0 @max 2 @step 1
   * @default 0
   */
  phase?: number;

  /**
   * Progress within the current phase (0-1).
   * 0 = phase start, 1 = phase end
   * @min 0 @max 1 @step 0.1
   * @default 0.5
   */
  progress?: number;

  /**
   * Breath phase value for wave animations (0-1).
   * 0 = fully exhaled, 1 = fully inhaled
   * @min 0 @max 1 @step 0.1
   * @default 0.5
   */
  breathPhase?: number;

  // ==========================================================================
  // COMPONENT VISIBILITY
  // ==========================================================================

  /**
   * Show the central globe for context
   * @default true
   */
  showGlobe?: boolean;

  /**
   * Show phase rings (concentric circles)
   * @default true
   */
  showRings?: boolean;

  /**
   * Show phase glyphs (floating 4·7·8)
   * @default true
   */
  showGlyphs?: boolean;

  /**
   * Show breath waves (horizontal bands)
   * @default true
   */
  showWaves?: boolean;

  // ==========================================================================
  // SNAPSHOT PRESETS
  // ==========================================================================

  /**
   * Quick preset selector for common test states.
   * Overrides phase/progress when set.
   * @enum ["custom", "inhale-start", "inhale-mid", "inhale-end", "hold-start", "hold-mid", "hold-end", "exhale-start", "exhale-mid", "exhale-end"]
   * @default "custom"
   */
  preset?:
    | 'custom'
    | 'inhale-start'
    | 'inhale-mid'
    | 'inhale-end'
    | 'hold-start'
    | 'hold-mid'
    | 'hold-end'
    | 'exhale-start'
    | 'exhale-mid'
    | 'exhale-end';

  // ==========================================================================
  // ENVIRONMENT
  // ==========================================================================

  /**
   * Background color for testing
   * @default "#1a1a2e"
   */
  backgroundColor?: string;

  /**
   * Enable orbit controls for inspection
   * @default true
   */
  enableOrbitControls?: boolean;
}

/**
 * Preset configurations for snapshot testing
 */
const PRESETS: Record<string, { phase: number; progress: number; breathPhase: number }> = {
  'inhale-start': { phase: 0, progress: 0, breathPhase: 0 },
  'inhale-mid': { phase: 0, progress: 0.5, breathPhase: 0.5 },
  'inhale-end': { phase: 0, progress: 1, breathPhase: 1 },
  'hold-start': { phase: 1, progress: 0, breathPhase: 1 },
  'hold-mid': { phase: 1, progress: 0.5, breathPhase: 1 },
  'hold-end': { phase: 1, progress: 1, breathPhase: 1 },
  'exhale-start': { phase: 2, progress: 0, breathPhase: 1 },
  'exhale-mid': { phase: 2, progress: 0.5, breathPhase: 0.5 },
  'exhale-end': { phase: 2, progress: 1, breathPhase: 0 },
};

/**
 * HolographicUITestScene - Deterministic test environment
 *
 * Use this scene in Triplex for:
 * - Visual inspection of each breathing phase
 * - Component isolation testing
 * - Screenshot comparison for visual regression
 */
export function HolographicUITestScene({
  // Phase control
  phase = 0,
  progress = 0.5,
  breathPhase = 0.5,

  // Visibility
  showGlobe = true,
  showRings = true,
  showGlyphs = true,
  showWaves = true,

  // Preset
  preset = 'custom',

  // Environment
  backgroundColor = '#1a1a2e',
  enableOrbitControls = true,
}: Partial<HolographicUITestSceneProps> = {}) {
  // Apply preset if not custom
  let finalPhase = phase;
  let finalProgress = progress;
  let finalBreathPhase = breathPhase;

  if (preset !== 'custom' && PRESETS[preset]) {
    const presetConfig = PRESETS[preset];
    finalPhase = presetConfig.phase;
    finalProgress = presetConfig.progress;
    finalBreathPhase = presetConfig.breathPhase;
  }

  return (
    <Suspense fallback={null}>
      {/* Background color */}
      <color attach="background" args={[backgroundColor]} />

      {/* Simple lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      {/* HDR environment for reflections */}
      <DreiEnvironment preset="apartment" />

      {/* Optional orbit controls for inspection */}
      {enableOrbitControls && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
        />
      )}

      {/* Central globe for context */}
      {showGlobe && (
        <EarthGlobe
          radius={1.5}
          enableRotation={false} // Disable rotation for consistent snapshots
          showAtmosphere={true}
          showSparkles={false} // Disable for deterministic renders
          showRing={false} // Using HolographicBreathUI rings instead
          showGlow={true}
          showMist={false} // Disable animated mist for deterministic renders
        />
      )}

      {/* Holographic Breath UI with debug overrides */}
      <HolographicBreathUI
        showRings={showRings}
        showGlyphs={showGlyphs}
        showWaves={showWaves}
        globeRadius={1.5}
        debugPhase={finalPhase}
        debugProgress={finalProgress}
        debugBreathPhase={finalBreathPhase}
      />

      {/* Debug info overlay (Three.js text) */}
      <group position={[0, -2.5, 0]}>{/* Phase label would go here if needed */}</group>
    </Suspense>
  );
}

export default HolographicUITestScene;
