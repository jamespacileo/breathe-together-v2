import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { CinematicFog, CinematicIntro } from './components/cinematic';
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
 * Check if user is returning (has joined before)
 * Used to skip onboarding modals, NOT the beautiful intro animation
 */
export function isReturningUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('breathe-together-intro-seen') === 'true';
}

/**
 * Mark user as having joined (for skipping onboarding next time)
 */
function markUserJoined(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('breathe-together-intro-seen', 'true');
  }
}

/**
 * Reset returning user flag (for testing)
 */
export function resetReturningUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('breathe-together-intro-seen');
    localStorage.removeItem('breathe-together-selected-mood');
    window.location.reload();
  }
}

export function App() {
  // Track if user has clicked "Join" to enter full experience
  const [hasJoined, setHasJoined] = useState(false);

  // Layered reveal progress (0→1 over 3s after joining)
  // Shared with CameraRig and BreathingLevel for coordinated transitions
  const [joinProgress, setJoinProgress] = useState(0);

  // RAF ref for cleanup
  const rafRef = useRef<number | null>(null);

  // Animate joinProgress after user joins (with proper cleanup)
  useEffect(() => {
    if (!hasJoined) {
      setJoinProgress(0);
      return;
    }

    const duration = 3000; // 3 seconds for full reveal
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      // Ease out cubic for smooth deceleration
      const linear = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - linear) ** 3;
      setJoinProgress(eased);

      if (linear < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    // Cleanup: cancel RAF if component unmounts or hasJoined changes
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [hasJoined]);

  const handleJoin = useCallback(() => {
    setHasJoined(true);
    markUserJoined();
  }, []);

  return (
    <ErrorBoundary>
      {/* CinematicIntro handles ALL users - the beautiful intro is always shown */}
      <CinematicIntro onJoin={handleJoin}>
        {(phase, progress) => (
          <Canvas
            shadows={false}
            camera={{ position: [0, 0, 15], fov: 45 }}
            gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
          >
            {import.meta.env.DEV && <Stats />}

            {/* Cinematic fog - clears as intro progresses, removed after joining */}
            {!hasJoined && <CinematicFog phase={phase} progress={progress} />}

            <CameraRig
              introMode={!hasJoined}
              introProgress={phase === 'complete' ? 1 : progress}
              joinProgress={joinProgress}
            />

            <KootaSystems breathSystemEnabled={true}>
              <AudioProvider>
                <BreathEntity />
                <BreathingLevel hasJoined={hasJoined} joinProgress={joinProgress} />
              </AudioProvider>
            </KootaSystems>
          </Canvas>
        )}
      </CinematicIntro>
    </ErrorBoundary>
  );
}
