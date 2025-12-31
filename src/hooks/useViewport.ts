import { useEffect, useState } from 'react';

/**
 * Viewport breakpoints for responsive design
 * Based on common device sizes and best practices
 */
export const BREAKPOINTS = {
  mobile: 480, // Small phones (iPhone SE, etc.)
  tablet: 768, // Tablets and large phones
  desktop: 1024, // Desktop and laptop screens
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ViewportSize {
  width: number;
  height: number;
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

/**
 * Determine device type based on viewport width
 */
function getDeviceType(width: number): DeviceType {
  if (width <= BREAKPOINTS.mobile) return 'mobile';
  if (width <= BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

/**
 * useViewport - Responsive viewport size detection hook
 *
 * Provides real-time viewport dimensions and device type detection
 * with debounced resize handling for performance.
 *
 * @returns ViewportSize object with dimensions and device type flags
 *
 * @example
 * ```tsx
 * const { isMobile, width, deviceType } = useViewport();
 *
 * return (
 *   <Container padding={isMobile ? 16 : 32}>
 *     {isMobile ? <MobileLayout /> : <DesktopLayout />}
 *   </Container>
 * );
 * ```
 *
 * Performance: Uses throttled resize listener (100ms) to prevent excessive re-renders
 */
export function useViewport(): ViewportSize {
  const [viewport, setViewport] = useState<ViewportSize>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const deviceType = getDeviceType(width);

    return {
      width,
      height,
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isPortrait: height > width,
      isLandscape: width >= height,
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Throttle resize events to prevent excessive re-renders
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const deviceType = getDeviceType(width);

        // Only update state if values actually changed - prevents unnecessary object recreation
        setViewport((prev) => {
          if (prev.width === width && prev.height === height && prev.deviceType === deviceType) {
            return prev; // Return same object reference - no re-render
          }

          return {
            width,
            height,
            deviceType,
            isMobile: deviceType === 'mobile',
            isTablet: deviceType === 'tablet',
            isDesktop: deviceType === 'desktop',
            isPortrait: height > width,
            isLandscape: width >= height,
          };
        });
      }, 100); // 100ms debounce
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
}

/**
 * Generic responsive value utility - returns value based on device type
 *
 * This is the core utility that both getResponsiveSpacing and getResponsiveFontSize use.
 * Use this directly for any responsive value that needs to scale by device.
 *
 * @param deviceType - Current device type
 * @param mobile - Value for mobile devices
 * @param tablet - Value for tablets (optional, defaults to mobile)
 * @param desktop - Value for desktop (optional, defaults to tablet)
 *
 * @example
 * ```tsx
 * const { deviceType } = useViewport();
 * const padding = getResponsiveValue(deviceType, 16, 24, 32);
 * const opacity = getResponsiveValue(deviceType, 0.8, 0.9, 1);
 * const columns = getResponsiveValue(deviceType, 1, 2, 3);
 * ```
 */
export function getResponsiveValue<T>(
  deviceType: DeviceType,
  mobile: T,
  tablet?: T,
  desktop?: T,
): T {
  switch (deviceType) {
    case 'mobile':
      return mobile;
    case 'tablet':
      return tablet ?? mobile;
    case 'desktop':
      return desktop ?? tablet ?? mobile;
  }
}

/**
 * Responsive spacing utility - scales padding/margin based on device type
 *
 * @param deviceType - Current device type
 * @param mobile - Spacing value for mobile devices (in px)
 * @param tablet - Spacing value for tablets (optional, defaults to mobile)
 * @param desktop - Spacing value for desktop (optional, defaults to tablet)
 *
 * @example
 * ```tsx
 * const { deviceType } = useViewport();
 * const padding = getResponsiveSpacing(deviceType, 16, 24, 32);
 * ```
 */
export function getResponsiveSpacing(
  deviceType: DeviceType,
  mobile: number,
  tablet?: number,
  desktop?: number,
): number {
  return getResponsiveValue(deviceType, mobile, tablet, desktop);
}

/**
 * Responsive font size utility - scales text based on device type
 *
 * @param deviceType - Current device type
 * @param mobile - Font size for mobile (in rem)
 * @param tablet - Font size for tablets (optional)
 * @param desktop - Font size for desktop (optional)
 *
 * @example
 * ```tsx
 * const { deviceType } = useViewport();
 * const fontSize = getResponsiveFontSize(deviceType, 0.875, 1, 1.125);
 * ```
 */
export function getResponsiveFontSize(
  deviceType: DeviceType,
  mobile: number,
  tablet?: number,
  desktop?: number,
): number {
  return getResponsiveValue(deviceType, mobile, tablet, desktop);
}
