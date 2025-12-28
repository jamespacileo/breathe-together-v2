import { useMemo } from 'react';
import type { MoodId } from '../constants';
import { generateMockPresence } from '../lib/mockPresence';

export interface PresenceData {
  count: number;
  moods: Record<MoodId, number>; // mood id -> count
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
}

export interface UsePresenceOptions {
  userCount?: number; // Total simulated users
}

/**
 * Hook for tracking global presence (MVP)
 *
 * Uses simulated data only to keep the runtime simple.
 */
export function usePresence(options: UsePresenceOptions = {}): PresenceData {
  const { userCount = 75 } = options;
  const data = useMemo(() => generateMockPresence(userCount), [userCount]);

  return {
    count: data.count,
    moods: data.moods,
    isLoading: false,
    isError: false,
    error: null,
  };
}
