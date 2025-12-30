/**
 * Onboarding Screen
 * First-time user setup flow
 * Steps: Welcome → Name → Breathing Intro → Preferences → Complete
 */

import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { Suspense, useCallback, useState } from 'react';
import { useAppState } from '../contexts/appState';
import { useUserPreferences } from '../contexts/userPreferences';

/**
 * Design tokens matching GaiaUI aesthetic
 */
const colors = {
  text: '#8c7b6c',
  textDim: '#b8a896',
  textLight: '#fffef7',
  accent: '#d4a574',
  accentHover: '#e5b585',
  glass: 'rgba(250, 248, 243, 0.85)',
  glassDark: 'rgba(140, 123, 108, 0.1)',
  border: 'rgba(140, 123, 108, 0.15)',
};

type OnboardingStep = 'welcome' | 'name' | 'breathing' | 'preferences' | 'complete';

const STEP_ORDER: OnboardingStep[] = ['welcome', 'name', 'breathing', 'preferences', 'complete'];

interface StepIndicatorProps {
  currentStep: OnboardingStep;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <Container flexDirection="row" gap={8} justifyContent="center" marginBottom={32}>
      {STEP_ORDER.map((step, index) => (
        <Container
          key={step}
          width={index === currentIndex ? 24 : 8}
          height={8}
          borderRadius={4}
          backgroundColor={index <= currentIndex ? colors.accent : colors.glassDark}
        />
      ))}
    </Container>
  );
}

interface WelcomeStepProps {
  onNext: () => void;
}

function WelcomeStep({ onNext }: WelcomeStepProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Container flexDirection="column" alignItems="center" gap={32}>
      <Container flexDirection="column" alignItems="center" gap={12}>
        <Text fontSize={10} color={colors.textDim} letterSpacing={0.3} fontWeight={600}>
          WELCOME TO
        </Text>
        <Text fontSize={48} color={colors.text} letterSpacing={0.05} fontWeight={300}>
          GAIA
        </Text>
        <Text fontSize={14} color={colors.textDim} letterSpacing={0.1} fontWeight={400}>
          Breathing Together
        </Text>
      </Container>

      <Container maxWidth={320} alignItems="center">
        <Text fontSize={13} color={colors.text} fontWeight={400} textAlign="center">
          A meditative experience where people around the world breathe in sync, connected through a
          shared rhythm.
        </Text>
      </Container>

      <Container
        padding={18}
        paddingX={40}
        borderRadius={28}
        backgroundColor={isHovering ? colors.accentHover : colors.accent}
        cursor="pointer"
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
        onClick={onNext}
      >
        <Text fontSize={11} color={colors.textLight} letterSpacing={0.2} fontWeight={600}>
          GET STARTED
        </Text>
      </Container>
    </Container>
  );
}

interface NameStepProps {
  onNext: () => void;
  onBack: () => void;
}

