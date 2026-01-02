import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { AboutModal } from './components/AboutModal';
import { CinematicFog, CinematicIntro } from './components/cinematic';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TutorialPromptModal } from './components/TutorialPromptModal';
import { WelcomeModal } from './components/WelcomeModal';
import type { MoodId } from './constants';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { useViewport } from './hooks/useViewport';
import { BreathingLevel, BreathingLevelUI } from './levels/breathing';
import { TutorialLevel } from './levels/tutorial';
import { KootaSystems } from './providers';

// Lazy load admin panel (only loads when needed)
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Extend R3F with Three.js types
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// Simple URL-based routing
function useCurrentPath(): string {
  return typeof window !== 'undefined' ? window.location.pathname : '/';
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

/**
 * App - Root component with proper event handling architecture.
 *
 * Uses the R3F recommended eventSource pattern:
 * - Canvas receives events via shared parent (eventSource)
 * - Canvas automatically gets pointer-events: none
 * - HTML UI renders as siblings, naturally receiving events
 * - No need for exclusion zones or complex cursor management
 *
 * App state machine phases:
 * - intro: CinematicIntro (letterbox + title + mood selection)
 * - tutorial-prompt: TutorialPromptModal asking if user wants guidance
 * - tutorial: TutorialLevel with step-by-step introduction
 * - breathing: Full BreathingLevel experience
 *
 * @see https://r3f.docs.pmnd.rs/api/canvas#extracting-events
 */
export function App() {
  // biome-ignore lint/style/noNonNullAssertion: R3F eventSource requires non-null ref; ref is always assigned before Canvas renders
  const containerRef = useRef<HTMLDivElement>(null!);
  const path = useCurrentPath();
  const { isMobile, isTablet } = useViewport();

  // App state machine
  const [appPhase, setAppPhase] = useState<AppPhase>('intro');

  // User's selected mood (from intro mood selection)
  const [selectedMood, setSelectedMood] = useState<MoodId | undefined>(undefined);

  // Whether user is returning (affects tutorial prompt copy)
  const [returningUser] = useState(() => isReturningUser());

  // Welcome modal visibility (shown when first entering breathing phase)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // About modal visibility
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Layered reveal progress (0→1 over 3s after entering breathing phase)
  // Shared with CameraRig and BreathingLevel for coordinated transitions
  const [joinProgress, setJoinProgress] = useState(0);

  // RAF ref for cleanup
  const rafRef = useRef<number | null>(null);

  // Derived state for cleaner conditionals
  const isInBreathingPhase = appPhase === 'breathing';
  const isInTutorialPhase = appPhase === 'tutorial';
  const hasLeftIntro = appPhase !== 'intro';

  // Scene readiness flags - only run onboarding after full reveal
  const shouldRunOnboarding = isInBreathingPhase && joinProgress >= 1;
  const shouldPlayText = isInBreathingPhase && joinProgress >= 1;

  // Disable antialias on mobile/tablet for 5-10% performance improvement
  const glConfig = useMemo(
    () => ({
      antialias: !isMobile && !isTablet,
      alpha: true,
      localClippingEnabled: true,
      // Reduce pixel ratio on mobile for better performance
      pixelRatio: isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio,
    }),
    [isMobile, isTablet],
  );

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

  // Handle direct tutorial start from intro screen
  const handleDirectTutorial = useCallback(() => {
    setAppPhase('tutorial');
  }, []);

  // Handle about button from intro screen
  const handleAbout = useCallback(() => {
    setShowAboutModal(true);
  }, []);

  // Handle tutorial prompt: user wants tutorial
  const handleStartTutorial = useCallback(() => {
    setAppPhase('tutorial');
  }, []);

  // Handle tutorial prompt: user skips tutorial
  const handleSkipTutorial = useCallback(() => {
    markUserJoined();
    setAppPhase('breathing');
    setShowWelcomeModal(true);
  }, []);

  // Handle tutorial completion → transition to full breathing experience
  const handleTutorialComplete = useCallback(() => {
    markUserJoined();
    setAppPhase('breathing');
    setShowWelcomeModal(true);
  }, []);

  // Handle welcome modal dismissal
  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcomeModal(false);
  }, []);

  // Handle back to main menu from breathing screen
  const handleBackToMenu = useCallback(() => {
    setAppPhase('intro');
    setJoinProgress(0);
    setSelectedMood(undefined);
    setShowWelcomeModal(false);
  }, []);

  // Admin panel route
  if (path === '/admin') {
    return (
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              background: '#1a1a1a',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Loading admin panel...
          </div>
        }
      >
        <AdminPanel />
      </Suspense>
    );
  }

  // Main breathing app
  return (
    <ErrorBoundary>
      {/* CinematicIntro handles ALL users - the beautiful intro is always shown */}
      <CinematicIntro onJoin={handleJoin} onTutorial={handleDirectTutorial} onAbout={handleAbout}>
        {(phase, progress) => (
          /* Shared event source - both Canvas and HTML UI are children */
          <div ref={containerRef} className="relative w-full h-full">
            {/* 3D Canvas - receives events via eventSource, has pointer-events: none */}
            <Canvas
              eventSource={containerRef}
              eventPrefix="client"
              shadows={false}
              camera={{ position: [0, 0, 15], fov: 45 }}
              gl={glConfig}
              dpr={isMobile ? [1, 2] : [1, 2]}
              className="!absolute inset-0"
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

            {/* HTML UI - siblings of Canvas, naturally receive pointer events */}
            {/* Only show UI when in breathing phase and reveal is complete */}
            {isInBreathingPhase && joinProgress > 0.85 && (
              <div
                style={{
                  opacity: Math.min((joinProgress - 0.85) / 0.15, 1),
                  transition: 'opacity 0.3s ease-out',
                }}
              >
                <BreathingLevelUI
                  shouldRunOnboarding={shouldRunOnboarding}
                  shouldPlayText={shouldPlayText}
                />

                {/* Back to Menu button */}
                <button
                  type="button"
                  onClick={handleBackToMenu}
                  aria-label="Back to menu"
                  style={{
                    position: 'fixed',
                    top: '24px',
                    left: '24px',
                    background: 'rgba(253, 251, 247, 0.8)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(160, 140, 120, 0.2)',
                    borderRadius: '24px',
                    padding: '10px 20px',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#6a5a4a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                    zIndex: 100,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Menu
                </button>
              </div>
            )}
          </div>
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

      {/* Welcome modal - appears when entering breathing phase */}
      {showWelcomeModal && <WelcomeModal onDismiss={handleWelcomeDismiss} />}

      {/* About modal */}
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </ErrorBoundary>
  );
}
