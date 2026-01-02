import { useEffect, useState } from 'react';

/**
 * Hook for creating staggered fade-in animations on entities.
 *
 * Returns an opacity value (0-1) that animates from 0 to 1 after a delay.
 * Use this to create cinematic reveal effects where entities appear progressively.
 *
 * @param delay - Milliseconds to wait before starting fade-in
 * @param duration - Milliseconds for the fade animation (default: 800ms)
 * @param enabled - Whether the fade should be enabled (default: true)
 * @returns Current opacity value (0-1)
 *
 * @example
 * ```tsx
 * function MyEntity() {
 *   const opacity = useFadeIn(500, 800); // Start after 500ms, fade over 800ms
 *   return <mesh material-opacity={opacity} material-transparent />;
 * }
 * ```
 */
export function useFadeIn(delay: number, duration = 800, enabled = true): number {
  const [opacity, setOpacity] = useState(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      setOpacity(1);
      return;
    }

    let animationFrame: number;
    let startTime: number;

    const delayTimeout = setTimeout(() => {
      startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic for smooth deceleration
        const eased = 1 - (1 - progress) ** 3;
        setOpacity(eased);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimeout);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [delay, duration, enabled]);

  return opacity;
}

/**
 * Staggered fade-in configuration for scene entities.
 *
 * Defines the reveal order and timing for a cinematic loading experience.
 * Environment appears first (sets mood), followed by globe (focal point),
 * then particles (detail layer).
 */
export const FADE_IN_TIMING = {
  /** Environment: clouds, lighting, backdrop - appears first */
  environment: { delay: 0, duration: 1000 },

  /** EarthGlobe: central sphere - appears after environment */
  globe: { delay: 400, duration: 800 },

  /** ParticleSwarm: orbiting shards - appears after globe */
  particles: { delay: 800, duration: 800 },

  /** AtmosphericParticles: ambient polish - appears last */
  atmosphere: { delay: 1200, duration: 1000 },
} as const;

/**
 * Hook that returns all fade-in opacities for scene entities.
 *
 * Provides a coordinated set of opacity values for staggered entity reveal.
 * Use this in the main scene component to distribute values to children.
 *
 * @param enabled - Whether staggered loading is enabled (disable for instant reveal)
 * @returns Object with opacity values for each entity type
 *
 * @example
 * ```tsx
 * function BreathingLevel() {
 *   const fadeIn = useSceneFadeIn();
 *   return (
 *     <>
 *       <Environment opacity={fadeIn.environment} />
 *       <EarthGlobe opacity={fadeIn.globe} />
 *       <ParticleSwarm opacity={fadeIn.particles} />
 *     </>
 *   );
 * }
 * ```
 */
export function useSceneFadeIn(enabled = true) {
  const environment = useFadeIn(
    FADE_IN_TIMING.environment.delay,
    FADE_IN_TIMING.environment.duration,
    enabled,
  );

  const globe = useFadeIn(FADE_IN_TIMING.globe.delay, FADE_IN_TIMING.globe.duration, enabled);

  const particles = useFadeIn(
    FADE_IN_TIMING.particles.delay,
    FADE_IN_TIMING.particles.duration,
    enabled,
  );

  const atmosphere = useFadeIn(
    FADE_IN_TIMING.atmosphere.delay,
    FADE_IN_TIMING.atmosphere.duration,
    enabled,
  );

  return { environment, globe, particles, atmosphere };
}
