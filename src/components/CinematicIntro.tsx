import { useEffect, useRef, useState } from 'react';
import { CenteredLayout, CinematicText, OverlayBackdrop, PrimaryButton } from '../ui';
import { Z_LAYERS } from '../ui/theme';

/**
 * Intro animation phases:
 * 0 - Initial (waiting to fade in)
 * 1 - Title visible (app name animating)
 * 2 - CTA visible (taglines + button)
 * 3 - Fading out (complete)
 */
type IntroPhase = 0 | 1 | 2 | 3;

/** Easing: ease out quadratic */
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/** Easing: ease in quadratic */
const easeInQuad = (t: number): number => t * t;

/** Calculate title animation values based on elapsed time */
function getTitleAnimation(elapsed: number): { opacity: number; scale: number } {
  if (elapsed < 1) {
    const opacity = easeOutQuad(elapsed);
    return { opacity, scale: 0.96 + opacity * 0.04 };
  }
  if (elapsed < 2) {
    return { opacity: 1, scale: 1 };
  }
  if (elapsed < 3) {
    const opacity = 1 - easeInQuad(elapsed - 2);
    return { opacity, scale: 0.96 + opacity * 0.04 };
  }
  return { opacity: 0, scale: 0.96 };
}

/** Calculate CTA animation values based on elapsed time */
function getCtaAnimation(elapsed: number): { opacity: number; scale: number } {
  const ctaElapsed = elapsed - 3;
  if (ctaElapsed <= 0) return { opacity: 0, scale: 0.96 };
  const t = Math.min(1, ctaElapsed / 0.8);
  const opacity = easeOutQuad(t);
  return { opacity, scale: 0.96 + opacity * 0.04 };
}

interface CinematicIntroProps {
  /** Called when user clicks the CTA button */
  onComplete: () => void;
  /** App name to display */
  appName?: string;
  /** Tagline text above CTA */
  taglineTop?: string;
  /** Tagline text below CTA */
  taglineBottom?: string;
  /** CTA button text */
  ctaText?: string;
}

/**
 * CinematicIntro - Cinematic opening sequence for the app
 *
 * A simplified implementation using shared UI primitives.
 * Shows app name with fade in/out, then taglines with CTA button.
 *
 * Uses shared components:
 * - OverlayBackdrop for semi-transparent blurred background
 * - CinematicText for styled typography
 * - PrimaryButton for CTA
 * - CenteredLayout for vertical centering
 */
export function CinematicIntro({
  onComplete,
  appName = 'Breathe Together',
  taglineTop = 'Join thousands breathing',
  taglineBottom = 'in harmony with Earth',
  ctaText = 'Join the Sphere',
}: CinematicIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>(0);
  const [isVisible, setIsVisible] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Phase timing sequence
  useEffect(() => {
    // Phase 0 → 1: Fade in after 500ms
    const t1 = setTimeout(() => {
      setIsVisible(true);
      setPhase(1);
    }, 500);

    // Phase 1 → 2: Show CTA after title animation (3.5s total)
    const t2 = setTimeout(() => setPhase(2), 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // RAF loop for smooth animations
  useEffect(() => {
    if (phase < 1) return;

    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Title animation: fade in (0-1s), hold (1-2s), fade out (2-3s)
      if (titleRef.current) {
        const { opacity, scale } = getTitleAnimation(elapsed);
        titleRef.current.style.opacity = String(opacity);
        titleRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      // CTA animation: fade in after 3s
      if (ctaRef.current && phase >= 2) {
        const { opacity, scale } = getCtaAnimation(elapsed);
        ctaRef.current.style.opacity = String(opacity);
        ctaRef.current.style.transform = `scale(${scale})`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [phase]);

  const handleCtaClick = () => {
    setPhase(3);
    setIsVisible(false);
    setTimeout(onComplete, 600);
  };

  return (
    <OverlayBackdrop
      blur="subtle"
      opacity={0.4}
      zIndex={Z_LAYERS.intro}
      blockEvents={phase !== 3}
      visible={isVisible}
    >
      {/* Title (Phase 1) - Centered absolutely */}
      <div
        ref={titleRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.96)',
          opacity: 0,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <CinematicText variant="hero" withBackdrop>
          {appName}
        </CinematicText>
      </div>

      {/* CTA Container (Phase 2) */}
      <div
        ref={ctaRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          transform: 'scale(0.96)',
          zIndex: 1,
          pointerEvents: phase >= 2 ? 'auto' : 'none',
        }}
      >
        <CenteredLayout gap="large">
          <CinematicText variant="title" withBackdrop>
            {taglineTop}
          </CinematicText>

          <PrimaryButton size="large" onClick={handleCtaClick}>
            {ctaText}
          </PrimaryButton>

          <CinematicText variant="title" withBackdrop>
            {taglineBottom}
          </CinematicText>
        </CenteredLayout>
      </div>
    </OverlayBackdrop>
  );
}
