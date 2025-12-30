import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { Suspense, useRef } from 'react';
import { useBreathPhaseDisplay3D } from '../hooks/useBreathPhaseDisplay3D';

/**
 * Minimal HUD for breathing meditation using @react-three/uikit
 * Displays: phase name, timer, progress bar, user count
 * Style: Subtle, transparent, minimalist
 */
export function BreathingHUD3D() {
  // biome-ignore lint/suspicious/noExplicitAny: @react-three/uikit v1.0.60 doesn't export component types; using any for JSX props
  const phaseNameRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: @react-three/uikit v1.0.60 doesn't export component types; using any for JSX props
  const timerRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: @react-three/uikit v1.0.60 doesn't export component types; using any for JSX props
  const progressBarRef = useRef<any>(null);

  // Hook manages RAF loop for 60fps updates
  useBreathPhaseDisplay3D({
    phaseNameRef,
    timerRef,
    progressBarRef,
  });

  const userCount = 75;

  return (
    <Root>
      <Suspense fallback={null}>
        <Fullscreen flexDirection="column" justifyContent="flex-end" padding={60}>
          {/* Main HUD Container: Bottom bar with phase, timer, progress, count */}
          <Container
            flexDirection="row"
            gap={30}
            alignItems="center"
            backgroundColor="rgba(250, 248, 243, 0.5)"
            padding={24}
            borderRadius={24}
            borderWidth={1}
            borderColor="rgba(140, 123, 108, 0.1)"
          >
            {/* Phase Name: e.g., "INHALE" */}
            <Container flexDirection="column" gap={4}>
              <Text
                ref={phaseNameRef}
                fontSize={12}
                color="#d4a574"
                letterSpacing={0.2}
                fontWeight={600}
              >
                INHALE
              </Text>
              {/* Timer: e.g., "4s" */}
              <Text ref={timerRef} fontSize={20} color="#8c7b6c" fontWeight={300}>
                4s
              </Text>
            </Container>

            {/* Progress Bar Container */}
            <Container
              flexGrow={1}
              height={2}
              backgroundColor="rgba(140, 123, 108, 0.1)"
              borderRadius={1}
              minWidth={120}
            >
              {/* Animated progress fill - width updated by hook */}
              <Container
                ref={progressBarRef}
                height={2}
                width="0%"
                backgroundColor="#d4a574"
                borderRadius={1}
              />
            </Container>

            {/* User Count: e.g., "75 together" */}
            <Container flexDirection="column" alignItems="flex-end">
              <Text fontSize={10} color="#b8a896" letterSpacing={0.1} fontWeight={600}>
                PRESENCE
              </Text>
              <Container flexDirection="row" alignItems="baseline" gap={4}>
                <Text fontSize={16} color="#8c7b6c" fontWeight={400}>
                  {userCount}
                </Text>
                <Text fontSize={12} color="#b8a896">
                  together
                </Text>
              </Container>
            </Container>
          </Container>
        </Fullscreen>
      </Suspense>
    </Root>
  );
}
