import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BREATH_TOTAL_CYCLE, type MoodId } from '../constants';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { calculatePhaseInfo } from '../lib/breathPhase';

/**
 * Tutorial steps - progression from personal to collective
 *
 * Flow:
 * 1. your-shape: Brief intro to user's presence (~5s, auto-advance)
 * 2. breathing: Guided breathing with phase prompts (1 cycle, then "Continue" button)
 * 3. others-waiting: Suspenseful reveal of others + CTA to join
 */
type TutorialStep = 'your-shape' | 'breathing' | 'others-waiting';

const TUTORIAL_STEPS: TutorialStep[] = ['your-shape', 'breathing', 'others-waiting'];

interface TutorialLevelProps {
  /** User's selected mood */
  userMood?: MoodId;
  /** Called when tutorial completes */
  onComplete: () => void;
}

/**
 * TutorialLevel - Guided introduction to the breathing experience.
 *
 * Progressive reveal with user-controlled pacing:
 * 1. Your shape (~5s auto-advance) - Brief intro to user's presence
 * 2. Breathing (1 cycle + CTA) - Guided breathing with phase prompts
 * 3. Others waiting (CTA) - Suspenseful reveal before joining
 *
 * User can skip at any time. CTAs appear after completing requirements.
 */
export function TutorialLevel({ userMood = 'presence', onComplete }: TutorialLevelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Track breathing phase for UI
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Track if CTA should be shown (after completing step requirements)
  const [canProceed, setCanProceed] = useState(false);

  // Step 1: Timer for auto-advance
  const step1TimerRef = useRef<number | null>(null);

  // Step 2: Track if user completed one breathing cycle
  const cyclesCompletedRef = useRef(0);
  const lastPhaseIndexRef = useRef(-1);

  // Others fade-in progress
  const [othersRevealProgress, setOthersRevealProgress] = useState(0);

  const currentStep = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  // Track if we've already triggered completion to prevent multiple calls
  const hasTriggeredComplete = useRef(false);

  // Handle final completion (exit tutorial)
  const handleComplete = useCallback(() => {
    if (hasTriggeredComplete.current) return;
    hasTriggeredComplete.current = true;
    setIsExiting(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  // Handle advancing to next step (user-controlled via CTA)
  const handleNextStep = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCanProceed(false);
      setStepIndex((prev) => prev + 1);
      cyclesCompletedRef.current = 0;
    }
  }, [isLastStep, handleComplete]);

  // Step 1: Auto-advance after 5 seconds
  useEffect(() => {
    if (currentStep === 'your-shape') {
      step1TimerRef.current = window.setTimeout(() => {
        handleNextStep();
      }, 5000);

      return () => {
        if (step1TimerRef.current) {
          clearTimeout(step1TimerRef.current);
        }
      };
    }
  }, [currentStep, handleNextStep]);

  // Step 3: Animate others reveal
  useEffect(() => {
    if (currentStep !== 'others-waiting') {
      setOthersRevealProgress(0);
      return;
    }

    const duration = 2000; // 2s fade in
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out for smooth reveal
      const eased = 1 - (1 - progress) ** 2;
      setOthersRevealProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // After reveal completes, show CTA
        setCanProceed(true);
      }
    };

    requestAnimationFrame(animate);
  }, [currentStep]);

  // RAF loop for breathing phase tracking
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex: idx, phaseProgress: progress } = calculatePhaseInfo(cycleTime);

      // Update phase display
      setPhaseProgress(progress);
      setPhaseIndex(idx);

      // Step 2: Detect cycle completion for breathing step
      if (currentStep === 'breathing') {
        if (idx === 0 && lastPhaseIndexRef.current === 3) {
          cyclesCompletedRef.current += 1;

          // After one full cycle, enable the CTA
          if (cyclesCompletedRef.current >= 1 && !canProceed) {
            setCanProceed(true);
          }
        }
      }
      lastPhaseIndexRef.current = idx;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentStep, canProceed]);

  // Create user's single shard
  const userShard = useMemo(() => [{ id: 'user', mood: userMood }], [userMood]);

  // Create mock users for "others" step (fade in gradually)
  const otherUsers = useMemo(() => {
    const moods: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];
    return Array.from({ length: 24 }, (_, i) => ({
      id: `other-${i}`,
      mood: moods[i % moods.length],
    }));
  }, []);

  // Determine what to show based on step
  const showUserShard = true; // Always show user's shard
  const showOthers = currentStep === 'others-waiting';
  const showAtmosphere = currentStep === 'others-waiting';

  // Calculate fade for step transitions
  const contentOpacity = isExiting ? 0 : 1;

  // Breathing guidance text based on phase
  const getBreathingGuidance = () => {
    if (currentStep !== 'breathing') return null;
    const guidance = ['Breathe in...', 'Hold...', 'Release...', 'Rest...'];
    return guidance[phaseIndex] ?? 'Breathe...';
  };

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

            {/* User's shard - always visible, highlighted */}
            {showUserShard && (
              <ParticleSwarm
                users={userShard}
                baseRadius={4.5}
                maxShardSize={0.7} // Slightly larger for emphasis
              />
            )}

            {/* Other users - fade in during 'others-waiting' step */}
            {showOthers && (
              <group>
                <ParticleSwarm users={otherUsers} baseRadius={4.5} maxShardSize={0.5} />
              </group>
            )}

            {/* Atmospheric particles - fade in with others */}
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

        {/* Tutorial UI overlay - minimal art piece */}
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
            {/* Centered guidance - minimal, within the globe area */}
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
              {/* Progress ring - matches globe outer edge */}
              {currentStep === 'breathing' && (
                <svg
                  width="320"
                  height="320"
                  role="img"
                  aria-label="Breathing progress"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <title>Breathing progress</title>
                  {/* Background ring - subtle guide */}
                  <circle
                    cx="160"
                    cy="160"
                    r="150"
                    fill="none"
                    stroke="rgba(160, 140, 120, 0.08)"
                    strokeWidth="1"
                  />
                  {/* Progress ring - follows globe edge */}
                  <circle
                    cx="160"
                    cy="160"
                    r="150"
                    fill="none"
                    stroke="rgba(201, 160, 108, 0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 150}`}
                    strokeDashoffset={`${2 * Math.PI * 150 * (1 - phaseProgress)}`}
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dashoffset 0.1s linear',
                    }}
                  />
                </svg>
              )}

              {/* Step 1: "This is You" - minimal intro */}
              {currentStep === 'your-shape' && (
                <div style={{ textAlign: 'center' }}>
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
                </div>
              )}

              {/* Step 2: Breathing guidance - just the word */}
              {currentStep === 'breathing' && (
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 'clamp(1.6rem, 6vw, 2.4rem)',
                    fontWeight: 300,
                    color: '#4a3f35',
                    letterSpacing: '0.15em',
                    margin: 0,
                    textShadow:
                      '0 0 40px rgba(255, 252, 240, 0.9), 0 0 80px rgba(201, 160, 108, 0.4)',
                  }}
                >
                  {getBreathingGuidance()}
                </p>
              )}

              {/* Step 3: Others waiting - user count */}
              {currentStep === 'others-waiting' && (
                <div
                  style={{
                    textAlign: 'center',
                    opacity: othersRevealProgress,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                      fontWeight: 300,
                      color: '#4a3f35',
                      letterSpacing: '0.08em',
                      margin: 0,
                      textShadow:
                        '0 0 40px rgba(255, 252, 240, 0.9), 0 0 80px rgba(201, 160, 108, 0.4)',
                    }}
                  >
                    73
                  </p>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                      fontWeight: 400,
                      color: '#7a6b5a',
                      letterSpacing: '0.1em',
                      margin: '8px 0 0 0',
                      textShadow: '0 0 30px rgba(255, 252, 240, 0.8)',
                    }}
                  >
                    breathing together
                  </p>
                </div>
              )}
            </div>

            {/* CTA Button - appears when canProceed is true (breathing and others-waiting steps) */}
            {canProceed && currentStep !== 'your-shape' && (
              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  position: 'absolute',
                  bottom: '48px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: isLastStep
                    ? 'linear-gradient(135deg, rgba(201, 160, 108, 0.95) 0%, rgba(180, 140, 90, 0.95) 100%)'
                    : 'rgba(255, 252, 245, 0.9)',
                  backdropFilter: 'blur(16px)',
                  border: isLastStep ? 'none' : '1px solid rgba(160, 140, 120, 0.25)',
                  borderRadius: '28px',
                  padding: isLastStep ? '16px 36px' : '12px 28px',
                  fontSize: isLastStep ? '0.85rem' : '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isLastStep ? '#fff' : '#5a4d42',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  transition: 'all 0.3s ease',
                  boxShadow: isLastStep
                    ? '0 8px 32px rgba(201, 160, 108, 0.4)'
                    : '0 4px 20px rgba(0, 0, 0, 0.08)',
                  animation: isLastStep ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                }}
              >
                {isLastStep ? 'Join the Sphere' : 'I Feel It'}
              </button>
            )}

            {/* Skip button - always visible but secondary */}
            <button
              type="button"
              onClick={handleComplete}
              style={{
                position: 'absolute',
                bottom: canProceed && currentStep !== 'your-shape' ? '16px' : '48px',
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

          {/* Keyframe animation for CTA glow */}
          <style>
            {`
              @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 8px 32px rgba(201, 160, 108, 0.4); }
                50% { box-shadow: 0 8px 40px rgba(201, 160, 108, 0.6); }
              }
            `}
          </style>
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default TutorialLevel;
