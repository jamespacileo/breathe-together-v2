import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { useCallback, useState } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { CinematicFog, CinematicIntro } from './components/cinematic';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainMenu } from './components/MainMenu';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

// Extend R3F with Three.js types
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

/**
 * Check if user has seen intro before (localStorage)
 */
function hasSeenIntro(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('breathe-together-intro-seen') === 'true';
}

/**
 * Mark intro as seen
 */
function markIntroSeen(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('breathe-together-intro-seen', 'true');
  }
}

/**
 * Reset intro seen flag (for testing)
 */
export function resetIntroSeen(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('breathe-together-intro-seen');
    window.location.reload();
  }
}

export function App() {
  // Track if user has completed intro (for this session)
  const [introComplete, setIntroComplete] = useState(hasSeenIntro());

  // Track if user has clicked "Join" - this is separate from intro completion
  // Both new and returning users need to click Join to see the full experience
  const [hasJoined, setHasJoined] = useState(false);

  // Check if we should skip intro (returning user)
  const skipIntro = hasSeenIntro();

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    markIntroSeen();
  }, []);

  const handleJoin = useCallback(() => {
    setHasJoined(true);
    markIntroSeen();
  }, []);

  return (
    <ErrorBoundary>
      {/* Main Menu overlay - shown for returning users or after intro ends */}
      {/* This creates a consistent "main menu" state for all users */}
      {introComplete && !hasJoined && <MainMenu onJoin={handleJoin} />}

      <CinematicIntro skipIntro={skipIntro} onComplete={handleIntroComplete} onJoin={handleJoin}>
        {(phase, progress) => (
          <Canvas
            shadows={false}
            camera={{ position: [0, 0, 15], fov: 45 }}
            gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
          >
            {import.meta.env.DEV && <Stats />}

            {/* Cinematic fog - clears as intro progresses */}
            {!introComplete && <CinematicFog phase={phase} progress={progress} />}

            <CameraRig introMode={!hasJoined} introProgress={phase === 'complete' ? 1 : progress} />

            <KootaSystems breathSystemEnabled={true}>
              <AudioProvider>
                <BreathEntity />
                <BreathingLevel hasJoined={hasJoined} />
              </AudioProvider>
            </KootaSystems>
          </Canvas>
        )}
      </CinematicIntro>
    </ErrorBoundary>
  );
}
