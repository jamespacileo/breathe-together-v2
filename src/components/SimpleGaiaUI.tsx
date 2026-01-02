import { Check, X } from 'lucide-react';
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { BREATH_TOTAL_CYCLE, MOOD_IDS, MOOD_METADATA, type MoodId } from '../constants';
import { getResponsiveSpacing, useViewport } from '../hooks/useViewport';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { MOOD_COLORS, PHASE_NAMES } from '../styles/designTokens';
import { BreathCycleIndicator } from './BreathCycleIndicator';
import { CSSIcosahedron, MiniIcosahedronPreview } from './CSSIcosahedron';
import { InspirationalText } from './InspirationalText';
import { Slider } from './ui/Slider';

interface SimpleGaiaUIProps {
  /** Particle count (harmony) */
  harmony: number;
  setHarmony: (v: number) => void;
  /** Orbit radius - how far particles orbit from center */
  orbitRadius: number;
  setOrbitRadius: (v: number) => void;
  /** Shard size - maximum size of glass shards */
  shardSize: number;
  setShardSize: (v: number) => void;
  /** Atmosphere density - number of ambient floating particles */
  atmosphereDensity: number;
  setAtmosphereDensity: (v: number) => void;
  /** Apply preset values with smooth animation */
  onApplyPreset: (preset: 'calm' | 'centered' | 'immersive') => void;
  /** Optional external control for tune controls visibility */
  showTuneControls?: boolean;
  /** Optional callback when tune controls visibility changes */
  onShowTuneControlsChange?: (show: boolean) => void;
  /** Optional external control for settings modal visibility */
  showSettings?: boolean;
  /** Optional callback when settings modal visibility changes */
  onShowSettingsChange?: (show: boolean) => void;
  /** Number of users currently breathing together (from backend) */
  presenceCount?: number;
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
 *
 * Uses:
 * - Tailwind CSS for styling
 * - lucide-react for iconography
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI component manages multiple modal states (tune controls, settings, mood selection, welcome, hints) and phase animation loops - refactoring would reduce readability by splitting cohesive UI state management
export function SimpleGaiaUI({
  harmony,
  setHarmony,
  orbitRadius,
  setOrbitRadius,
  shardSize,
  setShardSize,
  atmosphereDensity,
  setAtmosphereDensity,
  onApplyPreset,
  showTuneControls: externalShowTuneControls,
  onShowTuneControlsChange,
  showSettings: externalShowSettings,
  onShowSettingsChange,
  presenceCount = 0,
}: SimpleGaiaUIProps) {
  const [internalIsControlsOpen, setInternalIsControlsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [showMoodSelect, setShowMoodSelect] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

  // React 19 useTransition for non-urgent updates (modals, animations)
  // Keeps UI responsive during modal opens/closes and mood selections
  const [, startTransition] = useTransition();

  // Use external control for tune controls if provided, otherwise use internal state
  const isControlsOpen = externalShowTuneControls ?? internalIsControlsOpen;
  // Store current value in ref to avoid stale closure in callback
  const isControlsOpenRef = useRef(isControlsOpen);
  isControlsOpenRef.current = isControlsOpen;

  const setIsControlsOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      const newValue = typeof value === 'function' ? value(isControlsOpenRef.current) : value;
      if (onShowTuneControlsChange) {
        onShowTuneControlsChange(newValue);
      } else {
        setInternalIsControlsOpen(newValue);
      }
    },
    [onShowTuneControlsChange],
  );

  // Use external control for settings if provided, otherwise use internal state
  const showSettings = externalShowSettings ?? internalShowSettings;
  const setShowSettings = useCallback(
    (value: boolean) => {
      // Use transition for non-urgent modal updates
      startTransition(() => {
        if (onShowSettingsChange) {
          onShowSettingsChange(value);
        } else {
          setInternalShowSettings(value);
        }
      });
    },
    [onShowSettingsChange],
  );

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
  const edgePadding = getResponsiveSpacing(deviceType, 16, 24, 32);
  const modalPadding = getResponsiveSpacing(deviceType, 24, 32, 40);

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

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAF animation loop updates multiple DOM refs in single tick - splitting would harm performance
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

  // Update presence count from backend when it changes
  useEffect(() => {
    if (presenceCountRef.current) {
      presenceCountRef.current.textContent = `${presenceCount}`;
    }
  }, [presenceCount]);

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

