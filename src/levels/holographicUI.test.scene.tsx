/**
 * HolographicUI Test Scene - Deterministic visual testing
 *
 * A dedicated test scene for the holographic breathing UI components.
 * Provides manual controls to step through phases and verify rendering.
 *
 * Features:
 * - Manual phase control (inhale/hold/exhale)
 * - Phase progress slider (0-1)
 * - Timer seconds override
 * - Presence count adjustment
 * - Individual component toggles
 * - Globe reference for scale
 *
 * Usage in Triplex:
 * 1. Open this scene in Triplex
 * 2. Use sliders to set exact phase states
 * 3. Verify each component renders correctly
 * 4. Test transitions between states
 */

import { OrbitControls, Sphere } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { HolographicBreathingUI } from '../entities/holographicUI';

interface HolographicUITestSceneProps {
  /**
   * Phase index (0=inhale, 1=hold, 2=exhale)
   * @min 0 @max 2 @step 1
   * @default 0
   */
  phaseIndex?: number;

  /**
   * Progress within current phase (0-1)
   * @min 0 @max 1 @step 0.05
   * @default 0
   */
  phaseProgress?: number;

  /**
   * Timer seconds to display
   * @min 1 @max 8 @step 1
   * @default 4
   */
  timerSeconds?: number;

  /**
   * Number of presence stars
   * @min 0 @max 100 @step 5
   * @default 42
   */
  presenceCount?: number;

  /**
   * Globe radius
   * @min 1 @max 3 @step 0.1
   * @default 1.5
   */
  globeRadius?: number;

  /**
   * Show progress ring
   * @default true
   */
  showProgressRing?: boolean;

  /**
   * Show phase labels
   * @default true
   */
  showPhaseLabels?: boolean;

  /**
   * Show timer ribbon
   * @default true
   */
  showTimer?: boolean;

  /**
   * Show 4·7·8 markers
   * @default true
   */
  showPhaseMarkers?: boolean;

  /**
   * Show presence constellation
   * @default true
   */
  showPresence?: boolean;

  /**
   * Show reference globe
   * @default true
   */
  showGlobe?: boolean;

  /**
   * Use test values (manual control) instead of UTC time
   * @default true
   */
  useTestValues?: boolean;

  /**
   * Background color
   * @default '#f5f0e8'
   */
  backgroundColor?: string;
}

/**
 * Reference globe for scale/positioning verification
 */
function ReferenceGlobe({ radius = 1.5, visible = true }: { radius?: number; visible?: boolean }) {
  if (!visible) return null;

  return (
    <Sphere args={[radius, 32, 32]}>
      <meshStandardMaterial
        color="#8b6f47"
        transparent
        opacity={0.6}
        roughness={0.8}
        metalness={0.1}
      />
    </Sphere>
  );
}

/**
 * Test scene inner content (inside Canvas)
 */
function TestSceneContent({
  phaseIndex = 0,
  phaseProgress = 0,
  timerSeconds = 4,
  presenceCount = 42,
  globeRadius = 1.5,
  showProgressRing = true,
  showPhaseLabels = true,
  showTimer = true,
  showPhaseMarkers = true,
  showPresence = true,
  showGlobe = true,
  useTestValues = true,
}: HolographicUITestSceneProps) {
  // Calculate breath phase (0-1) from phase index and progress
  const breathPhase =
    phaseIndex === 0
      ? phaseProgress // Inhale: 0→1
      : phaseIndex === 1
        ? 1 // Hold: stay at 1
        : 1 - phaseProgress; // Exhale: 1→0

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      {/* Reference globe */}
      <ReferenceGlobe radius={globeRadius} visible={showGlobe} />

      {/* Holographic UI */}
      <HolographicBreathingUI
        globeRadius={globeRadius}
        presenceCount={presenceCount}
        showProgressRing={showProgressRing}
        showPhaseLabels={showPhaseLabels}
        showTimer={showTimer}
        showPhaseMarkers={showPhaseMarkers}
        showPresence={showPresence}
        testPhaseIndex={phaseIndex}
        testPhaseProgress={phaseProgress}
        testBreathPhase={breathPhase}
        testSeconds={timerSeconds}
        useTestValues={useTestValues}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={2}
        maxDistance={10}
        target={[0, 0, 0]}
      />
    </>
  );
}

/**
 * Main test scene component - use in Triplex or standalone
 */
export function HolographicUITestScene(props: HolographicUITestSceneProps) {
  // Note: backgroundColor is used when rendering in standalone Canvas (see HolographicUITestPage)
  // For Triplex, the scene renders without its own Canvas, so this is just passed through
  return (
    <group>
      <TestSceneContent {...props} />
    </group>
  );
}

