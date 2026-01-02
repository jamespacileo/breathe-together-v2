/**
 * Hook for managing first-time user flows
 * Shows tutorial/onboarding sequence on first visit
 */

import { useEffect, useRef } from 'react';
import { inspirationApi } from '../lib/inspirationalApi';
import type { InspirationMessage } from '../lib/types/inspirational';

interface UseFirstTimeFlowOptions {
  enabled?: boolean;
  durationMinutes?: number;
  messages?: InspirationMessage[];
}

const FIRST_TIME_KEY = 'breathe-together:first-time-visited';

/**
 * Default first-time user flow messages
 */
const DEFAULT_FIRST_TIME_MESSAGES: InspirationMessage[] = [
  {
    id: 'ft-1',
    top: 'Welcome',
    bottom: 'To Breathe Together',
    cyclesPerMessage: 2,
    authoredAt: Date.now(),
    source: 'preset',
  },
  {
    id: 'ft-2',
    top: 'This is a space',
    bottom: 'To breathe with others',
    cyclesPerMessage: 2,
    authoredAt: Date.now(),
    source: 'preset',
  },
  {
    id: 'ft-3',
    top: 'Feel the rhythm',
    bottom: 'Of collective breathing',
    cyclesPerMessage: 2,
    authoredAt: Date.now(),
    source: 'preset',
  },
  {
    id: 'ft-4',
    top: 'You are connected',
    bottom: 'With everyone here',
    cyclesPerMessage: 2,
    authoredAt: Date.now(),
    source: 'preset',
  },
  {
    id: 'ft-5',
    top: 'Select your mood',
    bottom: 'To join the experience',
    cyclesPerMessage: 2,
    authoredAt: Date.now(),
    source: 'preset',
  },
];

export function useFirstTimeFlow(
  sessionId: string,
  options: UseFirstTimeFlowOptions = {},
): { isFirstTime: boolean; isLoading: boolean } {
  const { enabled = true, durationMinutes = 5, messages = DEFAULT_FIRST_TIME_MESSAGES } = options;

  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasRunRef.current) return;

    async function checkAndApplyFirstTimeFlow() {
      // Check if user has visited before (stored in localStorage)
      const hasVisited = localStorage.getItem(FIRST_TIME_KEY);
      if (hasVisited) return;

      // Mark as visited
      localStorage.setItem(FIRST_TIME_KEY, String(Date.now()));

      try {
        // Apply first-time flow override
        await inspirationApi.createOverride(
          sessionId,
          'first-time-flow',
          messages,
          durationMinutes,
          'First-time user onboarding',
        );
      } catch (err) {
        console.warn('Failed to apply first-time flow:', err);
        // Don't fail hard - user can still use the app
      }
    }

    checkAndApplyFirstTimeFlow();
    hasRunRef.current = true;
  }, [sessionId, enabled, durationMinutes, messages]);

  const isFirstTime = !localStorage.getItem(FIRST_TIME_KEY);

  return {
    isFirstTime,
    isLoading: false,
  };
}