  // Stop pointer/touch events from propagating to PresentationControls
  // Memoized to maintain stable reference
  const stopPropagation = useCallback(
    (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
    },
    [],
  );

  // Get mood color helper - memoized
  const getMoodColor = useCallback((moodId: MoodId): string => {
    return MOOD_COLORS[moodId] ?? MOOD_COLORS.presence;
  }, []);

  const handleMoodSelect = useCallback((mood: MoodId) => {
    // Use transition for non-urgent mood selection
    startTransition(() => {
      setSelectedMood(mood);
    });
    // Small delay before closing to show selection feedback
    setTimeout(() => {
      startTransition(() => {
        setShowMoodSelect(false);
      });
    }, 200);
  }, []);

  const handleBeginClick = useCallback(() => {
    startTransition(() => {
      setShowWelcome(false);
    });
    // Show mood selection after welcome dismisses if no mood selected yet
    if (!selectedMood) {
      setTimeout(() => {
        startTransition(() => {
          setShowMoodSelect(true);
        });
      }, 400);
    }
  }, [selectedMood]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none text-warm-gray font-sans z-100
        transition-opacity duration-1200 ease-smooth
        ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Inspirational Text - Above & Beyond style messages */}
      <InspirationalText />

      {/* Top-Left: App Branding + Settings */}
      <div
        className={`absolute flex items-center pointer-events-auto
          transition-all duration-800 ease-entrance
          ${hasEntered ? 'opacity-85 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        style={{
          top: `${edgePadding}px`,
          left: `${edgePadding}px`,
          gap: isMobile ? '8px' : '16px',
        }}
      >
        {/* App Name */}
        <div>
          <h1
            className={`font-serif m-0 uppercase text-warm-gray
              ${isMobile ? 'text-[1.2rem] font-normal tracking-[0.08em]' : isTablet ? 'text-[1.25rem] font-light tracking-[0.15em]' : 'text-[1.4rem] font-light tracking-[0.15em]'}
              ${isMobile ? 'drop-shadow-[0_1px_8px_rgba(255,252,245,0.8)]' : ''}`}
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
          className={`absolute inset-0 backdrop-blur-[8px] flex items-center justify-center z-300 pointer-events-auto
            transition-[background] duration-400 ease-out
            ${settingsAnimated ? 'bg-black/30' : 'bg-black/0'}`}
          onClick={() => setShowSettings(false)}
          onPointerDown={stopPropagation}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Content container stops event propagation to prevent backdrop dismissal; role="presentation" indicates non-interactive semantics */}
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={stopPropagation}
            className={`bg-glass backdrop-blur-[40px] border border-border
              transition-all duration-400 ease-bounce
              ${isMobile ? 'rounded-[20px] w-[90%] max-w-[90%]' : 'rounded-[32px] w-[420px] max-w-[420px]'}
              ${settingsAnimated ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-3'}`}
            style={{ padding: `${modalPadding}px` }}
          >
            <h2
              className={`font-serif font-light m-0 mb-6 uppercase text-warm-gray
                ${isMobile ? 'text-[1.4rem] tracking-[0.1em]' : 'text-[1.8rem] tracking-[0.15em]'}`}
            >
              Settings
            </h2>

            {/* Current Mood - with icosahedron preview */}
            <div className="mb-6">
              <div className="text-[0.7rem] uppercase tracking-[0.1em] text-warm-gray mb-3">
                Your Presence
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setTimeout(() => setShowMoodSelect(true), 150);
                }}
                onPointerDown={stopPropagation}
                className="w-full text-left flex items-center gap-3.5 p-[14px_18px] rounded-[20px]
                  cursor-pointer transition-all duration-250 ease-smooth
                  text-[0.85rem] text-warm-gray"
                style={{
                  background: selectedMood
                    ? `linear-gradient(135deg, ${getMoodColor(selectedMood)}12 0%, rgba(255,255,255,0.5) 100%)`
                    : 'var(--color-glass)',
                  border: selectedMood
                    ? `2px solid ${getMoodColor(selectedMood)}30`
                    : '1px solid var(--color-border)',
                }}
              >
                {/* Icosahedron indicator */}
                <CSSIcosahedron
                  color={selectedMood ? getMoodColor(selectedMood) : '#9a8a7a'}
                  size={28}
                  isActive={!!selectedMood}
                  animated={!!selectedMood}
                  glowIntensity={selectedMood ? 0.5 : 0.2}
                />

