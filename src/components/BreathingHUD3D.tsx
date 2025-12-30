import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { Suspense, useRef } from 'react';
import { useBreathPhaseDisplay3D } from '../hooks/useBreathPhaseDisplay3D';
import { getResponsiveSpacing, useViewport } from '../hooks/useViewport';

/**
 * Minimal HUD for breathing meditation using @react-three/uikit
 * Displays: phase name, timer, progress bar, user count
 * Style: Subtle, transparent, minimalist
 *
 * Mobile Responsive:
 * - Scales padding, gaps, and font sizes based on viewport
 * - Optimized for 320px-480px (mobile), 481px-768px (tablet), 769px+ (desktop)
 * - Uses safe area padding on mobile to avoid notch/home indicator overlap
 */
export function BreathingHUD3D() {
  // @react-three/uikit doesn't export runtime instance types.
  // Custom types in src/types/uikit.d.ts define properties we access at runtime.
  // biome-ignore lint/suspicious/noExplicitAny: uikit v1.0.60 component refs incompatible with runtime access patterns; see src/types/uikit.d.ts
  const phaseNameRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: uikit v1.0.60 component refs incompatible with runtime access patterns; see src/types/uikit.d.ts
  const timerRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: uikit v1.0.60 component refs incompatible with runtime access patterns; see src/types/uikit.d.ts
  const progressBarRef = useRef<any>(null);

  // Hook manages RAF loop for 60fps updates
  useBreathPhaseDisplay3D({
    phaseNameRef,
    timerRef,
    progressBarRef,
  });

  const { deviceType, isMobile } = useViewport();

  // Responsive sizing based on device type
  const padding = getResponsiveSpacing(deviceType, 16, 32, 60); // Mobile: 16px, Tablet: 32px, Desktop: 60px
  const gap = getResponsiveSpacing(deviceType, 12, 20, 30); // Mobile: 12px, Tablet: 20px, Desktop: 30px
  const containerPadding = getResponsiveSpacing(deviceType, 12, 16, 24); // Mobile: 12px, Tablet: 16px, Desktop: 24px
  const borderRadius = getResponsiveSpacing(deviceType, 16, 20, 24); // Mobile: 16px, Tablet: 20px, Desktop: 24px

  // Responsive font sizes - larger for mobile readability (minimum 12px for legibility)
  const phaseFontSize = isMobile ? 14 : 12; // Larger phase label on mobile for readability
  const timerFontSize = isMobile ? 22 : 20; // Larger timer on mobile
  const countFontSize = isMobile ? 11 : 10; // Readable "PRESENCE" label
  const countNumberSize = isMobile ? 18 : 16; // Larger presence count
  const countTextSize = isMobile ? 13 : 12; // Larger "together" text

  // Progress bar sizing
  const progressMinWidth = isMobile ? 80 : 120; // Narrower on mobile
  const progressHeight = 2;

  const userCount = 75;

  return (
    <Root>
      <Suspense fallback={null}>
        <Fullscreen flexDirection="column" justifyContent="flex-end" padding={padding}>
          {/* Main HUD Container: Bottom bar with phase, timer, progress, count */}
          <Container
            flexDirection="row"
            gap={gap}
            alignItems="center"
            backgroundColor="rgba(250, 248, 243, 0.5)"
            padding={containerPadding}
            borderRadius={borderRadius}
            borderWidth={1}
            borderColor="rgba(140, 123, 108, 0.1)"
          >
            {/* Phase Name: e.g., "INHALE" */}
            <Container flexDirection="column" gap={4}>
              <Text
                ref={phaseNameRef}
                fontSize={phaseFontSize}
                color="#d4a574"
                letterSpacing={0.2}
                fontWeight={600}
              >
                INHALE
              </Text>
              {/* Timer: e.g., "4s" */}
              <Text ref={timerRef} fontSize={timerFontSize} color="#8c7b6c" fontWeight={300}>
                4s
              </Text>
            </Container>

            {/* Progress Bar Container */}
            <Container
              flexGrow={1}
              height={progressHeight}
              backgroundColor="rgba(140, 123, 108, 0.1)"
              borderRadius={1}
              minWidth={progressMinWidth}
            >
              {/* Animated progress fill - width updated by hook */}
              <Container
                ref={progressBarRef}
                height={progressHeight}
                width="0%"
                backgroundColor="#d4a574"
                borderRadius={1}
              />
            </Container>

            {/* User Count: e.g., "75 together" */}
            <Container flexDirection="column" alignItems="flex-end">
              <Text fontSize={countFontSize} color="#b8a896" letterSpacing={0.1} fontWeight={600}>
                PRESENCE
              </Text>
              <Container flexDirection="row" alignItems="baseline" gap={4}>
                <Text fontSize={countNumberSize} color="#8c7b6c" fontWeight={400}>
                  {userCount}
                </Text>
                <Text fontSize={countTextSize} color="#b8a896">
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
