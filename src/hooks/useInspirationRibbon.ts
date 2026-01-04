/**
 * useInspirationRibbon - Hook for animating inspirational text on the globe ribbon
 *
 * Connects to the inspirational text store and provides:
 * - Formatted message text for ribbon display (top and bottom lines)
 * - Breath-synchronized opacity for smooth transitions
 * - Message change detection for crossfade animations
 *
 * Supports both combined and dual-line formats:
 * Combined: { top: "We Breathe", bottom: "Together" } → "✦ We Breathe Together ✦"
 * Dual: Returns { topText: "✦ We Breathe ✦", bottomText: "✦ Together ✦" }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { easeExhale, easeInhale } from '../lib/easing';
import {
  type InspirationalMessage,
  useInspirationalTextStore,
} from '../stores/inspirationalTextStore';

/** Message format options for ribbon display */
export type RibbonMessageFormat = 'symbols' | 'spaced' | 'dots';

/** Format symbols for different styles */
const FORMAT_SYMBOLS: Record<RibbonMessageFormat, { separator: string; wrapper: string }> = {
  symbols: { separator: ' ', wrapper: '✦' },
  spaced: { separator: '  •  ', wrapper: '' },
  dots: { separator: ' · ', wrapper: '·' },
};

/**
 * Format an inspirational message for ribbon display (combined)
 */
export function formatMessageForRibbon(
  message: InspirationalMessage | null,
  format: RibbonMessageFormat = 'symbols',
): string {
  if (!message) {
    return '✦ BREATHE TOGETHER ✦';
  }

  const { wrapper } = FORMAT_SYMBOLS[format];
  const text = `${message.top} ${message.bottom}`;

  if (wrapper) {
    return `${wrapper} ${text} ${wrapper}`;
  }
  return text;
}

/**
 * Format message parts separately for dual-ribbon display
 */
export function formatMessageParts(
  message: InspirationalMessage | null,
  format: RibbonMessageFormat = 'symbols',
): { topText: string; bottomText: string } {
  const { wrapper } = FORMAT_SYMBOLS[format];

  if (!message) {
    return {
      topText: wrapper ? `${wrapper} BREATHE ${wrapper}` : 'BREATHE',
      bottomText: wrapper ? `${wrapper} TOGETHER ${wrapper}` : 'TOGETHER',
    };
  }

  return {
    topText: wrapper ? `${wrapper} ${message.top} ${wrapper}` : message.top,
    bottomText: wrapper ? `${wrapper} ${message.bottom} ${wrapper}` : message.bottom,
  };
}

/**
 * Calculate opacity based on breathing phase
 * - Inhale: Fade in (0 → 1)
 * - Hold-in: Fully visible (1)
 * - Exhale: Fade out (1 → 0)
 * - Hold-out: Hidden (0)
 */
function calculateBreathOpacity(phaseIndex: number, phaseProgress: number): number {
  switch (phaseIndex) {
    case 0: // Inhale: fade in
      return easeInhale(phaseProgress);
    case 1: // Hold-in: fully visible
      return 1;
    case 2: // Exhale: fade out
      return 1 - easeExhale(phaseProgress);
    case 3: // Hold-out: hidden
      return 0;
    default:
      return 0;
  }
}

export interface UseInspirationRibbonOptions {
  /** Enable message rotation from store @default true */
  enabled?: boolean;
  /** Message format style @default 'symbols' */
  format?: RibbonMessageFormat;
  /** Base opacity when fully visible @default 0.9 */
  baseOpacity?: number;
  /** Minimum opacity during fade @default 0.3 */
  minOpacity?: number;
  /** Fallback text when no messages available */
  fallbackText?: string;
}

