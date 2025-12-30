import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainMenuScreen } from './components/MainMenuScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { SessionOverlay } from './components/SessionOverlay';
import { SettingsScreen } from './components/SettingsScreen';
import { AppNavigationProvider, useAppNavigation } from './contexts/appNavigation';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

/**
 * Main app content that renders based on current navigation state
 */
function AppContent() {
  const { currentScene } = useAppNavigation();

  // Render overlay screens (onboarding, menu, settings) outside Canvas
  if (currentScene === 'onboarding') {
    return <OnboardingScreen />;
  }

  if (currentScene === 'main-menu') {
    return <MainMenuScreen />;
  }

  if (currentScene === 'settings') {
    return <SettingsScreen />;
  }

  // Breathing scene: render the full 3D experience with session overlay
  return (
    <>
      <Canvas
        shadows={false}
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ localClippingEnabled: true }}
      >
        <Stats />
        <CameraRig />
        <KootaSystems breathSystemEnabled={true}>
          <BreathEntity />
          <BreathingLevel />
          <BreathingHUD3D />
        </KootaSystems>
      </Canvas>
      <SessionOverlay />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppNavigationProvider>
        <AppContent />
      </AppNavigationProvider>
    </ErrorBoundary>
  );
}
