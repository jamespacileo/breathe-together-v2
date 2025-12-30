import { useEffect, useRef, useState } from 'react';

/**
 * Intro phases:
 * 0 - Initial fade in (blur backdrop appears)
 * 1 - App name visible (title animation)
 * 2 - Secondary text with CTA (call to action)
 * 3 - Fade out (intro complete)
 */
type IntroPhase = 0 | 1 | 2 | 3;

/** Easing function: ease out quadratic */
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Easing function: ease in quadratic */
function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Calculate title animation values based on elapsed time.
 * Title animation: fade in (0-1s), hold (1-2s), fade out (2-3s)
 */
function calculateTitleAnimation(elapsed: number): { opacity: number; scale: number } {
  if (elapsed < 1) {
    // Fade in with ease-out
    const opacity = easeOutQuad(elapsed);
    return { opacity, scale: 0.96 + opacity * 0.04 };
  }
  if (elapsed < 2) {
    // Hold
    return { opacity: 1, scale: 1 };
  }
  if (elapsed < 3) {
    // Fade out with ease-in
    const opacity = 1 - easeInQuad(elapsed - 2);
    return { opacity, scale: 0.96 + opacity * 0.04 };
  }
  // After animation completes
  return { opacity: 0, scale: 0.96 };
}

/**
 * Calculate CTA container animation values.
 * Starts after title fades (3s), animates over 0.8s
 */
function calculateCtaAnimation(elapsed: number): { opacity: number; scale: number } {
  const ctaElapsed = elapsed - 3;
  if (ctaElapsed <= 0) {
    return { opacity: 0, scale: 0.96 };
  }
  const t = Math.min(1, ctaElapsed / 0.8);
  const opacity = easeOutQuad(t);
  return { opacity, scale: 0.96 + opacity * 0.04 };
}

