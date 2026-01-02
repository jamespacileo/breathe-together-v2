/**
 * TopRightControls - Minimal icon buttons for tune and audio control
 *
 * Provides:
 * - Tune/Settings icon - Opens settings modal
 * - Audio toggle icon - Quick enable/disable audio with visual state indicator
 *
 * Uses:
 * - lucide-react for consistent iconography
 * - Tailwind CSS for styling
 */

import { Settings, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { getResponsiveSpacing, useViewport } from '../hooks/useViewport';
import { useAudioStore } from '../stores/audioStore';

interface TopRightControlsProps {
  /** Callback to open tune/animation controls */
  onOpenTuneControls: () => void;
  /** Callback to open settings/mood modal */
  onOpenSettings: () => void;
}

export function TopRightControls({ onOpenTuneControls, onOpenSettings }: TopRightControlsProps) {
  // Use Zustand store for cross-Canvas audio state
  const { enabled, isLoading, providerReady, requestToggle } = useAudioStore();
  const { deviceType, isMobile } = useViewport();

  // Match SimpleGaiaUI's edge padding for vertical alignment
  const edgePadding = getResponsiveSpacing(deviceType, 16, 24, 32);

  // Responsive button sizing - smaller on mobile to reduce visual weight
  const buttonSize = isMobile ? 38 : 44;
  const iconSize = isMobile ? 18 : 20;
  const buttonGap = isMobile ? 6 : 10;

  const stopPropagation = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // Common button classes for Tailwind
  const buttonClasses = useMemo(
    () =>
      `flex items-center justify-center rounded-full cursor-pointer shrink-0
       bg-glass-light backdrop-blur-[20px] border border-border-light
       shadow-soft text-warm-gray
       transition-all duration-250 ease-smooth
       hover:bg-glass-hover hover:shadow-medium hover:-translate-y-0.5
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/50`,
    [],
  );

  return (
    <div
      data-ui="top-right-controls"
      className="absolute z-[200] flex flex-row items-center pointer-events-auto"
      style={{
        top: `${edgePadding}px`,
        right: `${edgePadding}px`,
        gap: `${buttonGap}px`,
      }}
    >
      {/* Audio Toggle Icon - only render if AudioProvider is available */}
      {providerReady && (
        <button
          type="button"
          title={
            isLoading
              ? 'Loading audio...'
              : enabled
                ? 'Audio On (click to disable)'
                : 'Audio Off (click to enable)'
          }
          onClick={requestToggle}
          onPointerDown={stopPropagation}
          disabled={isLoading}
          className={buttonClasses}
          style={{
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            minWidth: `${buttonSize}px`,
            minHeight: `${buttonSize}px`,
            color: enabled ? 'var(--color-accent-gold)' : undefined,
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {enabled ? (
            <Volume2 size={iconSize} strokeWidth={1.5} aria-label="Audio enabled" />
          ) : (
            <VolumeX size={iconSize} strokeWidth={1.5} aria-label="Audio disabled" />
          )}
        </button>
      )}

      {/* Tune/Animation Controls Icon */}
      <button
        type="button"
        title="Tune Animation"
        onClick={onOpenTuneControls}
        onPointerDown={stopPropagation}
        className={buttonClasses}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          minWidth: `${buttonSize}px`,
          minHeight: `${buttonSize}px`,
        }}
      >
        <SlidersHorizontal size={iconSize} strokeWidth={1.5} aria-label="Tune animation controls" />
      </button>

      {/* Settings/Mood Icon */}
      <button
        type="button"
        title="Settings & Mood"
        onClick={onOpenSettings}
        onPointerDown={stopPropagation}
        className={buttonClasses}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          minWidth: `${buttonSize}px`,
          minHeight: `${buttonSize}px`,
        }}
      >
        <Settings size={iconSize} strokeWidth={1.5} aria-label="Settings" />
      </button>
    </div>
  );
}
