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
import { calculatePhaseInfo } from '../lib/breathPhase';

/**
 * Tutorial steps - simple, elegant cards explaining the essentials
 */
const TUTORIAL_STEPS = [
  {
    title: 'Welcome',
    content: 'Take a moment to slow down and breathe with others around the world.',
    subtext: 'This will teach you the 4-7-8 relaxation technique.',
  },
  {
    title: 'The 4-7-8 Technique',
    content: 'A simple breathing pattern that calms your nervous system.',
    subtext: 'Inhale 4 seconds · Hold 7 seconds · Exhale 8 seconds',
    highlight: true,
  },
  {
    title: "Let's Practice",
    content: 'Follow the breathing prompts for one complete cycle.',
    subtext: 'Watch the progress ring guide you through each phase.',
    startBreathing: true,
  },
];

// Phase guidance with timing info
const PHASE_GUIDANCE = [
  { text: 'Breathe in...', duration: BREATH_PHASES.INHALE },
  { text: 'Hold...', duration: BREATH_PHASES.HOLD_IN },
  { text: 'Release...', duration: BREATH_PHASES.EXHALE },
];

interface TutorialLevelProps {
  /** User's selected mood */
  userMood?: MoodId;
  /** Called when tutorial completes */
  onComplete: () => void;
}

/**
 * TutorialLevel - Simple, elegant introduction to breathing.
 *
 * Flow:
 * 1. Welcome step
 * 2. 4-7-8 technique explanation
 * 3. Practice one breathing cycle
 * 4. Complete and transition to full experience
 */
export function TutorialLevel({ userMood = 'presence', onComplete }: TutorialLevelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Track breathing phase for UI
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Track breathing cycles completed
  const cyclesCompletedRef = useRef(0);
  const lastPhaseIndexRef = useRef(-1);

  // Track if we've already triggered completion
  const hasTriggeredComplete = useRef(false);

  // Handle final completion
  const handleComplete = useCallback(() => {
    if (hasTriggeredComplete.current) return;
    hasTriggeredComplete.current = true;
    setIsExiting(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  // Handle next step
  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep >= TUTORIAL_STEPS.length) {
      // Start breathing practice
      setIsBreathing(true);
    } else {
      setCurrentStep(nextStep);
      // If this step starts breathing, enable it
      if (TUTORIAL_STEPS[nextStep]?.startBreathing) {
        setIsBreathing(true);
      }
    }
  }, [currentStep]);

  // RAF loop for breathing phase tracking
  useEffect(() => {
    if (!isBreathing) return;

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

        // After one full cycle, complete the tutorial
        if (cyclesCompletedRef.current >= 1) {
          handleComplete();
        }
      }
      lastPhaseIndexRef.current = idx;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isBreathing, handleComplete]);

  // Create user's single shard
  const userShard = useMemo(() => [{ id: 'user', mood: userMood }], [userMood]);

  // Current step info
  const step = TUTORIAL_STEPS[currentStep];
  const guidance = PHASE_GUIDANCE[phaseIndex];
  const showCard = !isBreathing && step;
  const showBreathingUI = isBreathing;

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

            {/* User's shard - always visible in tutorial */}
            <ParticleSwarm users={userShard} baseRadius={4.5} maxShardSize={0.7} />

            {/* Atmospheric particles - subtle */}
            <AtmosphericParticles
              count={30}
              size={0.06}
              baseOpacity={0.06}
              breathingOpacity={0.1}
            />
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
            {/* Tutorial step card */}
            {showCard && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto',
                }}
              >
                <div
                  style={{
                    background: 'rgba(253, 251, 247, 0.92)',
                    backdropFilter: 'blur(40px)',
                    borderRadius: '28px',
                    border: '1px solid rgba(160, 140, 120, 0.15)',
                    padding: '36px 40px',
                    maxWidth: '380px',
                    width: '90vw',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {/* Step indicator */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '24px',
                    }}
                  >
                    {TUTORIAL_STEPS.map((stepItem, idx) => (
                      <div
                        key={stepItem.title}
                        style={{
                          width: idx === currentStep ? '24px' : '8px',
                          height: '8px',
                          borderRadius: '4px',
                          background:
                            idx === currentStep
                              ? 'rgba(201, 160, 108, 0.8)'
                              : idx < currentStep
                                ? 'rgba(201, 160, 108, 0.4)'
                                : 'rgba(160, 140, 120, 0.2)',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '1.5rem',
                      fontWeight: 400,
                      margin: '0 0 16px 0',
                      letterSpacing: '0.1em',
                      color: '#4a3f35',
                    }}
                  >
                    {step.title}
                  </h2>

                  {/* Content */}
                  <p
                    style={{
                      fontSize: '0.95rem',
                      color: '#5a4d42',
                      margin: '0 0 12px 0',
                      lineHeight: 1.6,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {step.content}
                  </p>

                  {/* Subtext */}
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: step.highlight ? '#c9a06c' : '#8a7a6a',
                      margin: 0,
                      letterSpacing: '0.02em',
                      fontWeight: step.highlight ? 500 : 400,
                    }}
                  >
                    {step.subtext}
                  </p>

                  {/* 4-7-8 visual for technique step */}
                  {step.highlight && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '20px',
                        margin: '24px 0 8px',
                      }}
                    >
                      {[
                        { num: '4', label: 'Inhale', color: '#c9a06c' },
                        { num: '7', label: 'Hold', color: '#a89878' },
                        { num: '8', label: 'Exhale', color: '#8a7a68' },
                      ].map(({ num, label, color }) => (
                        <div key={num} style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 6px',
                              boxShadow: `0 4px 12px ${color}40`,
                            }}
                          >
                            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                              {num}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#7a6a5a',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Continue button */}
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      background: 'rgba(201, 160, 108, 0.9)',
                      color: '#fff',
                      border: 'none',
                      padding: '14px 36px',
                      borderRadius: '24px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      marginTop: '24px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(201, 160, 108, 0.3)',
                    }}
                  >
                    {currentStep === TUTORIAL_STEPS.length - 1 ? 'Begin' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* Breathing practice UI */}
            {showBreathingUI && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Progress ring */}
                <BreathingProgressRing
                  phaseIndex={phaseIndex}
                  phaseProgress={phaseProgress}
                  size={280}
                  strokeWidth={4}
                />

                {/* Breathing guidance text */}
                {guidance && (
                  <div style={{ textAlign: 'center', marginTop: '-60px' }}>
                    <p
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 'clamp(1.6rem, 6vw, 2.2rem)',
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
                        fontSize: '0.85rem',
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
            )}

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
    </ErrorBoundary>
  );
}

export default TutorialLevel;
