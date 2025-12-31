import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { CinematicFog, CinematicIntro } from './components/cinematic';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TutorialPromptModal } from './components/TutorialPromptModal';
import type { MoodId } from './constants';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { TutorialLevel } from './levels/tutorial';
import { KootaSystems } from './providers';

// Extend R3F with Three.js types
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

/**
 * App state machine phases:
 * - intro: CinematicIntro (letterbox + title + mood selection)
 * - tutorial-prompt: TutorialPromptModal asking if user wants guidance
 * - tutorial: TutorialLevel with step-by-step introduction
 * - breathing: Full BreathingLevel experience
 */
type AppPhase = 'intro' | 'tutorial-prompt' | 'tutorial' | 'breathing';

/**
 * Check if user is returning (has joined before)
 * Used to adjust tutorial prompt copy, NOT to skip the beautiful intro
 */
export function isReturningUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('breathe-together-intro-seen') === 'true';
}

/**
 * Mark user as having joined (for adjusting prompts next time)
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
  // App state machine
  const [appPhase, setAppPhase] = useState<AppPhase>('intro');

  // User's selected mood (from intro mood selection)
  const [selectedMood, setSelectedMood] = useState<MoodId | undefined>(undefined);

  // Whether user is returning (affects tutorial prompt copy)
  const [returningUser] = useState(() => isReturningUser());

  // Layered reveal progress (0→1 over 3s after entering breathing phase)
  // Shared with CameraRig and BreathingLevel for coordinated transitions
  const [joinProgress, setJoinProgress] = useState(0);

  // RAF ref for cleanup
  const rafRef = useRef<number | null>(null);

  // Derived state for cleaner conditionals
  const isInBreathingPhase = appPhase === 'breathing';
  const isInTutorialPhase = appPhase === 'tutorial';
  const hasLeftIntro = appPhase !== 'intro';

  // Animate joinProgress when entering breathing phase (with proper cleanup)
  useEffect(() => {
    if (!isInBreathingPhase) {
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

    // Cleanup: cancel RAF if component unmounts or phase changes
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isInBreathingPhase]);

  // Handle mood selection from CinematicIntro → show tutorial prompt
  const handleJoin = useCallback((mood?: string) => {
    setSelectedMood(mood as MoodId | undefined);
    // Store mood for persistence
    if (mood) {
      localStorage.setItem('breathe-together-selected-mood', mood);
    }
    // Show tutorial prompt instead of going directly to breathing
    setAppPhase('tutorial-prompt');
  }, []);

  // Handle tutorial prompt: user wants tutorial
  const handleStartTutorial = useCallback(() => {
    setAppPhase('tutorial');
  }, []);

  // Handle tutorial prompt: user skips tutorial
  const handleSkipTutorial = useCallback(() => {
    markUserJoined();
    setAppPhase('breathing');
  }, []);

  // Handle tutorial completion → transition to full breathing experience
  const handleTutorialComplete = useCallback(() => {
    markUserJoined();
    setAppPhase('breathing');
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

            {/* Cinematic fog - clears as intro progresses, removed after leaving intro */}
            {!hasLeftIntro && <CinematicFog phase={phase} progress={progress} />}

            <CameraRig
              introMode={!hasLeftIntro}
              introProgress={phase === 'complete' ? 1 : progress}
              joinProgress={joinProgress}
            />

            <KootaSystems breathSystemEnabled={true}>
              <AudioProvider>
                <BreathEntity />

                {/* Tutorial scene - minimal view with user's shape */}
                {isInTutorialPhase && (
                  <TutorialLevel userMood={selectedMood} onComplete={handleTutorialComplete} />
                )}

                {/* Full breathing experience - shown after tutorial or skip */}
                {isInBreathingPhase && (
                  <BreathingLevel hasJoined={true} joinProgress={joinProgress} />
                )}

                {/* During intro/tutorial-prompt, show minimal globe (handled by BreathingLevel with hasJoined=false) */}
                {!isInTutorialPhase && !isInBreathingPhase && (
                  <BreathingLevel hasJoined={false} joinProgress={0} />
                )}
              </AudioProvider>
            </KootaSystems>
          </Canvas>
        )}
      </CinematicIntro>

      {/* Tutorial prompt modal - appears after mood selection */}
      {appPhase === 'tutorial-prompt' && (
        <TutorialPromptModal
          onStartTutorial={handleStartTutorial}
          onSkipTutorial={handleSkipTutorial}
          isReturningUser={returningUser}
        />
      )}
    </ErrorBoundary>
  );
}
