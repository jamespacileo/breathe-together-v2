import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { type CSSProperties, useCallback, useState } from 'react';
import type * as THREE from 'three';
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

// Extend R3F with Three.js types
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

/**
 * Default visual settings - matches GaiaUIOverlay defaults
 */
const DEFAULT_VISUAL_SETTINGS = {
  harmony: 48,
  shardSize: 0.5,
  orbitRadius: 4.5,
  refraction: 1.3,
  glassDepth: 0.3,
  atmosphereDensity: 100,
};

export function App() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [visualSettings, setVisualSettings] = useState(DEFAULT_VISUAL_SETTINGS);
  const presence = usePresence();

  const handleSessionStart = useCallback((config: SessionConfig) => {
    console.log('Session started:', config);
    setSessionStarted(true);
  }, []);

  const handleSettingsChange = useCallback((settings: SettingsState) => {
    setVisualSettings({
      harmony: settings.harmony,
      shardSize: settings.shardSize,
      orbitRadius: settings.orbitRadius,
      refraction: settings.refraction,
      glassDepth: settings.glassDepth,
      atmosphereDensity: settings.atmosphereDensity,
    });
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
          {import.meta.env.DEV && <Stats />}
          <CameraRig />
          <KootaSystems breathSystemEnabled={true}>
            <BreathEntity />
            <BreathingLevel
              harmony={visualSettings.harmony}
              shardSize={visualSettings.shardSize}
              orbitRadius={visualSettings.orbitRadius}
              ior={visualSettings.refraction}
              glassDepth={visualSettings.glassDepth}
              atmosphereDensity={visualSettings.atmosphereDensity}
            />
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
