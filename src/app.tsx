import { Stats } from '@react-three/drei';
import { Canvas, extend, type ThreeToJSXElements } from '@react-three/fiber';
import * as THREE from 'three';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppState } from './contexts/appState';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';
import { MainMenu, OnboardingScreen, SettingsScreen } from './screens';

/**
 * Screen Router Component
 * Renders the appropriate screen based on app state
 * Must be inside Canvas for @react-three/uikit screens
 */
function ScreenRouter() {
  const { currentScreen } = useAppState();

  // Only run breath system during breathing screen
  const breathSystemEnabled = currentScreen === 'breathing';

  return (
    <KootaSystems breathSystemEnabled={breathSystemEnabled}>
      {/* BreathEntity always mounted to maintain ECS state */}
      <BreathEntity />

      {/* Screen-specific content */}
      {currentScreen === 'onboarding' && <OnboardingScreen />}
      {currentScreen === 'menu' && <MainMenu />}
      {currentScreen === 'settings' && <SettingsScreen />}
      {currentScreen === 'breathing' && (
        <>
          <BreathingLevel />
          <BreathingHUD3D />
        </>
      )}
    </KootaSystems>
  );
}

// Extend R3F with Three.js types (cast required per R3F v9 migration guide)
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// biome-ignore lint/suspicious/noExplicitAny: R3F v9 migration guide requires casting THREE to any for extend()
extend(THREE as any);

export function App() {
  return (
    <ErrorBoundary>
      <Canvas
        shadows={false}
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
      >
        <Stats />
        <CameraRig />
        <ScreenRouter />
      </Canvas>
    </ErrorBoundary>
  );
}
