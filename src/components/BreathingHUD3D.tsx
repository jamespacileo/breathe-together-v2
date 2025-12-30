import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { Suspense, useRef } from 'react';
import { useBreathPhaseDisplay3D } from '../hooks/useBreathPhaseDisplay3D';

/**
 * Minimal HUD for breathing meditation using @react-three/uikit
 * Displays: phase name, timer, progress bar, user count
 *
 * Style: Watercolor-inspired with soft edges, warm tones, and organic feel
 * - Layered transparency for depth
 * - Warm cream/ivory backgrounds matching scene
 * - Soft shadows and rounded corners
 * - Breathing-synchronized opacity (handled by hook)
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
          {/* Outer glow layer - creates soft watercolor edge effect */}
          <Container
            flexDirection="row"
            padding={4}
            borderRadius={28}
            backgroundColor="rgba(212, 165, 116, 0.08)"
          >
            {/* Main HUD Container: Watercolor-styled bottom bar */}
            <Container
              flexDirection="row"
              gap={30}
              alignItems="center"
              backgroundColor="rgba(255, 254, 250, 0.65)"
              padding={24}
              borderRadius={24}
              borderWidth={1}
              borderColor="rgba(184, 168, 150, 0.15)"
            >
              {/* Phase Name Section: Warm accent color */}
              <Container flexDirection="column" gap={6}>
                {/* Phase label with watercolor accent underline */}
                <Container flexDirection="column" gap={2}>
                  <Text
                    ref={phaseNameRef}
                    fontSize={13}
                    color="#c49a6c"
                    letterSpacing={0.25}
                    fontWeight={600}
                  >
                    INHALE
                  </Text>
                  {/* Decorative watercolor stroke beneath phase name */}
                  <Container
                    height={2}
                    width={40}
                    backgroundColor="rgba(212, 165, 116, 0.4)"
                    borderRadius={1}
                  />
                </Container>
                {/* Timer: Larger, warm gray */}
                <Text ref={timerRef} fontSize={22} color="#7a6b5c" fontWeight={300}>
                  4s
                </Text>
              </Container>

              {/* Progress Bar Container - Soft watercolor track */}
              <Container
                flexGrow={1}
                height={3}
                backgroundColor="rgba(140, 123, 108, 0.12)"
                borderRadius={2}
                minWidth={140}
              >
                {/* Animated progress fill - gradient-like warm tone */}
                <Container
                  ref={progressBarRef}
                  height={3}
                  width="0%"
                  backgroundColor="#c9a07a"
                  borderRadius={2}
                />
              </Container>

              {/* User Count Section: Soft presence indicator */}
              <Container flexDirection="column" alignItems="flex-end" gap={4}>
                <Text fontSize={9} color="#a89888" letterSpacing={0.15} fontWeight={600}>
                  PRESENCE
                </Text>
                <Container flexDirection="row" alignItems="baseline" gap={5}>
                  <Text fontSize={18} color="#7a6b5c" fontWeight={400}>
                    {userCount}
                  </Text>
                  <Text fontSize={11} color="#a89888" fontWeight={300}>
                    together
                  </Text>
                </Container>
              </Container>
            </Container>
          </Container>
        </Fullscreen>
      </Suspense>
    </Root>
  );
}
