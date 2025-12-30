/**
 * Main Menu Screen
 * Entry point for the Gaia breathing meditation app
 * Displays title, start button, and settings access
 */

import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { Suspense, useCallback, useRef, useState } from 'react';
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
  glass: 'rgba(250, 248, 243, 0.7)',
  glassDark: 'rgba(140, 123, 108, 0.1)',
  border: 'rgba(140, 123, 108, 0.15)',
};

export function MainMenu() {
  const { startBreathing, openSettings, resetOnboarding } = useAppState();
  const { userName } = useUserPreferences();
  const [isHoveringStart, setIsHoveringStart] = useState(false);
  const [isHoveringSettings, setIsHoveringSettings] = useState(false);

  // biome-ignore lint/suspicious/noExplicitAny: @react-three/uikit doesn't export component types
  const startButtonRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: @react-three/uikit doesn't export component types
  const settingsButtonRef = useRef<any>(null);

  const handleStartClick = useCallback(() => {
    startBreathing();
  }, [startBreathing]);

  const handleSettingsClick = useCallback(() => {
    openSettings();
  }, [openSettings]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = userName ? `${getGreeting()}, ${userName}` : getGreeting();

  return (
    <Root>
      <Suspense fallback={null}>
        <Fullscreen flexDirection="column" justifyContent="center" alignItems="center" padding={40}>
          {/* Main Container */}
          <Container
            flexDirection="column"
            alignItems="center"
            gap={40}
            padding={60}
            borderRadius={32}
            backgroundColor={colors.glass}
            borderWidth={1}
            borderColor={colors.border}
            maxWidth={480}
          >
            {/* Title Section */}
            <Container flexDirection="column" alignItems="center" gap={8}>
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.3} fontWeight={600}>
                DIGITAL ARTIFACT / 002
              </Text>
              <Text fontSize={36} color={colors.text} letterSpacing={0.1} fontWeight={300}>
                GAIA
              </Text>
              <Text fontSize={14} color={colors.textDim} letterSpacing={0.15} fontWeight={400}>
                Breathing Together
              </Text>
            </Container>

            {/* Greeting */}
            <Container flexDirection="column" alignItems="center" gap={4}>
              <Text fontSize={14} color={colors.text} fontWeight={400}>
                {greeting}
              </Text>
              <Text fontSize={11} color={colors.textDim} fontWeight={400}>
                Ready to breathe?
              </Text>
            </Container>

            {/* Divider */}
            <Container width={120} height={1} backgroundColor={colors.border} />

            {/* Start Button */}
            <Container
              ref={startButtonRef}
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              padding={20}
              paddingX={48}
              borderRadius={28}
              backgroundColor={isHoveringStart ? colors.accentHover : colors.accent}
              cursor="pointer"
              onPointerEnter={() => setIsHoveringStart(true)}
              onPointerLeave={() => setIsHoveringStart(false)}
              onClick={handleStartClick}
            >
              <Text fontSize={12} color={colors.textLight} letterSpacing={0.2} fontWeight={600}>
                BEGIN SESSION
              </Text>
            </Container>

            {/* Settings Button */}
            <Container
              ref={settingsButtonRef}
              flexDirection="row"
              alignItems="center"
              gap={8}
              padding={12}
              paddingX={24}
              borderRadius={20}
              backgroundColor={isHoveringSettings ? colors.glassDark : 'transparent'}
              borderWidth={1}
              borderColor={isHoveringSettings ? colors.border : 'transparent'}
              cursor="pointer"
              onPointerEnter={() => setIsHoveringSettings(true)}
              onPointerLeave={() => setIsHoveringSettings(false)}
              onClick={handleSettingsClick}
            >
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.15} fontWeight={600}>
                SETTINGS
              </Text>
            </Container>

            {/* Stats Preview */}
            <Container flexDirection="row" gap={32} marginTop={8}>
              <Container flexDirection="column" alignItems="center" gap={2}>
                <Text fontSize={18} color={colors.text} fontWeight={300}>
                  75
                </Text>
                <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
                  BREATHING NOW
                </Text>
              </Container>
              <Container width={1} height={40} backgroundColor={colors.border} />
              <Container flexDirection="column" alignItems="center" gap={2}>
                <Text fontSize={18} color={colors.text} fontWeight={300}>
                  16s
                </Text>
                <Text fontSize={9} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
                  CYCLE
                </Text>
              </Container>
            </Container>
          </Container>

          {/* Dev tools (only in development) */}
          {import.meta.env.DEV && (
            <Container
              marginTop={20}
              padding={8}
              paddingX={16}
              borderRadius={12}
              backgroundColor={colors.glassDark}
              cursor="pointer"
              onClick={resetOnboarding}
            >
              <Text fontSize={9} color={colors.textDim} letterSpacing={0.1}>
                DEV: Reset Onboarding
              </Text>
            </Container>
          )}
        </Fullscreen>
      </Suspense>
    </Root>
  );
}