function NameStep({ onNext, onBack }: NameStepProps) {
  const { userName, updatePreference } = useUserPreferences();
  const [name, setName] = useState(userName);
  const [isHoveringNext, setIsHoveringNext] = useState(false);
  const [isHoveringBack, setIsHoveringBack] = useState(false);
  const [isHoveringSkip, setIsHoveringSkip] = useState(false);

  const handleNext = useCallback(() => {
    if (name.trim()) {
      updatePreference('userName', name.trim());
    }
    onNext();
  }, [name, updatePreference, onNext]);

  const handleSkip = useCallback(() => {
    onNext();
  }, [onNext]);

  // Simple text input simulation using a Container
  // Note: @react-three/uikit doesn't have native input, so we simulate
  const displayName = name || 'Enter your name...';
  const isPlaceholder = !name;

  return (
    <Container flexDirection="column" alignItems="center" gap={32}>
      <Container flexDirection="column" alignItems="center" gap={8}>
        <Text fontSize={10} color={colors.textDim} letterSpacing={0.3} fontWeight={600}>
          PERSONALIZE
        </Text>
        <Text fontSize={24} color={colors.text} letterSpacing={0.05} fontWeight={400}>
          What should we call you?
        </Text>
      </Container>

      <Container maxWidth={280} alignItems="center">
        <Text fontSize={12} color={colors.textDim} textAlign="center" fontWeight={400}>
          Your name appears during breathing sessions. This is optional.
        </Text>
      </Container>

      {/* Name Input Display */}
      <Container
        padding={16}
        paddingX={24}
        borderRadius={16}
        backgroundColor={colors.glassDark}
        borderWidth={1}
        borderColor={colors.border}
        minWidth={240}
        alignItems="center"
      >
        <Text fontSize={16} color={isPlaceholder ? colors.textDim : colors.text} fontWeight={400}>
          {displayName}
        </Text>
      </Container>

      {/* Quick name suggestions */}
      <Container flexDirection="row" gap={8} flexWrap="wrap" justifyContent="center" maxWidth={320}>
        {['Traveler', 'Seeker', 'Dreamer', 'Explorer'].map((suggestion) => (
          <Container
            key={suggestion}
            padding={8}
            paddingX={16}
            borderRadius={12}
            backgroundColor={name === suggestion ? colors.accent : colors.glassDark}
            cursor="pointer"
            onClick={() => setName(suggestion)}
          >
            <Text
              fontSize={11}
              color={name === suggestion ? colors.textLight : colors.text}
              fontWeight={500}
            >
              {suggestion}
            </Text>
          </Container>
        ))}
      </Container>

      {/* Navigation */}
      <Container flexDirection="row" gap={16} alignItems="center">
        <Container
          padding={12}
          paddingX={20}
          borderRadius={20}
          backgroundColor={isHoveringBack ? colors.glassDark : 'transparent'}
          borderWidth={1}
          borderColor={colors.border}
          cursor="pointer"
          onPointerEnter={() => setIsHoveringBack(true)}
          onPointerLeave={() => setIsHoveringBack(false)}
          onClick={onBack}
        >
          <Text fontSize={10} color={colors.textDim} letterSpacing={0.15} fontWeight={600}>
            ← BACK
          </Text>
        </Container>

        <Container
          padding={16}
          paddingX={32}
          borderRadius={24}
          backgroundColor={isHoveringNext ? colors.accentHover : colors.accent}
          cursor="pointer"
          onPointerEnter={() => setIsHoveringNext(true)}
          onPointerLeave={() => setIsHoveringNext(false)}
          onClick={handleNext}
        >
          <Text fontSize={11} color={colors.textLight} letterSpacing={0.2} fontWeight={600}>
            CONTINUE
          </Text>
        </Container>
      </Container>

      <Container
        padding={8}
        cursor="pointer"
        onPointerEnter={() => setIsHoveringSkip(true)}
        onPointerLeave={() => setIsHoveringSkip(false)}
        onClick={handleSkip}
      >
        <Text
          fontSize={10}
          color={isHoveringSkip ? colors.text : colors.textDim}
          letterSpacing={0.1}
          fontWeight={500}
        >
          Skip for now
        </Text>
      </Container>
    </Container>
  );
}

interface BreathingStepProps {
  onNext: () => void;
  onBack: () => void;
}

function BreathingStep({ onNext, onBack }: BreathingStepProps) {
  const [isHoveringNext, setIsHoveringNext] = useState(false);
  const [isHoveringBack, setIsHoveringBack] = useState(false);

  return (
    <Container flexDirection="column" alignItems="center" gap={32}>
      <Container flexDirection="column" alignItems="center" gap={8}>
        <Text fontSize={10} color={colors.textDim} letterSpacing={0.3} fontWeight={600}>
          THE PRACTICE
        </Text>
        <Text fontSize={24} color={colors.text} letterSpacing={0.05} fontWeight={400}>
          Box Breathing
        </Text>
      </Container>

      {/* Breathing Cycle Visualization */}
      <Container
        flexDirection="column"
        gap={16}
        padding={24}
        borderRadius={20}
        backgroundColor={colors.glassDark}
        alignItems="center"
      >
        <Container flexDirection="row" gap={24} alignItems="center">
          <Container flexDirection="column" alignItems="center" gap={4}>
            <Text fontSize={20} color={colors.accent} fontWeight={300}>
              4s
            </Text>
            <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
              INHALE
            </Text>
          </Container>
          <Text fontSize={16} color={colors.textDim}>
            →
          </Text>
          <Container flexDirection="column" alignItems="center" gap={4}>
            <Text fontSize={20} color={colors.accent} fontWeight={300}>
              4s
            </Text>
            <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
              HOLD
            </Text>
          </Container>
          <Text fontSize={16} color={colors.textDim}>
            →
          </Text>
          <Container flexDirection="column" alignItems="center" gap={4}>
            <Text fontSize={20} color={colors.accent} fontWeight={300}>
              4s
            </Text>
            <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
              EXHALE
            </Text>
          </Container>
          <Text fontSize={16} color={colors.textDim}>
            →
          </Text>
          <Container flexDirection="column" alignItems="center" gap={4}>
            <Text fontSize={20} color={colors.accent} fontWeight={300}>
              4s
            </Text>
            <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
              HOLD
            </Text>
          </Container>
        </Container>
        <Container width={200} height={1} backgroundColor={colors.border} marginTop={8} />
        <Text fontSize={11} color={colors.text} fontWeight={400}>
          16 second cycle, synchronized globally
        </Text>
      </Container>

      <Container maxWidth={320} alignItems="center">
        <Text fontSize={12} color={colors.textDim} textAlign="center" fontWeight={400}>
          Everyone using Gaia breathes in the same rhythm, creating a global meditation synchronized
          by time itself.
        </Text>
      </Container>

      {/* Navigation */}
      <Container flexDirection="row" gap={16} alignItems="center">
        <Container
          padding={12}
          paddingX={20}
          borderRadius={20}
          backgroundColor={isHoveringBack ? colors.glassDark : 'transparent'}
          borderWidth={1}
          borderColor={colors.border}
          cursor="pointer"
          onPointerEnter={() => setIsHoveringBack(true)}
          onPointerLeave={() => setIsHoveringBack(false)}
          onClick={onBack}
        >
          <Text fontSize={10} color={colors.textDim} letterSpacing={0.15} fontWeight={600}>
            ← BACK
          </Text>
        </Container>

        <Container
          padding={16}
          paddingX={32}
          borderRadius={24}
          backgroundColor={isHoveringNext ? colors.accentHover : colors.accent}
          cursor="pointer"
          onPointerEnter={() => setIsHoveringNext(true)}
          onPointerLeave={() => setIsHoveringNext(false)}
          onClick={onNext}
        >
          <Text fontSize={11} color={colors.textLight} letterSpacing={0.2} fontWeight={600}>
            CONTINUE
          </Text>
        </Container>
      </Container>
    </Container>
  );
}

