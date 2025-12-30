import { Stats } from '@react-three/drei';
import { Canvas, extend, type ThreeToJSXElements } from '@react-three/fiber';
import { type CSSProperties, useCallback, useState } from 'react';
import * as THREE from 'three';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { usePresence } from './hooks/usePresence';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';
import { GaiaUIOverlay, type SessionConfig, type SettingsState } from './ui';

/**
 * Canvas container style - ensures canvas layer is below UI overlay
 * z-index: 0 keeps it in the base stacking context
 */
const canvasContainerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
};

// Extend R3F with Three.js types (cast required per R3F v9 migration guide)
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// biome-ignore lint/suspicious/noExplicitAny: R3F v9 migration guide requires casting THREE to any for extend()
extend(THREE as any);

export function App() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const presence = usePresence();

  const handleSessionStart = useCallback((config: SessionConfig) => {
    console.log('Session started:', config);
    setSessionStarted(true);
  }, []);

  const handleSettingsChange = useCallback((settings: SettingsState) => {
    console.log('Settings changed:', settings);
    // TODO: Apply settings to visual entities
  }, []);

  return (
    <ErrorBoundary>
      {/* 3D Canvas - wrapped in container with z-index: 0 to stay below UI */}
      <div style={canvasContainerStyle}>
        <Canvas
          shadows={false}
          camera={{ position: [0, 0, 10], fov: 45 }}
          gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
        >
          <Stats />
          <CameraRig />
          <KootaSystems breathSystemEnabled={true}>
            <BreathEntity />
            <BreathingLevel />
            <BreathingHUD3D />
          </KootaSystems>
        </Canvas>
      </div>

      {/* DOM Overlay UI - z-index: 1100+ ensures it's above canvas layer */}
      <GaiaUIOverlay
        showWelcome={!sessionStarted}
        userCount={presence.total}
        onSessionStart={handleSessionStart}
        onSettingsChange={handleSettingsChange}
      />
    </ErrorBoundary>
  );
}
