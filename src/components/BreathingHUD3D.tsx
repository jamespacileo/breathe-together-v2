import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { useRef } from 'react';
import { useBreathPhaseDisplay3D } from '../hooks/useBreathPhaseDisplay3D';
import { usePresence } from '../hooks/usePresence';

/**
 * Minimal HUD for breathing meditation using @react-three/uikit
 * Displays: phase name, timer, progress bar, user count
 * Style: Subtle, transparent, minimalist
 */
export function BreathingHUD3D() {
  const phaseNameRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const progressBarRef = useRef<any>(null);

  // Hook manages RAF loop for 60fps updates
  useBreathPhaseDisplay3D({
    phaseNameRef,
    timerRef,
    progressBarRef,
  });

  const { count: userCount = 0 } = usePresence();

  return (
    <Root>
      <Fullscreen flexDirection="column" justifyContent="flex-end" padding={40}>
        {/* Main HUD Container: Bottom bar with phase, timer, progress, count */}
        <Container
          flexDirection="row"
          gap={20}
          alignItems="center"
          backgroundColor="rgba(18,16,22,0.45)"
          padding={20}
          borderRadius={16}
          paddingBottom={20}
          paddingTop={20}
          paddingLeft={20}
          paddingRight={20}
        >
          {/* Phase Name: e.g., "INHALE" */}
          <Text
            ref={phaseNameRef}
            fontSize={18}
            color="#fffef7"
            letterSpacing={0.1}
            fontWeight="bold"
            width="auto"
          >
            Inhale
          </Text>

          {/* Timer: e.g., "4s" */}
          <Text ref={timerRef} fontSize={24} color="#fffef7" width="auto" fontFamily="monospace">
            4s
          </Text>

          {/* Progress Bar Container */}
          <Container
            flexGrow={1}
            height={6}
            backgroundColor="rgba(126,200,212,0.1)"
            borderRadius={3}
            minWidth={100}
          >
            {/* Animated progress fill - width updated by hook */}
            <Container
              ref={progressBarRef}
              height={6}
              width="0%"
              backgroundColor="rgba(126,200,212,1)"
              borderRadius={3}
            />
          </Container>

          {/* User Count: e.g., "75 together" */}
          <Text fontSize={14} color="#b8a896" opacity={0.7} width="auto" minWidth={100}>
            {userCount} together
          </Text>
        </Container>
      </Fullscreen>
    </Root>
  );
}
