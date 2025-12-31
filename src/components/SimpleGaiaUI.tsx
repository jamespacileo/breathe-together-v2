import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { BREATH_TOTAL_CYCLE, MOOD_IDS, MOOD_METADATA, type MoodId } from '../constants';
import { getResponsiveSpacing, useViewport } from '../hooks/useViewport';
import { calculatePhaseInfo } from '../lib/breathPhase';
import {
  ANIMATION,
  BLUR,
  BORDER_RADIUS,
  MOOD_COLORS,
  PHASE_NAMES,
  SPACING,
  TYPOGRAPHY,
  UI_COLORS,
  Z_INDEX,
} from '../styles/designTokens';
import { CSSIcosahedron, MiniIcosahedronPreview } from './CSSIcosahedron';
import { InspirationalText } from './InspirationalText';

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
  /** Optional external control for tune controls visibility */
  showTuneControls?: boolean;
  /** Optional callback when tune controls visibility changes */
  onShowTuneControlsChange?: (show: boolean) => void;
  /** Optional external control for settings modal visibility */
  showSettings?: boolean;
  /** Optional callback when settings modal visibility changes */
  onShowSettingsChange?: (show: boolean) => void;
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
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI component manages multiple modal states (tune controls, settings, mood selection, welcome, hints) and phase animation loops - refactoring would reduce readability by splitting cohesive UI state management
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
  showTuneControls: externalShowTuneControls,
  onShowTuneControlsChange,
  showSettings: externalShowSettings,
  onShowSettingsChange,
}: SimpleGaiaUIProps) {
  const [internalIsControlsOpen, setInternalIsControlsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [showMoodSelect, setShowMoodSelect] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

  // Use external control for tune controls if provided, otherwise use internal state
  const isControlsOpen = externalShowTuneControls ?? internalIsControlsOpen;
  const setIsControlsOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      const newValue = typeof value === 'function' ? value(isControlsOpen) : value;
      if (onShowTuneControlsChange) {
        onShowTuneControlsChange(newValue);
      } else {
        setInternalIsControlsOpen(newValue);
      }
    },
    [onShowTuneControlsChange, isControlsOpen],
  );

  // Use external control for settings if provided, otherwise use internal state
  const showSettings = externalShowSettings ?? internalShowSettings;
  const setShowSettings = (value: boolean) => {
    if (onShowSettingsChange) {
      onShowSettingsChange(value);
    } else {
      setInternalShowSettings(value);
    }
  };

  // Animation states for modals
  const [settingsAnimated, setSettingsAnimated] = useState(false);
  const [moodSelectAnimated, setMoodSelectAnimated] = useState(false);

  // Phase indicator refs for RAF updates (no React re-renders)
  const phaseNameRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const presenceCountRef = useRef<HTMLSpanElement>(null);

  // Responsive viewport detection
  const { deviceType, isMobile, isTablet } = useViewport();

  // Responsive spacing values
  const edgePadding = getResponsiveSpacing(deviceType, 16, 24, 32); // Mobile: 16px, Tablet: 24px, Desktop: 32px
  const modalPadding = getResponsiveSpacing(deviceType, 24, 32, 40); // Mobile: 24px, Tablet: 32px, Desktop: 40px
  const controlsPanelWidth = isMobile ? '100%' : '260px'; // Full width on mobile

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

      // Update progress bar with breathing-synchronized glow
      if (progressRef.current) {
        const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;
        progressRef.current.style.width = `${cycleProgress * 100}%`;
      }

      // Breathing-synchronized glow on progress container
      if (progressContainerRef.current) {
        // Intensity peaks during inhale (phase 0) and hold-in (phase 1)
        const glowIntensity =
          phaseIndex === 0 || phaseIndex === 1 ? 0.4 + phaseProgress * 0.3 : 0.2;
        progressContainerRef.current.style.boxShadow = `0 0 ${8 + glowIntensity * 12}px rgba(201, 160, 108, ${glowIntensity})`;
      }

      animationId = requestAnimationFrame(updatePhase);
    };

    updatePhase();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Presence count simulation - updates every 2 seconds with subtle variation
  // Moved out of RAF loop to avoid 60 random number generations per second
  useEffect(() => {
    const updatePresenceCount = () => {
      if (presenceCountRef.current) {
        const baseCount = 75;
        const variation = Math.floor(Math.random() * 10) - 5;
        presenceCountRef.current.textContent = `${baseCount + variation}`;
      }
    };

    const intervalId = setInterval(updatePresenceCount, 2000);
    return () => clearInterval(intervalId);
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
  }, [setIsControlsOpen]);

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

  // Design Tokens - using centralized values from designTokens.ts
  const colors = {
    text: UI_COLORS.text.secondary,
    textDim: UI_COLORS.text.muted,
    textGlow: UI_COLORS.accent.textGlow,
    border: UI_COLORS.border.default,
    glass: UI_COLORS.surface.glass,
    accent: UI_COLORS.accent.gold,
    accentGlow: UI_COLORS.accent.goldGlow,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 500,
    fontVariant: 'small-caps',
    letterSpacing: '0.08em',
    color: colors.text,
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    cursor: 'pointer',
    height: '6px',
    borderRadius: '3px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: `linear-gradient(to right, ${colors.accent}40, ${colors.border})`,
    outline: 'none',
    transition: 'background 0.2s ease',
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

  // Get mood color helper
  const getMoodColor = (moodId: MoodId): string => {
    return MOOD_COLORS[moodId] ?? MOOD_COLORS.presence;
  };

  const handleMoodSelect = (mood: MoodId) => {
    setSelectedMood(mood);
    // Small delay before closing to show selection feedback
    setTimeout(() => setShowMoodSelect(false), 200);
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
              fontSize: isMobile ? '1.2rem' : isTablet ? '1.25rem' : '1.4rem',
              fontWeight: isMobile ? 400 : 300,
              margin: 0,
              letterSpacing: isMobile ? '0.08em' : '0.15em',
              textTransform: 'uppercase',
              color: colors.text,
              textShadow: isMobile ? '0 1px 8px rgba(255, 252, 245, 0.8)' : 'none',
            }}
          >
            Breathe Together
          </h1>
        </div>
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
              transform: settingsAnimated
                ? 'scale(1) translateY(0)'
                : 'scale(0.97) translateY(12px)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
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

      {/* Mood Selection Modal - Simplified single-level selection */}
      {showMoodSelect && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop overlay requires onClick for dismissal; role="presentation" indicates non-interactive semantics
        <div
          role="presentation"
          style={{
            position: 'absolute',
            inset: 0,
            background: moodSelectAnimated ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: 'blur(12px)',
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
              background: 'rgba(253, 251, 247, 0.85)',
              backdropFilter: 'blur(40px)',
              borderRadius: isMobile ? '24px' : '32px',
              border: '1px solid rgba(160, 140, 120, 0.15)',
              padding: isMobile ? '28px 24px' : '40px 36px',
              maxWidth: isMobile ? '92%' : '420px',
              width: isMobile ? '92%' : '420px',
              opacity: moodSelectAnimated ? 1 : 0,
              transform: moodSelectAnimated
                ? 'scale(1) translateY(0)'
                : 'scale(0.97) translateY(16px)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '32px' }}>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: isMobile ? '1.5rem' : '1.75rem',
                  fontWeight: 400,
                  margin: '0 0 8px 0',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#4a3f35',
                }}
              >
                How are you?
              </h2>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#8b7a6a',
                  margin: 0,
                  lineHeight: 1.5,
                  letterSpacing: '0.02em',
                }}
              >
                Your presence joins others in the breathing space
              </p>
            </div>

            {/* Mood Options - Single level, clean cards */}
            <div
              className="modal-stagger"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '10px' : '12px',
              }}
            >
              {MOOD_IDS.map((moodId) => {
                const metadata = MOOD_METADATA[moodId];
                const color = getMoodColor(moodId);
                const isSelected = selectedMood === moodId;

                return (
                  <button
                    key={moodId}
                    type="button"
                    onClick={() => handleMoodSelect(moodId)}
                    onPointerDown={stopPropagation}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '14px' : '16px',
                      padding: isMobile ? '16px 18px' : '18px 22px',
                      background: isSelected
                        ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
                        : 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '18px',
                      border: isSelected
                        ? `2px solid ${color}50`
                        : '2px solid rgba(255, 255, 255, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      textAlign: 'left',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected
                        ? `0 4px 20px ${color}25, 0 0 0 1px ${color}15`
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {/* CSS Icosahedron instead of circle */}
                    <CSSIcosahedron
                      color={color}
                      size={isMobile ? 28 : 32}
                      isActive={isSelected}
                      animated={isSelected}
                      glowIntensity={isSelected ? 0.7 : 0.3}
                    />

                    {/* Text content */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#3d3229' : '#5a4d42',
                          letterSpacing: '0.03em',
                          marginBottom: '2px',
                        }}
                      >
                        {metadata.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: isSelected ? '#6a5d52' : '#9a8a7a',
                          letterSpacing: '0.02em',
                          fontStyle: 'italic',
                        }}
                      >
                        {metadata.description}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 8px ${color}80`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview - shows what you'll become */}
            {selectedMood && (
              <div
                style={{
                  marginTop: '24px',
                  opacity: moodSelectAnimated ? 1 : 0,
                  transform: moodSelectAnimated ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'all 0.4s ease 0.2s',
                }}
              >
                <MiniIcosahedronPreview color={getMoodColor(selectedMood)} label="Your presence" />
              </div>
            )}

            {/* Skip Button */}
            <button
              type="button"
              onClick={() => setShowMoodSelect(false)}
              onPointerDown={stopPropagation}
              style={{
                background: 'transparent',
                color: '#9a8a7a',
                border: 'none',
                padding: '14px',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                width: '100%',
                marginTop: '16px',
                opacity: 0.8,
                transition: 'opacity 0.2s ease',
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
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: colors.textDim,
                  marginBottom: '12px',
                  letterSpacing: '0.12em',
                  fontVariant: 'small-caps',
                  borderBottom: `1px solid ${colors.border}`,
                  paddingBottom: '6px',
                }}
              >
                Particles
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
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: colors.textDim,
                  marginBottom: '12px',
                  letterSpacing: '0.12em',
                  fontVariant: 'small-caps',
                  borderBottom: `1px solid ${colors.border}`,
                  paddingBottom: '6px',
                }}
              >
                Glass
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
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: colors.textDim,
                  marginBottom: '12px',
                  letterSpacing: '0.12em',
                  fontVariant: 'small-caps',
                  borderBottom: `1px solid ${colors.border}`,
                  paddingBottom: '6px',
                }}
              >
                Atmosphere
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
              {Object.entries(MOOD_COLORS).map(([name, color]) => (
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
          bottom: isMobile
            ? `max(${edgePadding + 16}px, env(safe-area-inset-bottom, 24px))`
            : '44px',
          left: '50%',
          transform: `translateX(-50%) translateY(${hasEntered ? 0 : 16}px)`,
          opacity: hasEntered ? 0.95 : 0,
          transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '12px' : '14px',
        }}
      >
        {/* Phase Name + Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: isMobile ? '10px' : '10px',
          }}
        >
          <span
            ref={phaseNameRef}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '1.75rem' : isTablet ? '1.5rem' : '1.5rem',
              fontWeight: 300,
              letterSpacing: isMobile ? '0.12em' : '0.18em',
              textTransform: 'uppercase',
              color: colors.text,
              textShadow: `0 2px 20px ${colors.accentGlow}, 0 1px 6px rgba(0, 0, 0, 0.15)`,
            }}
          >
            Inhale
          </span>
          <span
            ref={timerRef}
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: isMobile ? '1.1rem' : '0.95rem',
              fontWeight: 400,
              color: colors.textDim,
              minWidth: '1.2em',
              textAlign: 'center',
            }}
          >
            4
          </span>
        </div>

        {/* Progress Bar */}
        <div
          ref={progressContainerRef}
          style={{
            width: isMobile ? '100px' : '100px',
            height: isMobile ? '3px' : '2px',
            background: colors.border,
            borderRadius: '2px',
            overflow: 'hidden',
            boxShadow: `0 0 8px ${colors.accentGlow}`,
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <div
            ref={progressRef}
            style={{
              height: '100%',
              width: '0%',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.textGlow})`,
              borderRadius: '2px',
              transition: 'width 0.08s linear',
            }}
          />
        </div>

        {/* Presence Count */}
        <div
          style={{
            fontSize: isMobile ? '0.75rem' : '0.65rem',
            fontWeight: isMobile ? 500 : 400,
            color: colors.text,
            opacity: isMobile ? 0.7 : 0.6,
            letterSpacing: isMobile ? '0.08em' : '0.1em',
            textTransform: 'uppercase',
            marginTop: isMobile ? '4px' : '4px',
          }}
        >
          <span ref={presenceCountRef}>75</span> breathing together
        </div>
      </div>

      {/* Styles moved to src/styles/ui.css - imported globally in index.tsx
          Includes: fadeInOut, slideUp animations, slider thumb styling,
          button focus states, modal-stagger, mood-button hover effects */}
    </div>
  );
}