interface CinematicIntroProps {
  /** Called when user clicks the CTA button or intro completes */
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
 * Displays a blurred backdrop with:
 * 1. App name fade in/out
 * 2. Secondary text with CTA button
 *
 * Styled to match InspirationalText with warm palette and elegant typography.
 */
export function CinematicIntro({
  onComplete,
  appName = 'Breathe Together',
  taglineTop = 'Join thousands breathing',
  taglineBottom = 'in harmony with Earth',
  ctaText = 'Join the Sphere',
}: CinematicIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>(0);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const ctaContainerRef = useRef<HTMLDivElement>(null);

  // Design tokens matching InspirationalText/SimpleGaiaUI warm palette
  // Backdrop is semi-transparent to show breathing sphere animation behind (adds suspense)
  const colors = {
    text: '#5a4d42',
    textDim: '#7a6b5e',
    textGlow: 'rgba(201, 160, 108, 0.8)',
    subtleGlow: 'rgba(255, 252, 245, 0.98)',
    // Reduced opacity to show breathing animation behind
    backdropInner: 'rgba(253, 251, 247, 0.45)',
    backdropOuter: 'rgba(253, 251, 247, 0.25)',
    glass: 'rgba(252, 250, 246, 0.7)',
    border: 'rgba(160, 140, 120, 0.15)',
    accent: '#c9a06c',
    accentHover: '#b8935f',
  };

  // Phase timing sequence
  useEffect(() => {
    // Phase 0 → 1: Initial fade in (500ms delay)
    const timer1 = setTimeout(() => {
      setFadeOpacity(1);
      setPhase(1);
    }, 500);

    // Phase 1 → 2: Show CTA after title animation (3.5s)
    const timer2 = setTimeout(() => {
      setPhase(2);
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // RAF loop for smooth title animation during phase 1
  useEffect(() => {
    if (phase < 1) return;

    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Update title element
      if (titleRef.current) {
        const { opacity, scale } = calculateTitleAnimation(elapsed);
        titleRef.current.style.opacity = String(opacity);
        titleRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      // Update CTA container during phase 2
      if (ctaContainerRef.current && phase >= 2) {
        const { opacity, scale } = calculateCtaAnimation(elapsed);
        ctaContainerRef.current.style.opacity = String(opacity);
        ctaContainerRef.current.style.transform = `scale(${scale})`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [phase]);

  const handleCtaClick = () => {
    setPhase(3);
    // Fade out animation
    setFadeOpacity(0);
    // Call onComplete after fade out
    setTimeout(onComplete, 600);
  };

  // Shared text styling matching InspirationalText
  const titleStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(2.2rem, 5vw, 4rem)',
    fontWeight: 300,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: colors.text,
    textShadow: `
      0 0 30px ${colors.subtleGlow},
      0 0 60px ${colors.textGlow},
      0 2px 8px rgba(0, 0, 0, 0.08)
    `,
    textAlign: 'center',
    lineHeight: 1.2,
    userSelect: 'none',
  };

  const taglineStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
    fontWeight: 300,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: colors.text,
    textShadow: `
      0 0 25px ${colors.subtleGlow},
      0 0 50px ${colors.textGlow},
      0 1px 6px rgba(0, 0, 0, 0.1)
    `,
    textAlign: 'center',
    lineHeight: 1.3,
    userSelect: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: phase === 3 ? 'none' : 'auto',
        opacity: fadeOpacity,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Semi-transparent backdrop - light blur to show breathing sphere behind */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: `radial-gradient(
            ellipse 100% 100% at center,
            ${colors.backdropInner} 0%,
            ${colors.backdropOuter} 100%
          )`,
        }}
      />

      {/* App name (Phase 1) */}
      <div
        ref={titleRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.96)',
          opacity: 0,
          zIndex: 2,
          padding: 'clamp(30px, 6vw, 60px) clamp(50px, 12vw, 120px)',
          background: `radial-gradient(
            ellipse 140% 120% at center,
            ${colors.glass} 0%,
            rgba(253, 251, 247, 0) 70%
          )`,
          borderRadius: '120px',
        }}
      >
        <h1 style={titleStyle}>{appName}</h1>
      </div>

      {/* CTA Container (Phase 2) */}
      <div
        ref={ctaContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transform: 'scale(0.96)',
          zIndex: 1,
          gap: 'clamp(60px, 12vh, 120px)',
          pointerEvents: phase >= 2 ? 'auto' : 'none',
        }}
      >
        {/* Top tagline */}
        <div
          style={{
            padding: 'clamp(20px, 4vw, 40px) clamp(40px, 10vw, 100px)',
            background: `radial-gradient(
              ellipse 120% 100% at center,
              rgba(253, 251, 247, 0.5) 0%,
              rgba(253, 251, 247, 0) 65%
            )`,
            borderRadius: '100px',
          }}
        >
          <p style={taglineStyle}>{taglineTop}</p>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleCtaClick}
          style={{
            background: colors.accent,
            color: '#fff',
            border: 'none',
            padding: 'clamp(14px, 2vw, 20px) clamp(36px, 6vw, 56px)',
            borderRadius: '40px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 'clamp(0.8rem, 1.2vw, 1rem)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            boxShadow: `
              0 4px 20px rgba(201, 160, 108, 0.4),
              0 8px 40px rgba(201, 160, 108, 0.2)
            `,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.accentHover;
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = `
              0 6px 24px rgba(201, 160, 108, 0.5),
              0 12px 48px rgba(201, 160, 108, 0.25)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.accent;
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `
              0 4px 20px rgba(201, 160, 108, 0.4),
              0 8px 40px rgba(201, 160, 108, 0.2)
            `;
          }}
        >
          {ctaText}
        </button>

        {/* Bottom tagline */}
        <div
          style={{
            padding: 'clamp(20px, 4vw, 40px) clamp(40px, 10vw, 100px)',
            background: `radial-gradient(
              ellipse 120% 100% at center,
              rgba(253, 251, 247, 0.5) 0%,
              rgba(253, 251, 247, 0) 65%
            )`,
            borderRadius: '100px',
          }}
        >
          <p style={taglineStyle}>{taglineBottom}</p>
        </div>
      </div>
    </div>
  );
}
