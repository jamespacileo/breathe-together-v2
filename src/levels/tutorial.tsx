import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BreathingProgressRing } from '../components/BreathingProgressRing';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE, type MoodId } from '../constants';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { useTutorialTour } from '../hooks/useTutorialTour';
import { calculatePhaseInfo } from '../lib/breathPhase';
import '../styles/tutorial-tour.css';

/**
 * Tutorial phases - tracks progression through the experience
 *
 * Flow:
 * 1. tour: Driver.js guided tour (welcome → technique → user intro)
 * 2. breathing: Practice one breathing cycle with prompts
 * 3. others: Reveal social aspect
 * 4. complete: Exit to main experience
 */
type TutorialPhase = 'tour' | 'breathing' | 'others' | 'complete';

interface TutorialLevelProps {
  /** User's selected mood */
  userMood?: MoodId;
  /** Called when tutorial completes */
  onComplete: () => void;
}

// Phase guidance with timing info
const PHASE_GUIDANCE = [
  { text: 'Breathe in...', duration: BREATH_PHASES.INHALE },
  { text: 'Hold...', duration: BREATH_PHASES.HOLD_IN },
  { text: 'Release...', duration: BREATH_PHASES.EXHALE },
];

/**
 * TutorialLevel - Driver.js guided introduction to breathing.
 *
 * Uses Driver.js for step-by-step tour explaining:
 * - The 4-7-8 breathing technique
 * - User's presence visualization
 * - How to follow breathing prompts
 *
 * After tour, user practices one cycle then sees others.
 */