/**
 * Standalone test page with interactive controls
 * Run this directly to test outside of Triplex
 */
export function HolographicUITestPage() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(4);
  const [presenceCount, setPresenceCount] = useState(42);
  const [useTestValues, setUseTestValues] = useState(true);
  const [showProgressRing, setShowProgressRing] = useState(true);
  const [showPhaseLabels, setShowPhaseLabels] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [showPhaseMarkers, setShowPhaseMarkers] = useState(true);
  const [showPresence, setShowPresence] = useState(true);

  const phaseNames = ['Inhale', 'Hold', 'Exhale'];

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* Control panel */}
      <div
        style={{
          width: 280,
          padding: 16,
          background: '#f5f0e8',
          borderRight: '1px solid #ddd',
          overflow: 'auto',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#3d3229' }}>Holographic UI Test</h3>

        {/* Test mode toggle */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useTestValues}
              onChange={(e) => setUseTestValues(e.target.checked)}
            />
            <span>Manual Control (vs UTC time)</span>
          </label>
        </div>

        {/* Phase control */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Phase: {phaseNames[phaseIndex]}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {phaseNames.map((name, idx) => (
              <button
                key={name}
                type="button"
                onClick={() => setPhaseIndex(idx)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  border: 'none',
                  borderRadius: 6,
                  background: phaseIndex === idx ? '#c9a06c' : '#e8e4dc',
                  color: phaseIndex === idx ? 'white' : '#5a4d42',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Progress slider */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Progress: {(phaseProgress * 100).toFixed(0)}%</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={phaseProgress}
            onChange={(e) => setPhaseProgress(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Timer seconds */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Timer: {timerSeconds}s</div>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Presence count */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Presence: {presenceCount} users</div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={presenceCount}
            onChange={(e) => setPresenceCount(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Component toggles */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Components</div>
          {[
            { label: 'Progress Ring', value: showProgressRing, setter: setShowProgressRing },
            { label: 'Phase Labels', value: showPhaseLabels, setter: setShowPhaseLabels },
            { label: 'Timer', value: showTimer, setter: setShowTimer },
            {
              label: 'Phase Markers (4·7·8)',
              value: showPhaseMarkers,
              setter: setShowPhaseMarkers,
            },
            { label: 'Presence Stars', value: showPresence, setter: setShowPresence },
          ].map(({ label, value, setter }) => (
            <label
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
                cursor: 'pointer',
              }}
            >
              <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Quick presets */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Quick Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => {
                setPhaseIndex(0);
                setPhaseProgress(0);
                setTimerSeconds(4);
              }}
              style={{
                padding: 8,
                borderRadius: 6,
                border: 'none',
                background: '#e8e4dc',
                cursor: 'pointer',
              }}
            >
              Start of Inhale
            </button>
            <button
              type="button"
              onClick={() => {
                setPhaseIndex(0);
                setPhaseProgress(1);
                setTimerSeconds(1);
              }}
              style={{
                padding: 8,
                borderRadius: 6,
                border: 'none',
                background: '#e8e4dc',
                cursor: 'pointer',
              }}
            >
              End of Inhale
            </button>
            <button
              type="button"
              onClick={() => {
                setPhaseIndex(1);
                setPhaseProgress(0.5);
                setTimerSeconds(4);
              }}
              style={{
                padding: 8,
                borderRadius: 6,
                border: 'none',
                background: '#e8e4dc',
                cursor: 'pointer',
              }}
            >
              Mid Hold
            </button>
            <button
              type="button"
              onClick={() => {
                setPhaseIndex(2);
                setPhaseProgress(0.5);
                setTimerSeconds(4);
              }}
              style={{
                padding: 8,
                borderRadius: 6,
                border: 'none',
                background: '#e8e4dc',
                cursor: 'pointer',
              }}
            >
              Mid Exhale
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 2, 5], fov: 50 }} style={{ background: '#f5f0e8' }}>
          <TestSceneContent
            phaseIndex={phaseIndex}
            phaseProgress={phaseProgress}
            timerSeconds={timerSeconds}
            presenceCount={presenceCount}
            useTestValues={useTestValues}
            showProgressRing={showProgressRing}
            showPhaseLabels={showPhaseLabels}
            showTimer={showTimer}
            showPhaseMarkers={showPhaseMarkers}
            showPresence={showPresence}
            showGlobe={true}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default HolographicUITestScene;