interface PreferencesStepProps {
  onNext: () => void;
  onBack: () => void;
}

function PreferencesStep({ onNext, onBack }: PreferencesStepProps) {
  const { soundEnabled, hapticsEnabled, updatePreference } = useUserPreferences();
  const [isHoveringNext, setIsHoveringNext] = useState(false);
  const [isHoveringBack, setIsHoveringBack] = useState(false);

  return (
    <Container flexDirection="column" alignItems="center" gap={32}>
      <Container flexDirection="column" alignItems="center" gap={8}>
        <Text fontSize={10} color={colors.textDim} letterSpacing={0.3} fontWeight={600}>
          CUSTOMIZE
        </Text>
        <Text fontSize={24} color={colors.text} letterSpacing={0.05} fontWeight={400}>
          Quick Preferences
        </Text>
      </Container>

      <Container maxWidth={280} alignItems="center">
        <Text fontSize={12} color={colors.textDim} textAlign="center" fontWeight={400}>
          You can change these anytime in settings.
        </Text>
      </Container>

      {/* Preference Toggles */}
      <Container flexDirection="column" gap={12} minWidth={280}>
        <Container
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          padding={16}
          borderRadius={16}
          backgroundColor={colors.glassDark}
        >
          <Container flexDirection="column" gap={2}>
            <Text fontSize={12} color={colors.text} fontWeight={500}>
              Sound
            </Text>
            <Text fontSize={10} color={colors.textDim}>
              Ambient audio
            </Text>
          </Container>
          <Container
            width={44}
            height={24}
            borderRadius={12}
            backgroundColor={soundEnabled ? colors.accent : 'rgba(140, 123, 108, 0.3)'}
            cursor="pointer"
            onClick={() => updatePreference('soundEnabled', !soundEnabled)}
            justifyContent="center"
            alignItems={soundEnabled ? 'flex-end' : 'flex-start'}
            paddingX={2}
          >
            <Container
              width={20}
              height={20}
              borderRadius={10}
              backgroundColor={colors.textLight}
            />
          </Container>
        </Container>

        <Container
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          padding={16}
          borderRadius={16}
          backgroundColor={colors.glassDark}
        >
          <Container flexDirection="column" gap={2}>
            <Text fontSize={12} color={colors.text} fontWeight={500}>
              Haptics
            </Text>
            <Text fontSize={10} color={colors.textDim}>
              Vibration feedback
            </Text>
          </Container>
          <Container
            width={44}
            height={24}
            borderRadius={12}
            backgroundColor={hapticsEnabled ? colors.accent : 'rgba(140, 123, 108, 0.3)'}
            cursor="pointer"
            onClick={() => updatePreference('hapticsEnabled', !hapticsEnabled)}
            justifyContent="center"
            alignItems={hapticsEnabled ? 'flex-end' : 'flex-start'}
            paddingX={2}
          >
            <Container
              width={20}
              height={20}
              borderRadius={10}
              backgroundColor={colors.textLight}
            />
          </Container>
        </Container>
      </Container>

      {/* Navigation */}
      <Container flexDirection="row" gap={16} alignItems="center">
        <Container
          padding={12}
          paddingX={20}
          borderRadius={20}
          backgroundColor={isHoveringBack ? colors.glassDark : 'transparent'}
          borderWidth={1}
          borderColor={colors.border}
          cursor="pointer"
          onPointerEnter={() => setIsHoveringBack(true)}
          onPointerLeave={() => setIsHoveringBack(false)}
          onClick={onBack}
        >
          <Text fontSize={10} color={colors.textDim} letterSpacing={0.15} fontWeight={600}>
            ← BACK
          </Text>
        </Container>

        <Container
          padding={16}
          paddingX={32}
          borderRadius={24}
          backgroundColor={isHoveringNext ? colors.accentHover : colors.accent}
          cursor="pointer"
          onPointerEnter={() => setIsHoveringNext(true)}
          onPointerLeave={() => setIsHoveringNext(false)}
          onClick={onNext}
        >
          <Text fontSize={11} color={colors.textLight} letterSpacing={0.2} fontWeight={600}>
            CONTINUE
          </Text>
        </Container>
      </Container>
    </Container>
  );
}

