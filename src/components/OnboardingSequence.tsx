/**
 * OnboardingSequence - Cinematic mood selection → shard reveal transition
 *
 * This component renders the visual sequence after a user selects their mood:
 * 1. Dissolving: Modal fades out while selected mood lingers
 * 2. Interstitial: "This is you" reveal with animated icosahedron
 * 3. Launching: Icosahedron "flies" to its orbit position
 * 4. Integrating: Subtle glow indicates user's shard in the scene
 *
 * Design philosophy: Each transition guides the eye and teaches the user
 * that their icosahedron represents them among all breathers.
 */

import { memo, useMemo } from 'react';
import { MOOD_METADATA, type MoodId } from '../constants';
import { ONBOARDING_EASINGS, type OnboardingPhase } from '../hooks/useOnboardingSequence';
import { useViewport } from '../hooks/useViewport';
import { MOOD_COLORS } from '../styles/designTokens';
import { CSSIcosahedron } from './CSSIcosahedron';

interface OnboardingSequenceProps {
  /** Current phase of the sequence */
  phase: OnboardingPhase;
  /** Progress through current phase (0-1) */
  phaseProgress: number;
  /** Selected mood */
  selectedMood: MoodId | null;
}

/**
 * Calculate opacity for dissolving phase (modal fading out)
 */
function getDissolvingOpacity(progress: number): number {
  return 1 - ONBOARDING_EASINGS.easeInOutQuad(progress);
}

/**
 * Calculate interstitial animation values
 */
function getInterstitialAnimation(progress: number) {
  const easedProgress = ONBOARDING_EASINGS.easeOutExpo(progress);

  // Staggered fade-ins
  const headerOpacity = Math.min(progress * 4, 1);
  const moodOpacity = Math.min(Math.max((progress - 0.1) * 3, 0), 1);
  const iconOpacity = Math.min(Math.max((progress - 0.2) * 2.5, 0), 1);
  const subtextOpacity = Math.min(Math.max((progress - 0.4) * 2.5, 0), 1);

  // Icon scale with slight bounce
  const iconScale =
    progress < 0.3
      ? ONBOARDING_EASINGS.easeOutBack(progress / 0.3)
      : 1 + Math.sin(progress * Math.PI * 2) * 0.05; // Gentle pulse after entrance

  return {
    headerOpacity,
    moodOpacity,
    iconOpacity,
    subtextOpacity,
    iconScale,
    containerOpacity: easedProgress,
  };
}

/**
 * Calculate launching animation (icon flying to position)
 */
function getLaunchingAnimation(progress: number) {
  const easedProgress = ONBOARDING_EASINGS.easeOutExpo(progress);

  // Position: center → right-upper quadrant (suggesting orbit)
  const translateX = easedProgress * 45; // vw
  const translateY = easedProgress * -25; // vh (upward)

  // Scale: shrinks as it "moves away"
  const scale = 1 - easedProgress * 0.7;

  // Opacity: fades as it integrates
  const opacity = 1 - easedProgress * 0.8;

  // Rotation: spins as it launches
  const rotation = easedProgress * 180;

  return {
    translateX,
    translateY,
    scale,
    opacity,
    rotation,
    containerOpacity: 1 - ONBOARDING_EASINGS.easeInOutQuad(progress),
  };
}

/**
 * Main OnboardingSequence component
 */
