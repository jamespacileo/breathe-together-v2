import { Stats } from '@react-three/drei';
import { Canvas, extend, type ThreeToJSXElements } from '@react-three/fiber';
import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { usePresence } from './hooks/usePresence';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';
import { GaiaUIOverlay, type SessionConfig, type SettingsState } from './ui';

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
      {/* 3D Canvas */}
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

      {/* DOM Overlay UI */}
      <GaiaUIOverlay
        showWelcome={!sessionStarted}
        userCount={presence.total}
        onSessionStart={handleSessionStart}
        onSettingsChange={handleSettingsChange}
      />
    </ErrorBoundary>
  );
}
