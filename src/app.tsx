import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { useCallback, useState } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { CinematicFog, CinematicIntro, type IntroPhase } from './components/cinematic';
import { ErrorBoundary } from './components/ErrorBoundary';
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

export function App() {
  // Track if user has completed intro (for this session)
  const [introComplete, setIntroComplete] = useState(false);

  // Phase state shared with 3D scene for fog
  const [currentPhase, setCurrentPhase] = useState<IntroPhase>('void');
  const [currentProgress, setCurrentProgress] = useState(0);

  // Check if we should skip intro (returning user)
  const skipIntro = hasSeenIntro();

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    markIntroSeen();
  }, []);

  const handleJoin = useCallback(() => {
    // User clicked CTA - mark intro complete
    markIntroSeen();
  }, []);

  return (
    <ErrorBoundary>
      <CinematicIntro skipIntro={skipIntro} onComplete={handleIntroComplete} onJoin={handleJoin}>
        {(phase, progress) => {
          // Update state for any external consumers (though we use inline values)
          if (phase !== currentPhase) setCurrentPhase(phase);
          if (progress !== currentProgress) setCurrentProgress(progress);

          return (
            <Canvas
              shadows={false}
              camera={{ position: [0, 0, 15], fov: 45 }}
              gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
            >
              {import.meta.env.DEV && <Stats />}

              {/* Cinematic fog - clears as intro progresses */}
              {!introComplete && <CinematicFog phase={phase} progress={progress} />}

              <CameraRig
                introMode={!introComplete}
                introProgress={phase === 'complete' ? 1 : progress}
              />

              <KootaSystems breathSystemEnabled={true}>
                <AudioProvider>
                  <BreathEntity />
                  <BreathingLevel introPhase={phase} />
                </AudioProvider>
              </KootaSystems>
            </Canvas>
          );
        }}
      </CinematicIntro>
    </ErrorBoundary>
  );
}