export function TutorialLevel({ userMood = 'presence', onComplete }: TutorialLevelProps) {
  const [phase, setPhase] = useState<TutorialPhase>('tour');
  const [isExiting, setIsExiting] = useState(false);

  // Track breathing phase for UI
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Show user shard after welcome step
  const [showUserShard, setShowUserShard] = useState(false);

  // Track breathing cycles completed
  const cyclesCompletedRef = useRef(0);
  const lastPhaseIndexRef = useRef(-1);

  // Others reveal progress
  const [othersRevealProgress, setOthersRevealProgress] = useState(0);

  // Track if we've already triggered completion
  const hasTriggeredComplete = useRef(false);

  // Handle final completion
  const handleComplete = useCallback(() => {
    if (hasTriggeredComplete.current) return;
    hasTriggeredComplete.current = true;
    setIsExiting(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  // Driver.js tour callbacks
  const handleWelcomeComplete = useCallback(() => {
    setShowUserShard(true);
  }, []);

  const handleBreathingStart = useCallback(() => {
    // Tour moves to breathing target, but we start breathing after tour ends
  }, []);

  const handleTourComplete = useCallback(() => {
    setPhase('breathing');
  }, []);

  // Initialize Driver.js tour
  const tour = useTutorialTour({
    onWelcomeComplete: handleWelcomeComplete,
    onBreathingStart: handleBreathingStart,
    onComplete: handleTourComplete,
    onDestroy: handleTourComplete,
  });

  // Start tour on mount
  useEffect(() => {
    // Small delay to ensure DOM targets are rendered
    const timer = setTimeout(() => {
      tour.start();
    }, 500);
    return () => clearTimeout(timer);
  }, [tour]);

  // RAF loop for breathing phase tracking
  useEffect(() => {
    // Only track during breathing phase
    if (phase !== 'breathing') {
      return;
    }

    let rafId: number;

    const tick = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex: idx, phaseProgress: progress } = calculatePhaseInfo(cycleTime);

      setPhaseProgress(progress);
      setPhaseIndex(idx);

      // Detect cycle completion
      if (idx === 0 && lastPhaseIndexRef.current === 2) {
        cyclesCompletedRef.current += 1;

        // After one full cycle, show others
        if (cyclesCompletedRef.current >= 1) {
          setPhase('others');
        }
      }
      lastPhaseIndexRef.current = idx;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  // Animate others reveal
  useEffect(() => {
    if (phase !== 'others') {
      return;
    }

    let rafId: number;
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 2;
      setOthersRevealProgress(eased);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  // Auto-complete after others reveal
  useEffect(() => {
    if (phase !== 'others' || othersRevealProgress < 1) return;

    const timer = setTimeout(() => {
      handleComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, othersRevealProgress, handleComplete]);

  // Create user's single shard
  const userShard = useMemo(() => [{ id: 'user', mood: userMood }], [userMood]);

  // Create mock users for "others" phase
  const otherUsers = useMemo(() => {
    const moods: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];
    return Array.from({ length: 24 }, (_, i) => ({
      id: `other-${i}`,
      mood: moods[i % moods.length],
    }));
  }, []);

  // Determine what to show
  const showOthers = phase === 'others';
  const showAtmosphere = phase === 'others';
  const showProgressRing = phase === 'breathing';
  const showBreathingUI = phase === 'breathing';

  // Current phase guidance
  const guidance = PHASE_GUIDANCE[phaseIndex];

  // Content opacity for transitions
  const contentOpacity = isExiting ? 0 : 1;

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <RefractionPipeline ior={1.3} backfaceIntensity={0.3}>
          {/* Minimal environment - stars only */}
          <Environment showClouds={false} showStars={true} />

          <PresentationControls
            global
            cursor={true}
            snap={false}
            speed={1}
            damping={0.3}
            polar={[-Math.PI * 0.3, Math.PI * 0.3]}
            azimuth={[-Infinity, Infinity]}
          >
            <EarthGlobe />

            {/* User's shard - shows after welcome step */}
            {showUserShard && (
              <ParticleSwarm users={userShard} baseRadius={4.5} maxShardSize={0.7} />
            )}

            {/* Other users - fade in during others phase */}
            {showOthers && (
              <group>
                <ParticleSwarm users={otherUsers} baseRadius={4.5} maxShardSize={0.5} />
              </group>
            )}

            {/* Atmospheric particles */}
            {showAtmosphere && (
              <AtmosphericParticles
                count={50}
                size={0.06}
                baseOpacity={0.08 * othersRevealProgress}
                breathingOpacity={0.12 * othersRevealProgress}
              />
            )}
          </PresentationControls>
        </RefractionPipeline>

        {/* Tutorial UI overlay */}
        <Html fullscreen>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: contentOpacity,
              transition: 'opacity 0.6s ease-out',
            }}
          >
            {/* Centered content area */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Progress ring during breathing phase */}
              {showProgressRing && (
                <BreathingProgressRing
                  phaseIndex={phaseIndex}
                  phaseProgress={phaseProgress}
                  size={320}
                  strokeWidth={4}
                />
              )}

              {/* Breathing guidance text */}
              {showBreathingUI && guidance && (
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 'clamp(1.6rem, 6vw, 2.4rem)',
                      fontWeight: 300,
                      color: '#4a3f35',
                      letterSpacing: '0.12em',
                      margin: 0,
                      textShadow:
                        '0 0 40px rgba(255, 252, 240, 0.9), 0 0 80px rgba(201, 160, 108, 0.4)',
                    }}
                  >
                    {guidance.text}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '0.9rem',
                      fontWeight: 400,
                      color: '#7a6b5a',
                      letterSpacing: '0.08em',
                      marginTop: '8px',
                      textShadow: '0 0 20px rgba(255, 252, 240, 0.8)',
                    }}
                  >
                    {guidance.duration} seconds
                  </p>
                </div>
              )}

              {/* Others reveal message */}
              {phase === 'others' && (
                <div
                  style={{
                    textAlign: 'center',
                    opacity: othersRevealProgress,
                    transition: 'opacity 0.5s ease',
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 'clamp(1.4rem, 5vw, 2rem)',
                      fontWeight: 300,
                      color: '#4a3f35',
                      letterSpacing: '0.12em',
                      margin: 0,
                      textShadow:
                        '0 0 40px rgba(255, 252, 240, 0.9), 0 0 80px rgba(201, 160, 108, 0.4)',
                    }}
                  >
                    You're not alone
                  </p>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '1rem',
                      fontWeight: 400,
                      color: '#7a6b5a',
                      letterSpacing: '0.08em',
                      marginTop: '12px',
                      textShadow: '0 0 20px rgba(255, 252, 240, 0.8)',
                    }}
                  >
                    73 others are breathing with you right now
                  </p>
                </div>
              )}
            </div>

            {/* Skip button - always visible */}
            <button
              type="button"
              onClick={() => {
                tour.destroy();
                handleComplete();
              }}
              style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'transparent',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.65rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#9a8a7a',
                cursor: 'pointer',
                pointerEvents: 'auto',
                opacity: 0.7,
                transition: 'opacity 0.2s ease',
              }}
            >
              Skip Tutorial
            </button>
          </div>
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default TutorialLevel;
