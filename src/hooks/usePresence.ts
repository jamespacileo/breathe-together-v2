/**
 * usePresence - Real-time presence tracking with Cloudflare Worker backend
 *
 * Features:
 * - Anonymous session tracking via localStorage
 * - Automatic heartbeat every 10 seconds
 * - Mood selection persists across sessions
 * - Graceful fallback to mock data when offline/development
 * - Sends leave signal on page unload
 *
 * Usage:
 * ```tsx
 * const { count, moods, mood, setMood, isConnected } = usePresence();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId } from '../constants';
import { generateMockPresence } from '../lib/mockPresence';

/**
 * Presence state returned by the API
 */
export interface PresenceState {
  count: number;
  moods: Record<MoodId, number>;
  timestamp: number;
}

/**
 * Configuration for the presence system
 *
 * Cost optimization: 30s heartbeat reduces requests by 3x vs 10s.
 * Combined with server-side write coalescing, this cuts KV writes by ~80%.
 */
const CONFIG = {
  /** Heartbeat interval in milliseconds (30s for cost efficiency) */
  HEARTBEAT_INTERVAL_MS: 30_000,
  /** API base URL - uses env var or defaults to localhost for dev */
  API_URL: import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787',
  /** LocalStorage keys */
  STORAGE_KEYS: {
    SESSION_ID: 'breathe-together:sessionId',
    MOOD: 'breathe-together:mood',
  },
} as const;

/**
 * Generate a random UUID for session identification
 */
function generateSessionId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create session ID from localStorage
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();

  let sessionId = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
}

/**
 * Get stored mood from localStorage
 */
function getStoredMood(): MoodId {
  if (typeof window === 'undefined') return 'presence';

  const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.MOOD);
  if (stored && ['gratitude', 'presence', 'release', 'connection'].includes(stored)) {
    return stored as MoodId;
  }
  return 'presence';
}

/**
 * Store mood in localStorage
 */
function storeMood(mood: MoodId): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MOOD, mood);
  }
}

/**
 * Hook return type
 */
export interface UsePresenceResult {
  /** Total number of connected users */
  count: number;
  /** Count of users per mood */
  moods: Record<MoodId, number>;
  /** Current user's mood */
  mood: MoodId;
  /** Update current user's mood */
  setMood: (mood: MoodId) => void;
  /** Whether we're connected to the backend */
  isConnected: boolean;
  /** Whether we're using mock data */
  isMock: boolean;
}

/**
 * Real-time presence tracking hook
 */
export function usePresence(): UsePresenceResult {
  const [presence, setPresence] = useState<PresenceState>(() => ({
    ...generateMockPresence(42),
    timestamp: Date.now(),
  }));
  const [mood, setMoodState] = useState<MoodId>(getStoredMood);
  const [isConnected, setIsConnected] = useState(false);
  const [isMock, setIsMock] = useState(true);

  const sessionIdRef = useRef<string>(getSessionId());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Send heartbeat to the backend
   */
  const sendHeartbeat = useCallback(async (currentMood: MoodId): Promise<boolean> => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          mood: currentMood,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as PresenceState;
      setPresence(data);
      setIsConnected(true);
      setIsMock(false);
      return true;
    } catch (e) {
      console.warn('Presence heartbeat failed, using mock data:', e);
      setIsConnected(false);
      setIsMock(true);
      // Use mock data as fallback
      setPresence({
        ...generateMockPresence(42),
        timestamp: Date.now(),
      });
      return false;
    }
  }, []);

  /**
   * Send leave signal (best-effort, no await)
   */
  const sendLeave = useCallback(() => {
    // Use sendBeacon for reliable delivery during page unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        `${CONFIG.API_URL}/api/leave`,
        JSON.stringify({ sessionId: sessionIdRef.current }),
      );
    } else {
      // Fallback to fetch (may not complete during unload)
      fetch(`${CONFIG.API_URL}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
        keepalive: true,
      }).catch(() => {
        // Ignore errors during cleanup
      });
    }
  }, []);

  /**
   * Update mood and immediately send heartbeat
   */
  const setMood = useCallback(
    (newMood: MoodId) => {
      setMoodState(newMood);
      storeMood(newMood);
      // Send immediate heartbeat with new mood
      sendHeartbeat(newMood);
    },
    [sendHeartbeat],
  );

  /**
   * Start heartbeat interval on mount
   */
  useEffect(() => {
    // Initial heartbeat
    sendHeartbeat(mood);

    // Set up interval
    intervalRef.current = setInterval(() => {
      sendHeartbeat(mood);
    }, CONFIG.HEARTBEAT_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      sendLeave();
    };
  }, [mood, sendHeartbeat, sendLeave]);

  /**
   * Handle page visibility changes
   * Send heartbeat when page becomes visible again
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(mood);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mood, sendHeartbeat]);

  /**
   * Handle page unload
   */
  useEffect(() => {
    const handleUnload = () => {
      sendLeave();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [sendLeave]);

  return {
    count: presence.count,
    moods: presence.moods,
    mood,
    setMood,
    isConnected,
    isMock,
  };
}
