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
 * - Radix UI Tooltip for unavailable state feedback
 */

import { Settings, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { getResponsiveSpacing, useViewport } from '../hooks/useViewport';
import { useAudioStore } from '../stores/audioStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/Tooltip';

interface TopRightControlsProps {
  /** Callback to open tune/animation controls */
  onOpenTuneControls: () => void;
  /** Callback to open settings/mood modal */
  onOpenSettings: () => void;
}

export function TopRightControls({ onOpenTuneControls, onOpenSettings }: TopRightControlsProps) {
  // Use Zustand store for cross-Canvas audio state
  const { enabled, isLoading, providerReady, isUnavailable, unavailableReason, requestToggle } =
    useAudioStore();
  const { deviceType, isMobile } = useViewport();

  // Determine if button should be disabled
  const isDisabled = isLoading || isUnavailable || !providerReady;

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
       shadow-soft
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
      {/* Audio Toggle Icon - always visible, disabled with tooltip when unavailable */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              title={
                isDisabled
                  ? undefined // Let tooltip handle it
                  : enabled
                    ? 'Audio On (click to disable)'
                    : 'Audio Off (click to enable)'
              }
              onClick={isDisabled ? undefined : requestToggle}
              onPointerDown={stopPropagation}
              disabled={isDisabled}
              className={buttonClasses}
              style={{
                width: `${buttonSize}px`,
                height: `${buttonSize}px`,
                minWidth: `${buttonSize}px`,
                minHeight: `${buttonSize}px`,
                color:
                  enabled && !isDisabled ? 'var(--color-accent-gold)' : 'var(--color-warm-brown)',
                opacity: isDisabled ? 0.4 : 1,
                cursor: isLoading ? 'wait' : isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {enabled && !isUnavailable ? (
                <Volume2 size={iconSize} strokeWidth={1.5} aria-label="Audio enabled" />
              ) : (
                <VolumeX size={iconSize} strokeWidth={1.5} aria-label="Audio disabled" />
              )}
            </button>
          </TooltipTrigger>
          {isDisabled && (
            <TooltipContent side="bottom" align="end">
              <div className="max-w-[200px]">
                {isLoading ? (
                  <span>Loading audio...</span>
                ) : isUnavailable ? (
                  <span>{unavailableReason || 'Audio is not available'}</span>
                ) : !providerReady ? (
                  <span>Audio system initializing...</span>
                ) : null}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

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
          color: 'var(--color-warm-brown)', // High contrast dark blue-gray for better visibility
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
          color: 'var(--color-warm-brown)', // High contrast dark blue-gray for better visibility
        }}
      >
        <Settings size={iconSize} strokeWidth={1.5} aria-label="Settings" />
      </button>
    </div>
  );
}
