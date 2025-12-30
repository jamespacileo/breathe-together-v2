/**
 * OnboardingScreen Component
 * First-time user welcome flow with mood selection and breathing intro
 */

import { useState } from 'react';
import type { MoodId } from '../constants';
import { useAppNavigation } from '../contexts/appNavigation';
import { useSettings } from '../hooks/useSettings';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  transitions,
  typography,
} from '../styles/designTokens';
import { MenuButton, MoodSelector, Panel } from './ui';

type OnboardingStep = 'welcome' | 'name' | 'mood' | 'intro';

export function OnboardingScreen() {
  const { completeOnboarding } = useAppNavigation();
  const { settings, updateSettings } = useSettings();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState(settings.name);
  const [selectedMood, setSelectedMood] = useState<MoodId>(settings.preferredMood);

  const handleNext = () => {
    switch (step) {
      case 'welcome':
        setStep('name');
        break;
      case 'name':
        updateSettings({ name });
        setStep('mood');
        break;
      case 'mood':
        updateSettings({ preferredMood: selectedMood });
        setStep('intro');
        break;
      case 'intro':
        completeOnboarding();
        break;
    }
  };

  const handleSkip = () => {
    updateSettings({ name, preferredMood: selectedMood });
    completeOnboarding();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.backgroundDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
        fontFamily: typography.fontFamily,
        color: colors.text,
        zIndex: 100,
      }}
    >
      {/* Step indicator */}
      <div
        style={{
          position: 'absolute',
          top: spacing['2xl'],
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: spacing.sm,
        }}
      >
        {(['welcome', 'name', 'mood', 'intro'] as const).map((s) => (
          <div
            key={s}
            style={{
              width: s === step ? '24px' : '8px',
              height: '8px',
              borderRadius: borderRadius.full,
              background: s === step ? colors.accent : colors.border,
              transition: transitions.normal,
            }}
          />
        ))}
      </div>

      {/* Content panel */}
      <Panel
        variant="glassDark"
        padding="xl"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {step === 'welcome' && <WelcomeStep onNext={handleNext} />}
        {step === 'name' && (
          <NameStep name={name} setName={setName} onNext={handleNext} onSkip={handleSkip} />
        )}
        {step === 'mood' && (
          <MoodStep
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
            onNext={handleNext}
          />
        )}
        {step === 'intro' && <IntroStep onNext={handleNext} />}
      </Panel>

      {/* Skip button */}
      {step !== 'intro' && (
        <button
          type="button"
          onClick={handleSkip}
          style={{
            position: 'absolute',
            bottom: spacing['2xl'],
            right: spacing['2xl'],
            background: 'transparent',
            border: 'none',
            color: colors.textDim,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            textDecoration: 'underline',
            textDecorationColor: 'transparent',
            transition: transitions.normal,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecorationColor = colors.textDim;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecorationColor = 'transparent';
          }}
        >
          Skip intro
        </button>
      )}
    </div>
  );
}

// Welcome Step
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div style={{ marginBottom: spacing['2xl'] }}>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            letterSpacing: typography.letterSpacing.widest,
            textTransform: 'uppercase',
            color: colors.textDim,
            marginBottom: spacing.sm,
          }}
        >
          Welcome to
        </div>
        <h1
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.light,
            letterSpacing: typography.letterSpacing.wide,
            margin: 0,
            marginBottom: spacing.lg,
          }}
        >
          GAIA
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.textDim,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
            maxWidth: '320px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          A global breathing meditation experience. Sync your breath with others around the world.
        </p>
      </div>

      {/* Decorative breathing circle */}
      <div
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accentLight} 0%, transparent 70%)`,
          margin: `${spacing['2xl']} auto`,
          animation: 'breathePulse 4s ease-in-out infinite',
        }}
      />

      <MenuButton onClick={onNext} variant="primary" size="lg" fullWidth>
        Begin
      </MenuButton>

      <style>
        {`
          @keyframes breathePulse {
            0%, 100% { transform: scale(0.8); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 1; }
          }
        `}
      </style>
    </>
  );
}

// Name Step
function NameStep({
  name,
  setName,
  onNext,
  onSkip,
}: {
  name: string;
  setName: (name: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: spacing['2xl'] }}>
        <h2
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.light,
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: spacing.md,
          }}
        >
          What shall we call you?
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textDim,
            margin: 0,
          }}
        >
          This is just for you. Your presence remains anonymous to others.
        </p>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        style={{
          width: '100%',
          padding: spacing.lg,
          fontSize: typography.fontSize.base,
          fontFamily: typography.fontFamily,
          background: colors.glass,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.xl,
          outline: 'none',
          transition: transitions.normal,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = colors.accent;
          e.target.style.boxShadow = shadows.md;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = colors.border;
          e.target.style.boxShadow = 'none';
        }}
      />

      <div style={{ display: 'flex', gap: spacing.md }}>
        <MenuButton onClick={onSkip} variant="ghost" fullWidth>
          Skip
        </MenuButton>
        <MenuButton onClick={onNext} variant="primary" fullWidth>
          Continue
        </MenuButton>
      </div>
    </>
  );
}

// Mood Step
function MoodStep({
  selectedMood,
  setSelectedMood,
  onNext,
}: {
  selectedMood: MoodId;
  setSelectedMood: (mood: MoodId) => void;
  onNext: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: spacing['2xl'] }}>
        <h2
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.light,
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: spacing.md,
          }}
        >
          How are you feeling?
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textDim,
            margin: 0,
          }}
        >
          Select your current state. You can change this anytime.
        </p>
      </div>

      <div style={{ marginBottom: spacing.xl }}>
        <MoodSelector
          selectedMood={selectedMood}
          onMoodChange={setSelectedMood}
          showDescriptions={true}
          layout="grid"
        />
      </div>

      <MenuButton onClick={onNext} variant="primary" size="lg" fullWidth>
        Continue
      </MenuButton>
    </>
  );
}

// Intro Step - Brief breathing guide
function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div style={{ marginBottom: spacing['2xl'] }}>
        <h2
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.light,
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: spacing.md,
          }}
        >
          Box Breathing
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textDim,
            margin: 0,
            marginBottom: spacing.xl,
          }}
        >
          Follow the 16-second cycle synchronized with everyone around the world.
        </p>
      </div>

      {/* Breathing cycle visualization */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing['2xl'],
        }}
      >
        {[
          { phase: 'Inhale', duration: '3s', color: colors.mood.peace },
          { phase: 'Hold', duration: '5s', color: colors.mood.solitude },
          { phase: 'Exhale', duration: '5s', color: colors.mood.joy },
          { phase: 'Hold', duration: '3s', color: colors.mood.love },
        ].map(({ phase, duration, color }) => (
          <div
            key={`${phase}-${duration}`}
            style={{
              padding: spacing.lg,
              background: colors.glass,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.lg,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color,
                margin: '0 auto',
                marginBottom: spacing.sm,
              }}
            />
            <div
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wide,
                marginBottom: spacing.xs,
              }}
            >
              {phase}
            </div>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.textDim,
              }}
            >
              {duration}
            </div>
          </div>
        ))}
      </div>

      <MenuButton onClick={onNext} variant="primary" size="lg" fullWidth>
        Start Breathing
      </MenuButton>
    </>
  );
}
