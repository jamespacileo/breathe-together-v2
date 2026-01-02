/**
 * TopRightControls - Minimal icon buttons for tune and audio control
 *
 * Provides:
 * - Tune/Settings icon - Opens settings modal
 * - Audio toggle icon - Quick enable/disable audio with visual state indicator
 */

import { useCallback, useContext, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import { AudioContext } from '../audio/AudioProvider';
import { BREAKPOINTS } from '../hooks/useViewport';
import { useSettingsStore } from '../stores/settingsStore';
import { UI_COLORS, Z_INDEX } from '../styles/designTokens';

export function TopRightControls() {
  // Get settings actions from store (no prop drilling!)
  const { setShowTuneControls, setShowSettings } = useSettingsStore();
  // Use useContext directly to avoid throwing error when provider is missing
  // This allows the component to render gracefully without audio controls
  const audio = useContext(AudioContext);

  // Responsive design using react-responsive
  const isMobile = useMediaQuery({ maxWidth: BREAKPOINTS.mobile });
  const isTablet = useMediaQuery({
    minWidth: BREAKPOINTS.mobile + 1,
    maxWidth: BREAKPOINTS.tablet,
  });

  // Match SimpleGaiaUI's edge padding for vertical alignment
  const edgePadding = isMobile ? 16 : isTablet ? 24 : 32;

  // Responsive button sizing - smaller on mobile to reduce visual weight
  const buttonSize = isMobile ? 38 : 44;
  const iconSize = isMobile ? 18 : 20;
  const buttonGap = isMobile ? 6 : 10;

  // Use centralized design tokens - memoized to prevent recreation
  const colors = useMemo(
    () => ({
      icon: UI_COLORS.text.tertiary,
      iconHover: UI_COLORS.text.secondary,
      iconActive: UI_COLORS.accent.gold,
      bg: UI_COLORS.surface.glassLight,
      bgHover: UI_COLORS.surface.glassHover,
      border: UI_COLORS.border.light,
      shadow: UI_COLORS.shadow.soft,
      shadowHover: UI_COLORS.shadow.medium,
    }),
    [],
  );

  const stopPropagation = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // Common button styles to reduce duplication - memoized
  const buttonStyle: React.CSSProperties = useMemo(
    () => ({
      background: colors.bg,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${colors.border}`,
      borderRadius: '50%',
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      minWidth: `${buttonSize}px`,
      minHeight: `${buttonSize}px`,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: colors.icon,
      boxShadow: colors.shadow,
      transform: 'translateY(0)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }),
    [buttonSize, colors.bg, colors.border, colors.icon, colors.shadow],
  );

  // Memoized event handlers to prevent recreation on every render
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = colors.bgHover;
      e.currentTarget.style.boxShadow = colors.shadowHover;
      e.currentTarget.style.transform = 'translateY(-2px)';
    },
    [colors.bgHover, colors.shadowHover],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = colors.bg;
      e.currentTarget.style.boxShadow = colors.shadow;
      e.currentTarget.style.transform = 'translateY(0)';
    },
    [colors.bg, colors.shadow],
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: `${edgePadding}px`,
        right: `${edgePadding}px`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: `${buttonGap}px`,
        zIndex: Z_INDEX.modal,
        pointerEvents: 'auto',
      }}
    >
      {/* Audio Toggle Icon - only render if AudioProvider is available */}
      {audio && (
        <button
          type="button"
          title={
            audio.state.enabled ? 'Audio On (click to disable)' : 'Audio Off (click to enable)'
          }
          onClick={() => {
            audio.setEnabled(!audio.state.enabled);
          }}
          onPointerDown={stopPropagation}
          style={{
            ...buttonStyle,
            color: audio.state.enabled ? colors.iconActive : colors.icon,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {audio.state.enabled ? (
            // Audio On Icon (speaker with sound waves)
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-labelledby="audio-on-title"
            >
              <title id="audio-on-title">Audio enabled</title>
              <path
                d="M11 5L6 9H2v6h4l5 4V5z"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.54 8.46a5 5 0 0 1 0 7.07"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.07 4.93a10 10 0 0 1 0 14.14"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Audio Off Icon (speaker with X)
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-labelledby="audio-off-title"
            >
              <title id="audio-off-title">Audio disabled</title>
              <path
                d="M11 5L6 9H2v6h4l5 4V5z"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="23" y1="9" x2="17" y2="15" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="9" x2="23" y2="15" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}

      {/* Tune/Animation Controls Icon */}
      <button
        type="button"
        title="Tune Animation"
        onClick={() => setShowTuneControls(true)}
        onPointerDown={stopPropagation}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-labelledby="tune-icon-title"
        >
          <title id="tune-icon-title">Tune animation controls</title>
          {/* Horizontal sliders icon */}
          <line x1="4" y1="6" x2="20" y2="6" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="6" r="2" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="14" cy="12" r="2" strokeWidth="1.5" />
          <line x1="4" y1="18" x2="20" y2="18" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="18" r="2" strokeWidth="1.5" />
        </svg>
      </button>

      {/* Settings/Mood Icon */}
      <button
        type="button"
        title="Settings & Mood"
        onClick={() => setShowSettings(true)}
        onPointerDown={stopPropagation}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-labelledby="settings-icon-title"
        >
          <title id="settings-icon-title">Settings</title>
          <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
          <path d="M12 1v6m0 6v6M1 12h6m6 0h6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
