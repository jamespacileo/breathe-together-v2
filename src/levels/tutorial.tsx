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
 * Tutorial steps - each synced to breathing cycles
 */
type TutorialStep = 'your-shape' | 'breathing' | 'others' | 'ready';

const TUTORIAL_STEPS: TutorialStep[] = ['your-shape', 'breathing', 'others', 'ready'];

const STEP_CONTENT: Record<TutorialStep, { title: string; subtitle: string }> = {
  'your-shape': {
    title: 'This is You',
    subtitle: 'Your presence in the breathing space',
  },
  breathing: {
    title: 'Follow the Rhythm',
    subtitle: 'Inhale \u2022 Hold \u2022 Exhale \u2022 Hold',
  },
  others: {
    title: 'Others Are Here',
    subtitle: 'Each shape is someone breathing with you',
  },
  ready: {
    title: "You're Ready",
    subtitle: 'Join the collective breath',
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
 * Shows user's shape first, then gradually introduces concepts:
 * 1. Your shape (one breath cycle)
 * 2. The breathing rhythm (one breath cycle with phase indicator)
 * 3. Others joining (shapes fade in)
 * 4. Ready - transition to full experience
 *
 * Each step lasts ~19s (one full breathing cycle).
 * User can skip at any time.
 */
export function TutorialLevel({ userMood = 'presence', onComplete }: TutorialLevelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Track breathing phase for UI
  const [phaseName, setPhaseName] = useState('Inhale');
  const [phaseProgress, setPhaseProgress] = useState(0);

  const cyclesCompletedRef = useRef(0);
  const lastPhaseIndexRef = useRef(-1);

  const currentStep = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  // Track if we've already triggered completion to prevent multiple calls
  const hasTriggeredComplete = useRef(false);

  // Handle skip or complete
  const handleComplete = useCallback(() => {
    if (hasTriggeredComplete.current) return;
    hasTriggeredComplete.current = true;
    setIsExiting(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  // RAF loop for breathing phase tracking and step progression
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress: progress } = calculatePhaseInfo(cycleTime);

      // Update phase display
      setPhaseName(PHASE_NAMES[phaseIndex] ?? 'Breathe');
      setPhaseProgress(progress);

      // Detect cycle completion (phase 0 after phase 3)
      if (phaseIndex === 0 && lastPhaseIndexRef.current === 3) {
        cyclesCompletedRef.current += 1;

        // Advance step after one full cycle
        if (cyclesCompletedRef.current >= 1) {
          cyclesCompletedRef.current = 0;

          if (!isLastStep) {
            // Move to next step
            setStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
          } else {
            // On last step - auto-complete after the cycle
            handleComplete();
          }
        }
      }
      lastPhaseIndexRef.current = phaseIndex;

      // Calculate step progress (0-1 within cycle)
      const cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;
      setStepProgress(cycleProgress);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isLastStep, handleComplete]);

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
  const showOthers = currentStep === 'others' || currentStep === 'ready';
  const showBreathingUI = currentStep !== 'your-shape';
  const showAtmosphere = currentStep === 'others' || currentStep === 'ready';

  // Calculate fade for step transitions
  const contentOpacity = isExiting ? 0 : 1;
  const othersOpacity = showOthers ? Math.min(stepProgress * 2, 1) : 0;

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

            {/* Other users - fade in during 'others' step */}
            {showOthers && (
              <group>
                <ParticleSwarm users={otherUsers} baseRadius={4.5} maxShardSize={0.5} />
              </group>
            )}

            {/* Atmospheric particles - subtle, late reveal */}
            {showAtmosphere && (
              <AtmosphericParticles
                count={50}
                size={0.06}
                baseOpacity={0.08 * othersOpacity}
                breathingOpacity={0.12 * othersOpacity}
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
                bottom: '120px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                width: '90%',
                maxWidth: '400px',
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
                  margin: '0 0 8px 0',
                  textShadow: '0 2px 20px rgba(201, 160, 108, 0.3)',
                }}
              >
                {STEP_CONTENT[currentStep].title}
              </h2>

              {/* Step subtitle */}
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#7a6b5a',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                {STEP_CONTENT[currentStep].subtitle}
              </p>

              {/* Breathing phase indicator (shown after first step) */}
              {showBreathingUI && (
                <div
                  style={{
                    marginTop: '24px',
                    opacity: 0.8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '1.25rem',
                      fontWeight: 300,
                      color: '#4a3f35',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {phaseName}
                  </span>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '120px',
                      height: '2px',
                      background: 'rgba(160, 140, 120, 0.2)',
                      borderRadius: '1px',
                      margin: '12px auto 0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${phaseProgress * 100}%`,
                        background:
                          'linear-gradient(90deg, rgba(201, 160, 108, 0.8), rgba(201, 160, 108, 0.4))',
                        transition: 'width 0.1s linear',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Skip button */}
            <button
              type="button"
              onClick={handleComplete}
              style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 252, 245, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(160, 140, 120, 0.2)',
                borderRadius: '20px',
                padding: '10px 24px',
                fontSize: '0.7rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#7a6b5a',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transition: 'all 0.3s ease',
              }}
            >
              {isLastStep ? 'Begin' : 'Skip Tutorial'}
            </button>
          </div>
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default TutorialLevel;
