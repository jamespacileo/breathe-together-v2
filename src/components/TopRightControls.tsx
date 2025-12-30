/**
 * TopRightControls - Minimal icon buttons for tune and audio control
 *
 * Provides:
 * - Tune/Settings icon - Opens settings modal
 * - Audio toggle icon - Quick enable/disable audio with visual state indicator
 */

import { useContext } from 'react';
import { AudioContext } from '../audio/AudioProvider';

interface TopRightControlsProps {
  /** Callback to open tune/animation controls */
  onOpenTuneControls: () => void;
  /** Callback to open settings/mood modal */
  onOpenSettings: () => void;
}

export function TopRightControls({ onOpenTuneControls, onOpenSettings }: TopRightControlsProps) {
  // Use useContext directly to avoid throwing error when provider is missing
  // This allows the component to render gracefully without audio controls
  const audio = useContext(AudioContext);

  const colors = {
    icon: '#7a6b5e',
    iconHover: '#5a4d42',
    iconActive: '#c9a06c', // Warm gold when active
    bg: 'rgba(252, 250, 246, 0.6)',
    bgHover: 'rgba(252, 250, 246, 0.9)',
    border: 'rgba(160, 140, 120, 0.15)',
    shadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
    shadowHover: '0 6px 20px rgba(0, 0, 0, 0.1)',
  };

  const stopPropagation = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        zIndex: 200,
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
            background: colors.bg,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.border}`,
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: audio.state.enabled ? colors.iconActive : colors.icon,
            boxShadow: colors.shadow,
            transform: 'translateY(0)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.bgHover;
            e.currentTarget.style.boxShadow = colors.shadowHover;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.bg;
            e.currentTarget.style.boxShadow = colors.shadow;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {audio.state.enabled ? (
            // Audio On Icon (speaker with sound waves)
            <svg
              width="20"
              height="20"
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
              width="20"
              height="20"
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
        onClick={onOpenTuneControls}
        onPointerDown={stopPropagation}
        style={{
          background: colors.bg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          minWidth: '44px',
          minHeight: '44px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: colors.icon,
          boxShadow: colors.shadow,
          transform: 'translateY(0)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.bgHover;
          e.currentTarget.style.boxShadow = colors.shadowHover;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.bg;
          e.currentTarget.style.boxShadow = colors.shadow;
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <svg
          width="20"
          height="20"
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
        onClick={onOpenSettings}
        onPointerDown={stopPropagation}
        style={{
          background: colors.bg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          minWidth: '44px',
          minHeight: '44px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: colors.icon,
          boxShadow: colors.shadow,
          transform: 'translateY(0)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.bgHover;
          e.currentTarget.style.boxShadow = colors.shadowHover;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.bg;
          e.currentTarget.style.boxShadow = colors.shadow;
          e.currentTarget.style.transform = 'translateY(0)';
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
          <title id="settings-icon-title">Settings</title>
          <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
          <path d="M12 1v6m0 6v6M1 12h6m6 0h6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