interface CompleteStepProps {
  onComplete: () => void;
}

function CompleteStep({ onComplete }: CompleteStepProps) {
  const { userName } = useUserPreferences();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Container flexDirection="column" alignItems="center" gap={32}>
      <Container flexDirection="column" alignItems="center" gap={12}>
        <Text fontSize={10} color={colors.textDim} letterSpacing={0.3} fontWeight={600}>
          YOU'RE READY
        </Text>
        <Text fontSize={28} color={colors.text} letterSpacing={0.05} fontWeight={400}>
          {userName ? `Welcome, ${userName}` : 'Welcome'}
        </Text>
      </Container>

      <Container maxWidth={300} alignItems="center">
        <Text fontSize={13} color={colors.text} textAlign="center" fontWeight={400}>
          Take a moment. Find a comfortable position. When you're ready, begin your first session.
        </Text>
      </Container>

      {/* Visual preview */}
      <Container
        flexDirection="column"
        gap={12}
        padding={24}
        borderRadius={20}
        backgroundColor={colors.glassDark}
        alignItems="center"
      >
        <Container flexDirection="row" gap={24}>
          <Container flexDirection="column" alignItems="center" gap={4}>
            <Text fontSize={24} color={colors.accent} fontWeight={300}>
              75
            </Text>
            <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
              BREATHING NOW
            </Text>
          </Container>
          <Container width={1} height={50} backgroundColor={colors.border} />
          <Container flexDirection="column" alignItems="center" gap={4}>
            <Text fontSize={24} color={colors.accent} fontWeight={300}>
              ∞
            </Text>
            <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
              SESSIONS
            </Text>
          </Container>
        </Container>
      </Container>

      <Container
        padding={20}
        paddingX={48}
        borderRadius={28}
        backgroundColor={isHovering ? colors.accentHover : colors.accent}
        cursor="pointer"
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
        onClick={onComplete}
      >
        <Text fontSize={12} color={colors.textLight} letterSpacing={0.2} fontWeight={600}>
          BEGIN BREATHING
        </Text>
      </Container>
    </Container>
  );
}

export function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');

  const goToNextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  return (
    <Root>
      <Suspense fallback={null}>
        <Fullscreen flexDirection="column" justifyContent="center" alignItems="center" padding={40}>
          {/* Main Container */}
          <Container
            flexDirection="column"
            alignItems="center"
            padding={48}
            borderRadius={32}
            backgroundColor={colors.glass}
            borderWidth={1}
            borderColor={colors.border}
            maxWidth={520}
            minHeight={480}
            justifyContent="center"
          >
            <StepIndicator currentStep={currentStep} />

            {currentStep === 'welcome' && <WelcomeStep onNext={goToNextStep} />}
            {currentStep === 'name' && <NameStep onNext={goToNextStep} onBack={goToPreviousStep} />}
            {currentStep === 'breathing' && (
              <BreathingStep onNext={goToNextStep} onBack={goToPreviousStep} />
            )}
            {currentStep === 'preferences' && (
              <PreferencesStep onNext={goToNextStep} onBack={goToPreviousStep} />
            )}
            {currentStep === 'complete' && <CompleteStep onComplete={handleComplete} />}
          </Container>
        </Fullscreen>
      </Suspense>
    </Root>
  );
}