export interface UseInspirationRibbonResult {
  /** Current formatted text for ribbon display (combined top + bottom) */
  text: string;
  /** Top line text for dual-ribbon display */
  topText: string;
  /** Bottom line text for dual-ribbon display */
  bottomText: string;
  /** Current opacity (0-1) based on breathing phase */
  opacity: number;
  /** Whether a message transition is in progress */
  isTransitioning: boolean;
  /** Current breathing phase (0-3) */
  phaseIndex: number;
  /** Progress through current phase (0-1) */
  phaseProgress: number;
  /** Raw message object from store */
  currentMessage: InspirationalMessage | null;
  /** Previous message (for crossfade) */
  previousMessage: InspirationalMessage | null;
}

/**
 * Hook for synchronized inspirational text on the globe ribbon
 *
 * @example
 * ```tsx
 * const { text, opacity, isTransitioning } = useInspirationRibbon({
 *   format: 'symbols',
 *   baseOpacity: 0.9,
 * });
 *
 * return <GlobeRibbonText text={text} opacity={opacity} />;
 * ```
 */
export function useInspirationRibbon(
  options: UseInspirationRibbonOptions = {},
): UseInspirationRibbonResult {
  const {
    enabled = true,
    format = 'symbols',
    baseOpacity = 0.9,
    minOpacity = 0.3,
    fallbackText = '✦ BREATHE TOGETHER ✦',
  } = options;

  // Store subscriptions
  const getCurrentMessage = useInspirationalTextStore((state) => state.getCurrentMessage);
  const advanceCycle = useInspirationalTextStore((state) => state.advanceCycle);

  // Local state
  const [currentMessage, setCurrentMessage] = useState<InspirationalMessage | null>(null);
  const [previousMessage, setPreviousMessage] = useState<InspirationalMessage | null>(null);
  const [opacity, setOpacity] = useState(baseOpacity);
  const [phaseInfo, setPhaseInfo] = useState({ phaseIndex: 0, phaseProgress: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track previous phase for cycle detection
  const prevPhaseRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);

  // Format current text (combined and separate parts)
  const text = enabled ? formatMessageForRibbon(currentMessage, format) : fallbackText;
  const { topText, bottomText } = enabled
    ? formatMessageParts(currentMessage, format)
    : { topText: '✦ BREATHE ✦', bottomText: '✦ TOGETHER ✦' };

  // Animation loop
  const updateAnimation = useCallback(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

    // Update phase info
    setPhaseInfo({ phaseIndex, phaseProgress });

    // Calculate breath-synchronized opacity
    const breathOpacity = calculateBreathOpacity(phaseIndex, phaseProgress);
    const scaledOpacity = minOpacity + breathOpacity * (baseOpacity - minOpacity);
    setOpacity(scaledOpacity);

    // Detect phase transitions for message changes
    if (prevPhaseRef.current !== phaseIndex) {
      // Entering inhale phase (new cycle) - advance message
      if (phaseIndex === 0 && prevPhaseRef.current === 2) {
        if (enabled) {
          // Store previous message for crossfade
          const oldMessage = getCurrentMessage();
          setPreviousMessage(oldMessage);
          setIsTransitioning(true);

          // Advance to next message
          advanceCycle();

          // Get new message
          const newMessage = getCurrentMessage();
          setCurrentMessage(newMessage);
        }
      }

      // Clear transition state after inhale completes
      if (phaseIndex === 1 && prevPhaseRef.current === 0) {
        setIsTransitioning(false);
        setPreviousMessage(null);
      }

      prevPhaseRef.current = phaseIndex;
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAnimation);
  }, [enabled, baseOpacity, minOpacity, getCurrentMessage, advanceCycle]);

  // Initialize current message on mount
  useEffect(() => {
    if (enabled) {
      const message = getCurrentMessage();
      setCurrentMessage(message);
    }
  }, [enabled, getCurrentMessage]);

  // Start/stop animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateAnimation]);

  return {
    text,
    topText,
    bottomText,
    opacity,
    isTransitioning,
    phaseIndex: phaseInfo.phaseIndex,
    phaseProgress: phaseInfo.phaseProgress,
    currentMessage,
    previousMessage,
  };
}

export default useInspirationRibbon;
