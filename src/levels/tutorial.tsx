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
import { PHASE_NAMES } from '../styles/designTokens';

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

const STEP_CONTENT: Record<
  TutorialStep,
  { title: string; subtitle: string; cta?: string; hint?: string }
> = {
  'your-shape': {
    title: 'This is You',
    subtitle: 'Your presence in the breathing space',
    hint: 'Watch your shape respond to the breath...',
  },
  breathing: {
    title: 'Breathe Together',
    subtitle: 'Follow the rhythm. Let your body sync.',
    cta: 'I Feel It',
    hint: 'Complete one full breath cycle',
  },
  'others-waiting': {
    title: 'Others Are Waiting',
    subtitle: 'Right now, people around the world are breathing with you.',
    cta: 'Join the Sphere',
    hint: '73 breathing together',
  },
};

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
  const [phaseName, setPhaseName] = useState('Inhale');
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
      setPhaseName(PHASE_NAMES[idx] ?? 'Breathe');
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

  // Get step content
  const stepContent = STEP_CONTENT[currentStep];

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
            {/* Step indicator dots */}
            <div
              style={{
                position: 'absolute',
                top: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
              }}
            >
              {TUTORIAL_STEPS.map((step, i) => (
                <div
                  key={step}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background:
                      i === stepIndex
                        ? 'rgba(201, 160, 108, 0.9)'
                        : i < stepIndex
                          ? 'rgba(201, 160, 108, 0.4)'
                          : 'rgba(160, 140, 120, 0.2)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Main tutorial content */}
            <div
              style={{
                position: 'absolute',
                bottom: '140px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                width: '90%',
                maxWidth: '420px',
              }}
            >
              {/* Step title */}
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                  fontWeight: 400,
                  color: '#4a3f35',
                  letterSpacing: '0.12em',
                  margin: '0 0 12px 0',
                  textShadow: '0 2px 20px rgba(201, 160, 108, 0.3)',
                }}
              >
                {stepContent.title}
              </h2>

              {/* Step subtitle */}
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#7a6b5a',
                  letterSpacing: '0.03em',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {stepContent.subtitle}
              </p>

              {/* Breathing guidance - large phase text during breathing step */}
              {currentStep === 'breathing' && (
                <div
                  style={{
                    marginTop: '32px',
                  }}
                >
                  {/* Large breathing guidance text */}
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
                      fontWeight: 300,
                      color: '#4a3f35',
                      letterSpacing: '0.1em',
                      display: 'block',
                      marginBottom: '16px',
                    }}
                  >
                    {getBreathingGuidance()}
                  </span>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '160px',
                      height: '3px',
                      background: 'rgba(160, 140, 120, 0.15)',
                      borderRadius: '2px',
                      margin: '0 auto',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${phaseProgress * 100}%`,
                        background:
                          'linear-gradient(90deg, rgba(201, 160, 108, 0.9), rgba(201, 160, 108, 0.5))',
                        transition: 'width 0.1s linear',
                      }}
                    />
                  </div>

                  {/* Hint text */}
                  {!canProceed && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#9a8a7a',
                        marginTop: '20px',
                        letterSpacing: '0.05em',
                        opacity: 0.8,
                      }}
                    >
                      {stepContent.hint}
                    </p>
                  )}
                </div>
              )}

              {/* Others waiting - breathing UI + count */}
              {currentStep === 'others-waiting' && (
                <div
                  style={{
                    marginTop: '24px',
                    opacity: othersRevealProgress,
                  }}
                >
                  {/* Breathing phase (smaller, secondary) */}
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '1.1rem',
                      fontWeight: 300,
                      color: '#7a6b5a',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {phaseName}
                  </span>

                  {/* Hint with count */}
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#9a8a7a',
                      marginTop: '12px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#7a6b5a' }}>73</span> breathing together
                  </p>
                </div>
              )}

              {/* Hint for step 1 */}
              {currentStep === 'your-shape' && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#9a8a7a',
                    marginTop: '20px',
                    letterSpacing: '0.05em',
                    opacity: 0.8,
                    fontStyle: 'italic',
                  }}
                >
                  {stepContent.hint}
                </p>
              )}
            </div>

            {/* CTA Button - appears when canProceed is true */}
            {canProceed && stepContent.cta && (
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
                {stepContent.cta}
              </button>
            )}

            {/* Skip button - always visible but secondary */}
            <button
              type="button"
              onClick={handleComplete}
              style={{
                position: 'absolute',
                bottom: canProceed && stepContent.cta ? '16px' : '48px',
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
