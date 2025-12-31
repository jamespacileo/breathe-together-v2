import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BreathingProgressRing } from '../components/BreathingProgressRing';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TutorialModal } from '../components/TutorialModal';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE, type MoodId } from '../constants';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { calculatePhaseInfo } from '../lib/breathPhase';

/**
 * Tutorial steps - modal-guided progression
 *
 * Flow:
 * 1. welcome-modal: Explain 4/7/8 technique
 * 2. your-shape: Brief intro to user's presence (3s)
 * 3. breathing: Guided breathing with segmented progress ring
 * 4. others-modal: Reveal others are breathing together
 * 5. complete: Exit to main experience
 */
type TutorialStep = 'welcome-modal' | 'your-shape' | 'breathing' | 'others-modal';

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
 * TutorialLevel - Modal-guided introduction to breathing.
 *
 * Key design decisions:
 * - Welcome modal explains 4/7/8 technique upfront
 * - Segmented progress ring shows all phases proportionally
 * - Others modal creates suspense before joining
 * - User controls progression via modals
 */
export function TutorialLevel({ userMood = 'presence', onComplete }: TutorialLevelProps) {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome-modal');
  const [isExiting, setIsExiting] = useState(false);

  // Track breathing phase for UI
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

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

  // Handle welcome modal continue
  const handleWelcomeContinue = useCallback(() => {
    setCurrentStep('your-shape');
    // Auto-advance to breathing after 3s
    setTimeout(() => setCurrentStep('breathing'), 3000);
  }, []);

  // Handle others modal continue
  const handleOthersContinue = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // RAF loop for breathing phase tracking
  useEffect(() => {
    // Don't track during modals
    if (currentStep === 'welcome-modal' || currentStep === 'others-modal') {
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
      if (currentStep === 'breathing') {
        if (idx === 0 && lastPhaseIndexRef.current === 2) {
          cyclesCompletedRef.current += 1;

          // After one full cycle, show others modal
          if (cyclesCompletedRef.current >= 1) {
            setCurrentStep('others-modal');
          }
        }
      }
      lastPhaseIndexRef.current = idx;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentStep]);

  // Animate others reveal when showing others modal
  useEffect(() => {
    if (currentStep !== 'others-modal') {
      return;
    }

    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 2;
      setOthersRevealProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [currentStep]);

  // Create user's single shard
  const userShard = useMemo(() => [{ id: 'user', mood: userMood }], [userMood]);

  // Create mock users for "others" step
  const otherUsers = useMemo(() => {
    const moods: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];
    return Array.from({ length: 24 }, (_, i) => ({
      id: `other-${i}`,
      mood: moods[i % moods.length],
    }));
  }, []);

  // Determine what to show
  const showUserShard = currentStep !== 'welcome-modal';
  const showOthers = currentStep === 'others-modal';
  const showAtmosphere = currentStep === 'others-modal';
  const showProgressRing = currentStep === 'breathing';

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

            {/* User's shard */}
            {showUserShard && (
              <ParticleSwarm users={userShard} baseRadius={4.5} maxShardSize={0.7} />
            )}

            {/* Other users - fade in during others-modal */}
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
              {/* Progress ring during breathing step */}
              {showProgressRing && (
                <BreathingProgressRing
                  phaseIndex={phaseIndex}
                  phaseProgress={phaseProgress}
                  size={320}
                  strokeWidth={4}
                />
              )}

              {/* "This is you" intro text */}
              {currentStep === 'your-shape' && (
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
                  This is you
                </p>
              )}

              {/* Breathing guidance text */}
              {currentStep === 'breathing' && guidance && (
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
            </div>

            {/* Skip button - always visible */}
            <button
              type="button"
              onClick={handleComplete}
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

      {/* Welcome modal - explains 4/7/8 technique */}
      {currentStep === 'welcome-modal' && (
        <TutorialModal type="welcome" onContinue={handleWelcomeContinue} />
      )}

      {/* Others modal - reveals social aspect */}
      {currentStep === 'others-modal' && (
        <TutorialModal type="others" userCount={73} onContinue={handleOthersContinue} />
      )}
    </ErrorBoundary>
  );
}

export default TutorialLevel;
