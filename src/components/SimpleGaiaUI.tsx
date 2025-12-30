import { useEffect, useRef, useState } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE, type MoodId } from '../constants';
import { MONUMENT_VALLEY_PALETTE } from '../lib/colors';
import { getResponsiveSpacing, useViewport } from '../hooks/useViewport';
import { InspirationalText } from './InspirationalText';

// Phase configuration
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

interface PhaseInfo {
  phaseIndex: number;
  phaseProgress: number;
  accumulatedTime: number;
  phaseDuration: number;
}

/**
 * Calculate current breathing phase from cycle time
 * Extracted to reduce cognitive complexity of the main update loop
 */
function calculatePhaseInfo(cycleTime: number): PhaseInfo {
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < PHASE_DURATIONS.length; i++) {
    const duration = PHASE_DURATIONS[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = PHASE_DURATIONS[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  return { phaseIndex, phaseProgress, accumulatedTime, phaseDuration };
}

interface SimpleGaiaUIProps {
  /** Particle count (harmony) */
  harmony: number;
  setHarmony: (v: number) => void;
  /** Index of Refraction - controls light bending through glass */
  ior: number;
  setIor: (v: number) => void;
  /** Glass depth - controls backface normal blending/distortion */
  glassDepth: number;
  setGlassDepth: (v: number) => void;
  /** Orbit radius - how far particles orbit from center */
  orbitRadius: number;
  setOrbitRadius: (v: number) => void;
  /** Shard size - maximum size of glass shards */
  shardSize: number;
  setShardSize: (v: number) => void;
  /** Atmosphere density - number of ambient floating particles */
  atmosphereDensity: number;
  setAtmosphereDensity: (v: number) => void;
}

/**
 * SimpleGaiaUI - Simplified breathing meditation interface for first-time users
 *
 * Default view (beginner-friendly):
 * - Breathing phase indicator (center)
 * - Inspirational text (breathing-synchronized)
 * - Subtle presence count
 *
 * Advanced controls:
 * - Hidden by default
 * - Press 'T' key to toggle tuning panel
 *
 * Mobile Responsive:
 * - Adapts padding, font sizes, and layout for 320px-480px (mobile)
 * - Touch-friendly controls with minimum 44px touch targets
 * - Stacks elements vertically on narrow screens
 * - Adjusts modal sizing for small viewports
 */
export function SimpleGaiaUI({
  harmony,
  setHarmony,
  ior,
  setIor,
  glassDepth,
  setGlassDepth,
  orbitRadius,
  setOrbitRadius,
  shardSize,
  setShardSize,
  atmosphereDensity,
  setAtmosphereDensity,
}: SimpleGaiaUIProps) {
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoodSelect, setShowMoodSelect] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

  // Animation states for modals
  const [settingsAnimated, setSettingsAnimated] = useState(false);
  const [moodSelectAnimated, setMoodSelectAnimated] = useState(false);

  // Phase indicator refs for RAF updates (no React re-renders)
  const phaseNameRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const presenceCountRef = useRef<HTMLSpanElement>(null);

  // Responsive viewport detection
  const { deviceType, isMobile, isTablet } = useViewport();

  // Responsive spacing values
  const edgePadding = getResponsiveSpacing(deviceType, 16, 24, 32); // Mobile: 16px, Tablet: 24px, Desktop: 32px
  const modalPadding = getResponsiveSpacing(deviceType, 24, 32, 40); // Mobile: 24px, Tablet: 32px, Desktop: 40px
  const controlsPanelWidth = isMobile ? '100%' : '260px'; // Full width on mobile
  const controlsPanelPosition = isMobile ? 'bottom' : 'bottomRight'; // Bottom center on mobile

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Welcome message: Auto-dismiss after 8 seconds (but user can click Begin earlier)
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Show keyboard hint after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isControlsOpen) setShowKeyHint(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isControlsOpen]);

  // Animate settings modal when it appears
  useEffect(() => {
    if (showSettings) {
      const timer = setTimeout(() => setSettingsAnimated(true), 10);
      return () => clearTimeout(timer);
    }
    setSettingsAnimated(false);
  }, [showSettings]);

  // Animate mood select modal when it appears
  useEffect(() => {
    if (showMoodSelect) {
      const timer = setTimeout(() => setMoodSelectAnimated(true), 10);
      return () => clearTimeout(timer);
    }
    setMoodSelectAnimated(false);
  }, [showMoodSelect]);

  // Phase indicator RAF loop (60fps updates without React state)
  useEffect(() => {
    let animationId: number;
    let prevPhase = -1;

    const updatePhase = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
        calculatePhaseInfo(cycleTime);
      const phaseTime = phaseProgress * phaseDuration;

      // Update phase name on transition
      if (phaseIndex !== prevPhase) {
        prevPhase = phaseIndex;
        if (phaseNameRef.current) {
          phaseNameRef.current.textContent = PHASE_NAMES[phaseIndex] ?? 'Breathe';
        }
      }

      // Update timer (countdown)
      if (timerRef.current) {
        const remaining = Math.ceil((1 - phaseProgress) * phaseDuration);
        timerRef.current.textContent = `${remaining}`;
      }

      // Update progress bar
      if (progressRef.current) {
        const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;
        progressRef.current.style.width = `${cycleProgress * 100}%`;
      }

      // Simulate presence count with subtle variation
      if (presenceCountRef.current && Math.random() < 0.01) {
        const baseCount = 75;
        const variation = Math.floor(Math.random() * 10) - 5;
        presenceCountRef.current.textContent = `${baseCount + variation}`;
      }

      animationId = requestAnimationFrame(updatePhase);
    };

    updatePhase();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Keyboard shortcut: Press 'T' to toggle tuning controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        setIsControlsOpen((prev) => !prev);
        setShowKeyHint(false); // Dismiss hint once user discovers it
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus Mode: Fade out UI after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetInactivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      // Only fade out if controls are closed
      if (!isControlsOpen) {
        timeout = setTimeout(() => setIsVisible(false), 10000); // 10s for first-timers
      }
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    window.addEventListener('keydown', resetInactivity);

    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      clearTimeout(timeout);
    };
  }, [isControlsOpen]);

  // Design Tokens - refined warm palette
  const colors = {
    text: '#7a6b5e',
    textDim: '#a89888',
    textGlow: '#c4a882',
    border: 'rgba(160, 140, 120, 0.12)',
    glass: 'rgba(252, 250, 246, 0.72)',
    accent: '#c9a06c',
    accentGlow: 'rgba(201, 160, 108, 0.4)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: colors.text,
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    accentColor: colors.accent,
    cursor: 'pointer',
    height: '4px',
    borderRadius: '2px',
    appearance: 'none',
    background: colors.border,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.border}`,
  };

  // Stop pointer/touch events from propagating to PresentationControls
  const stopPropagation = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  // Mood categories for simplified selection
  const moodCategories = [
    {
      name: 'Joy',
      color: MONUMENT_VALLEY_PALETTE.joy,
      moods: [
        { id: 'grateful' as MoodId, label: 'Grateful' },
        { id: 'celebrating' as MoodId, label: 'Celebrating' },
      ],
      description: 'Energetic & celebratory',
    },
    {
      name: 'Peace',
      color: MONUMENT_VALLEY_PALETTE.peace,
      moods: [
        { id: 'moment' as MoodId, label: 'Taking a moment' },
        { id: 'here' as MoodId, label: 'Just here' },
      ],
      description: 'Present & grounded',
    },
    {
      name: 'Solitude',
      color: MONUMENT_VALLEY_PALETTE.solitude,
      moods: [
        { id: 'anxious' as MoodId, label: 'Releasing tension' },
        { id: 'processing' as MoodId, label: 'Processing feelings' },
      ],
      description: 'Introspective & reflective',
    },
    {
      name: 'Love',
      color: MONUMENT_VALLEY_PALETTE.love,
      moods: [{ id: 'preparing' as MoodId, label: 'Preparing' }],
      description: 'Connecting & readying',
    },
  ];

  const handleMoodSelect = (mood: MoodId) => {
    setSelectedMood(mood);
    setShowMoodSelect(false);
  };

  const handleBeginClick = () => {
    setShowWelcome(false);
    // Show mood selection after welcome dismisses if no mood selected yet
    if (!selectedMood) {
      setTimeout(() => setShowMoodSelect(true), 400);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        color: colors.text,
        fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
        zIndex: 100,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Inspirational Text - Above & Beyond style messages */}
      <InspirationalText />

      {/* Top-Left: App Branding + Settings */}
      <div
        style={{
          position: 'absolute',
          top: `${edgePadding}px`,
          left: `${edgePadding}px`,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '16px',
          pointerEvents: 'auto',
          opacity: hasEntered ? 0.85 : 0,
          transform: `translateY(${hasEntered ? 0 : -8}px)`,
          transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* App Name */}
        <div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '1.1rem' : isTablet ? '1.25rem' : '1.4rem',
              fontWeight: 300,
              margin: 0,
              letterSpacing: isMobile ? '0.1em' : '0.15em',
              textTransform: 'uppercase',
              color: colors.text,
            }}
          >
            Breathe Together
          </h1>
        </div>

        {/* Settings Icon */}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          onPointerDown={stopPropagation}
          aria-label="Open settings"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: colors.textDim,
            opacity: 0.6,
            transition: 'opacity 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-labelledby="settings-icon-title"
          >
            <title id="settings-icon-title">Settings icon</title>
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
            <path d="M12 1v6m0 6v6M1 12h6m6 0h6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop overlay requires onClick for dismissal; role="presentation" indicates non-interactive semantics
        <div
          role="presentation"
          style={{
            position: 'absolute',
            inset: 0,
            background: settingsAnimated ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            pointerEvents: 'auto',
            transition: 'background 0.4s ease-out',
          }}
          onClick={() => setShowSettings(false)}
          onPointerDown={stopPropagation}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Content container stops event propagation to prevent backdrop dismissal; role="presentation" indicates non-interactive semantics */}
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={stopPropagation}
            style={{
              background: colors.glass,
              backdropFilter: 'blur(40px)',
              borderRadius: isMobile ? '20px' : '32px',
              border: `1px solid ${colors.border}`,
              padding: `${modalPadding}px`,
              maxWidth: isMobile ? '90%' : '420px',
              width: isMobile ? '90%' : '420px',
              opacity: settingsAnimated ? 1 : 0,
              transform: `scale(${settingsAnimated ? 1 : 0.95})`,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: isMobile ? '1.4rem' : '1.8rem',
                fontWeight: 300,
                margin: '0 0 24px 0',
                letterSpacing: isMobile ? '0.1em' : '0.15em',
                textTransform: 'uppercase',
                color: colors.text,
              }}
            >
              Settings
            </h2>

            {/* Current Mood */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: colors.textDim,
                  marginBottom: '12px',
                }}
              >
                Your Current Mood
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setShowMoodSelect(true);
                }}
                onPointerDown={stopPropagation}
                style={{
                  background: colors.glass,
                  border: `1px solid ${colors.border}`,
                  padding: '12px 20px',
                  borderRadius: '24px',
                  fontSize: '0.85rem',
                  color: colors.text,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{selectedMood ? selectedMood : 'Select a mood'}</span>
                <span style={{ opacity: 0.5 }}>→</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              onPointerDown={stopPropagation}
              style={{
                background: colors.accent,
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '24px',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Mood Selection Modal */}
      {showMoodSelect && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop overlay requires onClick for dismissal; role="presentation" indicates non-interactive semantics
        <div
          role="presentation"
          style={{
            position: 'absolute',
            inset: 0,
            background: moodSelectAnimated ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            pointerEvents: 'auto',
            transition: 'background 0.4s ease-out',
          }}
          onClick={() => setShowMoodSelect(false)}
          onPointerDown={stopPropagation}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Content container stops event propagation to prevent backdrop dismissal; role="presentation" indicates non-interactive semantics */}
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={stopPropagation}
            style={{
              background: colors.glass,
              backdropFilter: 'blur(40px)',
              borderRadius: isMobile ? '20px' : '32px',
              border: `1px solid ${colors.border}`,
              padding: `${modalPadding}px`,
              maxWidth: isMobile ? '90%' : '520px',
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto',
              opacity: moodSelectAnimated ? 1 : 0,
              transform: `scale(${moodSelectAnimated ? 1 : 0.95})`,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: isMobile ? '1.4rem' : '1.8rem',
                fontWeight: 300,
                margin: '0 0 12px 0',
                letterSpacing: isMobile ? '0.1em' : '0.15em',
                textTransform: 'uppercase',
                color: colors.text,
                textAlign: 'center',
              }}
            >
              How are you feeling?
            </h2>
            <p
              style={{
                fontSize: '0.85rem',
                color: colors.textDim,
                textAlign: 'center',
                marginBottom: '32px',
                lineHeight: 1.6,
              }}
            >
              Choose a mood to add your presence to the shared breathing space
            </p>

            {/* Mood Categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {moodCategories.map((category) => (
                <div
                  key={category.name}
                  style={{
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '20px',
                    border: `2px solid ${category.color}20`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: category.color,
                        boxShadow: `0 0 12px ${category.color}60`,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 500,
                          color: colors.text,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {category.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: colors.textDim,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {category.description}
                      </div>
                    </div>
                  </div>

                  {/* Mood Options */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {category.moods.map((mood) => (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() => handleMoodSelect(mood.id)}
                        onPointerDown={stopPropagation}
                        style={{
                          background:
                            selectedMood === mood.id ? category.color : 'rgba(255, 255, 255, 0.5)',
                          color: selectedMood === mood.id ? '#fff' : colors.text,
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontWeight: selectedMood === mood.id ? 600 : 400,
                        }}
                      >
                        {mood.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Skip Button */}
            <button
              type="button"
              onClick={() => setShowMoodSelect(false)}
              onPointerDown={stopPropagation}
              style={{
                background: 'transparent',
                color: colors.textDim,
                border: 'none',
                padding: '16px',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                width: '100%',
                marginTop: '16px',
                opacity: 0.7,
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Welcome Message - First-time user guidance */}
      {showWelcome && (
        // biome-ignore lint/a11y/useSemanticElements: Modal overlay container with clickable area; button element would break layout styling
        <div
          role="button"
          tabIndex={0}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: isMobile ? '24px 32px' : '32px 48px',
            background: colors.glass,
            backdropFilter: 'blur(40px)',
            borderRadius: isMobile ? '20px' : '32px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
            maxWidth: isMobile ? '90%' : '440px',
            width: isMobile ? '90%' : 'auto',
            pointerEvents: 'auto',
            opacity: hasEntered ? 0.95 : 0,
            transition: 'opacity 1s ease-out',
            zIndex: 200,
            cursor: 'pointer',
          }}
          onClick={() => setShowWelcome(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setShowWelcome(false);
            }
          }}
          onPointerDown={stopPropagation}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '1.4rem' : '1.8rem',
              fontWeight: 300,
              margin: '0 0 16px 0',
              letterSpacing: isMobile ? '0.1em' : '0.15em',
              textTransform: 'uppercase',
              color: colors.text,
            }}
          >
            Welcome
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.8,
              margin: '0 0 20px 0',
              color: colors.textDim,
              letterSpacing: '0.02em',
            }}
          >
            Breathe with the Earth. Follow the rhythm:
            <br />
            <strong>Inhale → Hold → Exhale → Hold</strong>
          </p>
          <button
            type="button"
            onClick={handleBeginClick}
            onPointerDown={stopPropagation}
            style={{
              background: colors.accent,
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            Begin
          </button>
        </div>
      )}

      {/* Keyboard Hint - Appears after 30s */}
      {showKeyHint && !isControlsOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? '80px' : '100px',
            right: isMobile ? '50%' : `${edgePadding}px`,
            transform: isMobile ? 'translateX(50%)' : 'none',
            padding: '12px 20px',
            background: colors.glass,
            backdropFilter: 'blur(24px)',
            borderRadius: '20px',
            border: `1px solid ${colors.border}`,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: colors.textDim,
            opacity: 0.8,
            pointerEvents: 'none',
            animation: 'fadeInOut 4s ease-in-out forwards',
          }}
        >
          Press <strong style={{ color: colors.accent }}>T</strong> to tune
        </div>
      )}

      {/* Bottom-Right (Desktop) / Bottom-Center (Mobile): Collapsible Advanced Controls */}
      {isControlsOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: `${edgePadding}px`,
            right: isMobile ? '50%' : `${edgePadding}px`,
            left: isMobile ? '50%' : 'auto',
            transform: isMobile ? 'translateX(-50%)' : 'none',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'center' : 'flex-end',
            gap: '12px',
            opacity: hasEntered ? 1 : 0,
            transition: 'opacity 0.6s ease',
            width: isMobile ? '90%' : 'auto',
            maxWidth: isMobile ? '400px' : 'none',
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsControlsOpen(false)}
            onPointerDown={stopPropagation}
            style={{
              background: colors.glass,
              border: `1px solid ${colors.border}`,
              padding: '9px 18px',
              borderRadius: '24px',
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 500,
              color: colors.text,
              cursor: 'pointer',
              backdropFilter: 'blur(24px)',
              transition: 'all 0.4s ease',
            }}
          >
            Close
          </button>

          {/* Advanced Controls Panel */}
          <div
            onPointerDown={stopPropagation}
            onPointerMove={stopPropagation}
            onPointerUp={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchMove={stopPropagation}
            onTouchEnd={stopPropagation}
            style={{
              background: colors.glass,
              backdropFilter: 'blur(40px)',
              padding: isMobile ? '20px' : '24px',
              borderRadius: isMobile ? '20px' : '24px',
              border: `1px solid ${colors.border}`,
              width: controlsPanelWidth,
              maxHeight: isMobile ? '70vh' : '600px',
              overflow: 'auto',
              boxShadow: '0 20px 50px rgba(138, 131, 124, 0.08)',
            }}
          >
            {/* PARTICLES SECTION */}
            <div style={sectionStyle}>
              <div
                style={{
                  fontSize: '0.55rem',
                  color: colors.textDim,
                  marginBottom: '12px',
                  letterSpacing: '0.2em',
                }}
              >
                PARTICLES
              </div>

              <label style={{ marginBottom: '14px', display: 'block' }}>
                <div style={labelStyle}>
                  <span>Harmony</span>
                  <span style={{ fontWeight: 400 }}>{harmony}</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="200"
                  step="1"
                  value={harmony}
                  onChange={(e) => setHarmony(parseInt(e.target.value, 10))}
                  style={inputStyle}
                />
              </label>

              <label style={{ marginBottom: '14px', display: 'block' }}>
                <div style={labelStyle}>
                  <span>Shard Size</span>
                  <span style={{ fontWeight: 400 }}>{shardSize.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.02"
                  value={shardSize}
                  onChange={(e) => setShardSize(parseFloat(e.target.value))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'block' }}>
                <div style={labelStyle}>
                  <span>Orbit</span>
                  <span style={{ fontWeight: 400 }}>{orbitRadius.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="8.0"
                  step="0.1"
                  value={orbitRadius}
                  onChange={(e) => setOrbitRadius(parseFloat(e.target.value))}
                  style={inputStyle}
                />
              </label>
            </div>

            {/* GLASS SECTION */}
            <div style={sectionStyle}>
              <div
                style={{
                  fontSize: '0.55rem',
                  color: colors.textDim,
                  marginBottom: '12px',
                  letterSpacing: '0.2em',
                }}
              >
                GLASS
              </div>

              <label style={{ marginBottom: '14px', display: 'block' }}>
                <div style={labelStyle}>
                  <span>Refraction</span>
                  <span style={{ fontWeight: 400 }}>{ior.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.01"
                  value={ior}
                  onChange={(e) => setIor(parseFloat(e.target.value))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'block' }}>
                <div style={labelStyle}>
                  <span>Depth</span>
                  <span style={{ fontWeight: 400 }}>{glassDepth.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={glassDepth}
                  onChange={(e) => setGlassDepth(parseFloat(e.target.value))}
                  style={inputStyle}
                />
              </label>
            </div>

            {/* ATMOSPHERE SECTION */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.55rem',
                  color: colors.textDim,
                  marginBottom: '12px',
                  letterSpacing: '0.2em',
                }}
              >
                ATMOSPHERE
              </div>

              <label style={{ display: 'block' }}>
                <div style={labelStyle}>
                  <span>Density</span>
                  <span style={{ fontWeight: 400 }}>{atmosphereDensity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="10"
                  value={atmosphereDensity}
                  onChange={(e) => setAtmosphereDensity(parseInt(e.target.value, 10))}
                  style={inputStyle}
                />
              </label>
            </div>

            {/* Mood Legend */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: `1px solid ${colors.border}`,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              {Object.entries(MONUMENT_VALLEY_PALETTE).map(([name, color]) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.55rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Centered Phase Indicator - ALWAYS VISIBLE */}
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? `${edgePadding + 8}px` : '44px',
          left: '50%',
          transform: `translateX(-50%) translateY(${hasEntered ? 0 : 16}px)`,
          opacity: hasEntered ? 0.9 : 0,
          transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '10px' : '14px',
        }}
      >
        {/* Phase Name + Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: isMobile ? '8px' : '10px',
          }}
        >
          <span
            ref={phaseNameRef}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '1.2rem' : isTablet ? '1.35rem' : '1.5rem',
              fontWeight: 300,
              letterSpacing: isMobile ? '0.12em' : '0.18em',
              textTransform: 'uppercase',
              color: colors.text,
              textShadow: `0 1px 12px ${colors.accentGlow}`,
            }}
          >
            Inhale
          </span>
          <span
            ref={timerRef}
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 300,
              color: colors.textDim,
              minWidth: '1em',
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            4
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: isMobile ? '80px' : '100px',
            height: '1.5px',
            background: colors.border,
            borderRadius: '1px',
            overflow: 'hidden',
            boxShadow: `0 0 8px ${colors.accentGlow}`,
          }}
        >
          <div
            ref={progressRef}
            style={{
              height: '100%',
              width: '0%',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.textGlow})`,
              borderRadius: '1px',
              transition: 'width 0.08s linear',
            }}
          />
        </div>

        {/* Presence Count - Subtle */}
        <div
          style={{
            fontSize: isMobile ? '0.6rem' : '0.65rem',
            color: colors.textDim,
            opacity: 0.6,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: isMobile ? '2px' : '4px',
          }}
        >
          <span ref={presenceCountRef}>75</span> breathing together
        </div>
      </div>

      {/* CSS Animation for fade in/out */}
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}