function OnboardingSequenceComponent({
  phase,
  phaseProgress,
  selectedMood,
}: OnboardingSequenceProps) {
  const { isMobile, isTablet } = useViewport();

  // Get mood color
  const moodColor = useMemo(
    () => (selectedMood ? MOOD_COLORS[selectedMood] : '#9a8a7a'),
    [selectedMood],
  );

  // Get mood metadata
  const moodMeta = useMemo(
    () => (selectedMood ? MOOD_METADATA[selectedMood] : null),
    [selectedMood],
  );

  // Don't render if not in active phases
  if (phase === 'idle' || phase === 'mood_selected' || phase === 'complete') {
    return null;
  }

  // Calculate phase-specific animations
  const dissolvingOpacity = phase === 'dissolving' ? getDissolvingOpacity(phaseProgress) : 0;

  const interstitialAnim =
    phase === 'interstitial' ? getInterstitialAnimation(phaseProgress) : null;

  const launchingAnim = phase === 'launching' ? getLaunchingAnimation(phaseProgress) : null;

  const integratingOpacity =
    phase === 'integrating' ? 1 - ONBOARDING_EASINGS.easeInOutQuad(phaseProgress) : 0;

  // Responsive sizing
  const iconSize = isMobile ? 72 : isTablet ? 88 : 100;

  return (
    <div
      className="onboarding-sequence"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        pointerEvents: phase === 'dissolving' ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop blur - dissolves with modal */}
      {phase === 'dissolving' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `rgba(0, 0, 0, ${0.25 * dissolvingOpacity})`,
            backdropFilter: `blur(${12 * dissolvingOpacity}px)`,
            transition: 'none',
          }}
        />
      )}

      {/* Interstitial: "This is you" reveal */}
      {(phase === 'interstitial' || phase === 'launching') && interstitialAnim && (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '20px' : '28px',
            padding: isMobile ? '40px' : '60px',
            opacity:
              phase === 'launching'
                ? (launchingAnim?.containerOpacity ?? 0)
                : interstitialAnim.containerOpacity,
            transform:
              phase === 'launching' && launchingAnim
                ? `translate(${launchingAnim.translateX}vw, ${launchingAnim.translateY}vh)`
                : 'translate(0, 0)',
            transition: 'none',
          }}
        >
          {/* Header: "Your Intention" */}
          <div
            style={{
              opacity: interstitialAnim.headerOpacity,
              transform: `translateY(${(1 - interstitialAnim.headerOpacity) * 12}px)`,
              fontSize: isMobile ? '0.65rem' : '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(90, 77, 66, 0.6)',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            Your Intention
          </div>

          {/* Mood Name - Large, elegant */}
          <div
            style={{
              opacity: interstitialAnim.moodOpacity,
              transform: `translateY(${(1 - interstitialAnim.moodOpacity) * 16}px) scale(${0.95 + interstitialAnim.moodOpacity * 0.05})`,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '2.5rem' : isTablet ? '3rem' : '3.5rem',
              fontWeight: 300,
              letterSpacing: '0.08em',
              color: '#3d3229',
              textShadow: `0 2px 30px ${moodColor}30`,
            }}
          >
            {moodMeta?.label ?? 'Presence'}
          </div>

          {/* Animated Icosahedron */}
          <div
            style={{
              opacity: interstitialAnim.iconOpacity,
              transform:
                phase === 'launching' && launchingAnim
                  ? `scale(${launchingAnim.scale}) rotate(${launchingAnim.rotation}deg)`
                  : `scale(${interstitialAnim.iconScale})`,
              transition: 'none',
              marginTop: isMobile ? '8px' : '16px',
              marginBottom: isMobile ? '8px' : '16px',
            }}
          >
            <CSSIcosahedron
              color={moodColor}
              size={iconSize}
              isActive
              animated
              glowIntensity={0.8}
            />
          </div>

          {/* Subtext - Teaching moment */}
          <div
            style={{
              opacity: interstitialAnim.subtextOpacity,
              transform: `translateY(${(1 - interstitialAnim.subtextOpacity) * 8}px)`,
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              color: 'rgba(90, 77, 66, 0.7)',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontStyle: 'italic',
              textAlign: 'center',
              maxWidth: '280px',
              lineHeight: 1.5,
            }}
          >
            This shape joins others breathing around the Earth
          </div>
        </div>
      )}

      {/* Launching phase: Flying icosahedron */}
      {phase === 'launching' && launchingAnim && (
        <div
          className="launching-icon"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: `
              translate(-50%, -50%)
              translate(${launchingAnim.translateX}vw, ${launchingAnim.translateY}vh)
              scale(${launchingAnim.scale})
              rotate(${launchingAnim.rotation}deg)
            `,
            opacity: launchingAnim.opacity,
            transition: 'none',
            zIndex: 401,
          }}
        >
          <CSSIcosahedron color={moodColor} size={iconSize} isActive animated glowIntensity={0.9} />
        </div>
      )}

      {/* Integrating phase: Soft glow pulse */}
      {phase === 'integrating' && (
        <div
          style={{
            position: 'fixed',
            top: '25%',
            right: '15%',
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${moodColor}40 0%, transparent 70%)`,
            opacity: integratingOpacity,
            transform: `scale(${1 + (1 - integratingOpacity) * 0.5})`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

export const OnboardingSequence = memo(OnboardingSequenceComponent);
