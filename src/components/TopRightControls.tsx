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

function getAudioTooltipLabel({
  isDisabled,
  isLoading,
  isUnavailable,
  unavailableReason,
  providerReady,
}: {
  isDisabled: boolean;
  isLoading: boolean;
  isUnavailable: boolean;
  unavailableReason: string | null;
  providerReady: boolean;
}): string | null {
  if (!isDisabled) return null;
  if (isLoading) return 'Loading audio...';
  if (isUnavailable) return unavailableReason || 'Audio is not available';
  if (!providerReady) return 'Audio system initializing...';
  return 'Audio is not available';
}

function getAudioTitle({ isDisabled, enabled }: { isDisabled: boolean; enabled: boolean }) {
  if (isDisabled) return undefined;
  return enabled ? 'Audio On (click to disable)' : 'Audio Off (click to enable)';
}

function AudioToggleControl({
  buttonClasses,
  buttonSize,
  iconSize,
  stopPropagation,
}: {
  buttonClasses: string;
  buttonSize: number;
  iconSize: number;
  stopPropagation: (e: React.PointerEvent) => void;
}) {
  const { enabled, isLoading, providerReady, isUnavailable, unavailableReason, requestToggle } =
    useAudioStore();

  const isDisabled = isLoading || isUnavailable || !providerReady;

  const tooltipLabel = getAudioTooltipLabel({
    isDisabled,
    isLoading,
    isUnavailable,
    unavailableReason: unavailableReason ?? null,
    providerReady,
  });

  const title = getAudioTitle({ isDisabled, enabled });

  const Icon = enabled && !isUnavailable ? Volume2 : VolumeX;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            title={title}
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
            <Icon size={iconSize} strokeWidth={1.5} aria-label="Audio toggle" />
          </button>
        </TooltipTrigger>
        {tooltipLabel && (
          <TooltipContent side="bottom" align="end">
            <div className="max-w-[200px]">
              <span>{tooltipLabel}</span>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export function TopRightControls({ onOpenTuneControls, onOpenSettings }: TopRightControlsProps) {
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
      <AudioToggleControl
        buttonClasses={buttonClasses}
        buttonSize={buttonSize}
        iconSize={iconSize}
        stopPropagation={stopPropagation}
      />

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