                {/* Mood info */}
                <div className="flex-1">
                  {selectedMood ? (
                    <>
                      <div className="text-[0.9rem] font-medium text-warm-brown mb-0.5">
                        {MOOD_METADATA[selectedMood].label}
                      </div>
                      <div className="text-[0.7rem] text-warm-gray italic">
                        {MOOD_METADATA[selectedMood].description}
                      </div>
                    </>
                  ) : (
                    <div className="text-[0.85rem] text-warm-gray">Tap to choose your mood</div>
                  )}
                </div>

                {/* Change indicator */}
                <div className="text-[0.65rem] uppercase tracking-[0.08em] text-warm-gray opacity-80">
                  Change
                </div>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              onPointerDown={stopPropagation}
              className="w-full bg-accent-gold text-white border-none p-[12px_28px] rounded-3xl
                text-[0.7rem] uppercase tracking-[0.12em] font-semibold cursor-pointer
                flex items-center justify-center gap-2
                hover:bg-accent-gold-light transition-colors duration-200"
            >
              <X size={14} strokeWidth={2} />
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
          className={`absolute inset-0 backdrop-blur-[12px] flex items-center justify-center z-300 pointer-events-auto
            transition-[background] duration-400 ease-out
            ${moodSelectAnimated ? 'bg-black/25' : 'bg-black/0'}`}
          onClick={() => setShowMoodSelect(false)}
          onPointerDown={stopPropagation}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Content container stops event propagation to prevent backdrop dismissal; role="presentation" indicates non-interactive semantics */}
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={stopPropagation}
            className={`bg-[rgba(253,251,247,0.85)] backdrop-blur-[40px] border border-[rgba(160,140,120,0.15)]
              shadow-modal transition-all duration-500 ease-bounce
              ${isMobile ? 'rounded-3xl w-[92%] max-w-[92%] p-[28px_24px]' : 'rounded-[32px] w-[420px] max-w-[420px] p-[40px_36px]'}
              ${moodSelectAnimated ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-4'}`}
          >
            {/* Header */}
            <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
              <h2
                className={`font-serif font-normal m-0 mb-2 uppercase text-warm-brown
                  ${isMobile ? 'text-[1.5rem] tracking-[0.12em]' : 'text-[1.75rem] tracking-[0.12em]'}`}
              >
                How are you?
              </h2>
              <p className="text-[0.8rem] text-warm-tan m-0 leading-relaxed tracking-[0.02em]">
                Your presence joins others in the breathing space
              </p>
            </div>

            {/* Mood Options - Single level, clean cards */}
            <div className={`modal-stagger flex flex-col ${isMobile ? 'gap-2.5' : 'gap-3'}`}>
              {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Mood button render with conditional styles for responsive design - complexity from inline style conditionals */}
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
                    className={`flex items-center text-left cursor-pointer rounded-[18px]
                      transition-all duration-250 ease-smooth
                      ${isMobile ? 'gap-3.5 p-[16px_18px]' : 'gap-4 p-[18px_22px]'}
                      ${isSelected ? 'scale-[1.02]' : 'scale-100'}`}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
                        : 'rgba(255, 255, 255, 0.5)',
                      border: isSelected
                        ? `2px solid ${color}50`
                        : '2px solid rgba(255, 255, 255, 0.4)',
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
                    <div className="flex-1">
                      <div
                        className={`tracking-[0.03em] mb-0.5
                          ${isMobile ? 'text-[0.95rem]' : 'text-base'}
                          ${isSelected ? 'font-semibold text-[#3d3229]' : 'font-medium text-warm-brown-light'}`}
                      >
                        {metadata.label}
                      </div>
                      <div
                        className={`text-[0.72rem] tracking-[0.02em] italic
                          ${isSelected ? 'text-[#6a5d52]' : 'text-warm-gray'}`}
                      >
                        {metadata.description}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: color,
                          boxShadow: `0 0 8px ${color}80`,
                        }}
                      >
                        <Check size={12} strokeWidth={3} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview - shows what you'll become */}
            {selectedMood && (
              <div
                className={`mt-6 transition-all duration-400 ease-smooth delay-200
                  ${moodSelectAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              >
                <MiniIcosahedronPreview color={getMoodColor(selectedMood)} label="Your presence" />
              </div>
            )}

            {/* Skip Button */}
            <button
              type="button"
              onClick={() => setShowMoodSelect(false)}
              onPointerDown={stopPropagation}
              className="w-full mt-4 bg-transparent text-warm-gray border-none p-3.5
                text-[0.68rem] uppercase tracking-[0.1em] cursor-pointer opacity-80
                hover:opacity-100 transition-opacity duration-200"
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
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            bg-glass backdrop-blur-[40px] border border-border text-center
            pointer-events-auto z-200 cursor-pointer
            transition-opacity duration-1000 ease-out
            ${isMobile ? 'p-[24px_32px] rounded-[20px] w-[90%] max-w-[90%]' : 'p-[32px_48px] rounded-[32px] w-auto max-w-[440px]'}
            ${hasEntered ? 'opacity-95' : 'opacity-0'}`}
          onClick={() => setShowWelcome(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setShowWelcome(false);
            }
          }}
          onPointerDown={stopPropagation}
        >
          <h2
            className={`font-serif font-light m-0 mb-4 uppercase text-warm-gray
              ${isMobile ? 'text-[1.4rem] tracking-[0.1em]' : 'text-[1.8rem] tracking-[0.15em]'}`}
          >
            Welcome
          </h2>
          <p className="text-[0.95rem] leading-[1.8] m-0 mb-5 text-warm-gray tracking-[0.02em]">
            Breathe with the Earth. Follow the rhythm:
            <br />
            <strong>Inhale → Hold → Exhale → Hold</strong>
          </p>
          <button
            type="button"
            onClick={handleBeginClick}
            onPointerDown={stopPropagation}
            className="bg-accent-gold text-white border-none p-[10px_24px] rounded-[20px]
              text-[0.7rem] uppercase tracking-[0.12em] font-semibold cursor-pointer
              transition-all duration-300 ease-smooth
              hover:bg-accent-gold-light hover:scale-105"
          >
            Begin
          </button>
        </div>
      )}

      {/* Keyboard Hint - Appears after 30s */}
      {showKeyHint && !isControlsOpen && (
        <div
          className={`absolute p-[12px_20px] bg-glass backdrop-blur-3xl rounded-[20px] border border-border
            text-[0.65rem] uppercase tracking-[0.1em] text-warm-gray opacity-80
            pointer-events-none animate-fade-in-out
            ${isMobile ? 'bottom-20 right-1/2 translate-x-1/2' : ''}`}
          style={{
            bottom: isMobile ? undefined : '100px',
            right: isMobile ? undefined : `${edgePadding}px`,
          }}
        >
          Press <strong className="text-accent-gold">T</strong> to tune
        </div>
      )}

      {/* Bottom-Right (Desktop) / Bottom-Center (Mobile): Collapsible Advanced Controls */}
      {isControlsOpen && (
        <div
          className={`absolute pointer-events-auto flex flex-col gap-3
            transition-opacity duration-600 ease-smooth
            ${isMobile ? 'items-center w-[90%] max-w-[400px] left-1/2 -translate-x-1/2' : 'items-end w-auto'}
            ${hasEntered ? 'opacity-100' : 'opacity-0'}`}
          style={{
            bottom: `${edgePadding}px`,
            right: isMobile ? undefined : `${edgePadding}px`,
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsControlsOpen(false)}
            onPointerDown={stopPropagation}
            className="bg-glass border border-border p-[9px_18px] rounded-3xl backdrop-blur-3xl
              text-[0.6rem] uppercase tracking-[0.12em] font-medium text-warm-gray
              cursor-pointer transition-all duration-400 ease-smooth
              flex items-center gap-1.5
              hover:bg-glass-hover"
          >
            <X size={12} strokeWidth={2} />
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
            className={`bg-glass backdrop-blur-[40px] border border-border shadow-soft overflow-auto
              ${isMobile ? 'p-5 rounded-[20px] w-full max-h-[70vh]' : 'p-6 rounded-3xl w-[260px] max-h-[600px]'}`}
          >
            {/* PRESETS ROW */}
            <div className="mb-5">
              <div className="flex gap-2 justify-between">
                {(['calm', 'centered', 'immersive'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    onPointerDown={stopPropagation}
                    className="flex-1 p-[10px_8px] bg-glass border border-border rounded-xl
                      text-[0.6rem] font-medium uppercase tracking-[0.08em] text-warm-gray
                      cursor-pointer transition-all duration-250 ease-smooth
                      hover:bg-glass-hover hover:border-accent-gold/30"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* VISUAL CONTROLS */}
            <div className="mb-4 pb-4 border-b border-border">
              <Slider
                label="Harmony"
                value={harmony}
                onValueChange={setHarmony}
                min={12}
                max={200}
                step={1}
                displayValue={Math.round(harmony)}
              />

              <Slider
                label="Shard Size"
                value={shardSize}
                onValueChange={setShardSize}
                min={0.1}
                max={1.2}
                step={0.02}
                displayValue={shardSize.toFixed(2)}
              />

              <Slider
                label="Breathing Space"
                value={orbitRadius}
                onValueChange={setOrbitRadius}
                min={2.0}
                max={8.0}
                step={0.1}
                displayValue={orbitRadius.toFixed(1)}
              />

              <Slider
                label="Atmosphere"
                value={atmosphereDensity}
                onValueChange={setAtmosphereDensity}
                min={0}
                max={300}
                step={10}
                displayValue={Math.round(atmosphereDensity)}
                className="mb-0"
              />
            </div>

            {/* RESET BUTTON */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => onApplyPreset('centered')}
                onPointerDown={stopPropagation}
                className="w-full p-2.5 bg-transparent border border-border rounded-xl
                  text-[0.58rem] font-medium uppercase tracking-[0.1em] text-warm-gray
                  cursor-pointer transition-all duration-250 ease-smooth
                  hover:border-accent-gold/30 hover:text-warm-brown"
              >
                Reset to Defaults
              </button>
            </div>

            {/* Mood Legend */}
            <div className="pt-4 border-t border-border grid grid-cols-2 gap-2.5">
              {Object.entries(MOOD_COLORS).map(([name, color]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.05em] opacity-80"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Centered Phase Indicator - ALWAYS VISIBLE */}
      <div
        className={`absolute left-1/2 pointer-events-none flex flex-col items-center
          transition-all duration-1000 ease-entrance
          ${hasEntered ? 'opacity-95 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{
          bottom: isMobile
            ? `max(${edgePadding + 16}px, env(safe-area-inset-bottom, 24px))`
            : '44px',
          transform: `translateX(-50%) translateY(${hasEntered ? 0 : 16}px)`,
          gap: isMobile ? '10px' : '12px',
        }}
      >
        {/* Phase Name + Timer Row */}
        <div className="flex items-baseline" style={{ gap: isMobile ? '10px' : '12px' }}>
          <span
            ref={phaseNameRef}
            className={`font-serif font-light uppercase text-warm-gray
              ${isMobile ? 'text-[1.75rem] tracking-[0.12em]' : isTablet ? 'text-[1.5rem] tracking-[0.18em]' : 'text-[1.5rem] tracking-[0.18em]'}`}
            style={{
              textShadow: '0 2px 20px var(--color-accent-gold-glow), 0 1px 6px rgba(0, 0, 0, 0.15)',
            }}
          >
            Inhale
          </span>
          <span
            ref={timerRef}
            className={`font-sans font-normal text-warm-gray min-w-[1.2em] text-center
              ${isMobile ? 'text-[1.1rem]' : 'text-[0.95rem]'}`}
          >
            4
          </span>
        </div>

        {/* 4·7·8 Cycle Indicator */}
        <BreathCycleIndicator />

        {/* Progress Bar */}
        <div
          ref={progressContainerRef}
          className="bg-border rounded-[1px] overflow-hidden transition-shadow duration-300 ease-smooth"
          style={{
            width: isMobile ? '120px' : '140px',
            height: isMobile ? '2px' : '1.5px',
            boxShadow: '0 0 8px var(--color-accent-gold-glow)',
          }}
        >
          <div
            ref={progressRef}
            className="h-full w-0 rounded-[1px] transition-[width] duration-[80ms] linear"
            style={{
              background:
                'linear-gradient(90deg, var(--color-accent-gold), var(--color-text-glow))',
            }}
          />
        </div>

        {/* Presence Count */}
        <div
          className={`uppercase text-warm-gray opacity-65 mt-0.5
            ${isMobile ? 'text-[0.68rem] font-medium tracking-[0.12em]' : 'text-[0.6rem] font-normal tracking-[0.12em]'}`}
        >
          <span ref={presenceCountRef}>{presenceCount}</span> breathing together
        </div>
      </div>

      {/* Styles moved to src/styles/ui.css - imported globally in index.tsx
          Includes: fadeInOut, slideUp animations, slider thumb styling,
          button focus states, modal-stagger, mood-button hover effects */}
    </div>
  );
}
