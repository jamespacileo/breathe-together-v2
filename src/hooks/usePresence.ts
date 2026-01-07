/**
 * usePresence - Hybrid presence tracking with WebSocket + polling fallback
 *
 * Architecture:
 * 1. Try WebSocket connection (Durable Objects) - ~$8/month at 10k users
 * 2. Fall back to polling with probabilistic sampling - ~$30/month at 1k users
 *
 * Features:
 * - Type-safe API with Zod runtime validation
 * - Automatic reconnection on disconnect
 * - Visibility-aware (reconnects when tab becomes visible)
 * - Graceful fallback to mock data when offline
 *
 * Usage:
 * ```tsx
 * const { count, moods, mood, setMood, isConnected } = usePresence();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { type CurrentUserOptions, generateMockPresence } from '../lib/mockPresence';
import {
  type MoodId,
  type PresenceState,
  presenceApi,
  type ServerConfig,
  type User,
  validateMood,
} from '../lib/presenceApi';

// Re-export types for convenience
export type { MoodId, PresenceState, User } from '../lib/presenceApi';

const DEFAULT_CONFIG: ServerConfig = {
  sampleRate: 0.03,
  heartbeatIntervalMs: 30_000,
  supportsWebSocket: true,
  version: 2,
};

const CONFIG = {
  WS_RECONNECT_DELAY_MS: 3_000,
  WS_TIMEOUT_MS: 5_000,
} as const;

function generateSessionId(): string {
  return crypto.randomUUID();
}

function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
}

function getStoredMood(): MoodId {
  if (typeof window === 'undefined') return 'presence';
  const stored = localStorage.getItem(STORAGE_KEYS.MOOD);
  return validateMood(stored);
}

function storeMood(mood: MoodId): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.MOOD, mood);
  }
}

export interface UsePresenceResult {
  count: number;
  moods: Record<MoodId, number>;
  users: User[];
  countryCounts: Record<string, number>;
  mood: MoodId;
  setMood: (mood: MoodId) => void;
  isConnected: boolean;
  connectionType: 'websocket' | 'polling' | 'mock';
  /** Current user's session ID (stable across sessions via localStorage) */
  sessionId: string;
}

export function usePresence(): UsePresenceResult {
  // Initialize session ID and mood eagerly (stable across re-renders)
  const sessionIdRef = useRef<string>(getSessionId());
  const initialMood = getStoredMood();

  const [presence, setPresence] = useState<PresenceState>(() => {
    // Include current user in mock data at index 0
    const currentUser: CurrentUserOptions = {
      sessionId: sessionIdRef.current,
      mood: initialMood,
    };
    const mockData = generateMockPresence(42, currentUser);
    return {
      ...mockData,
      timestamp: Date.now(),
    };
  });
  const [mood, setMoodState] = useState<MoodId>(initialMood);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'mock'>('mock');

  const configRef = useRef<ServerConfig>(DEFAULT_CONFIG);
  const moodRef = useRef<MoodId>(mood); // Ref to avoid reconnect on mood change
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAllowedRef = useRef(true);

  // Keep moodRef in sync with state
  moodRef.current = mood;

  /**
   * Handle incoming presence update
   */
  const handlePresenceUpdate = useCallback((data: PresenceState) => {
    setPresence(data);
    setIsConnected(true);
  }, []);

  /**
   * Fall back to mock data
   */
  const fallbackToMock = useCallback(() => {
    setIsConnected(false);
    setConnectionType('mock');
    // Include current user in mock data at index 0
    const currentUser: CurrentUserOptions = {
      sessionId: sessionIdRef.current,
      mood: moodRef.current,
    };
    setPresence({ ...generateMockPresence(42, currentUser), timestamp: Date.now() });
  }, []);

  /**
   * Connect via WebSocket
   * Uses moodRef to avoid recreating callback on mood changes
   */
  const connectWebSocket = useCallback(() => {
    if (!reconnectAllowedRef.current) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    try {
      const wsUrl = presenceApi.getWsUrl(sessionIdRef.current, moodRef.current);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionType('websocket');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        const data = presenceApi.parseWsMessage(event.data);
        if (data) {
          handlePresenceUpdate(data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!reconnectAllowedRef.current) return;
        // Attempt reconnect after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          // Double-check mounted state inside timeout to prevent race condition
          // where timeout fires between cleanup setting ref to false and clearing timeout
          if (!reconnectAllowedRef.current) return;
          connectWebSocket();
        }, CONFIG.WS_RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        // Will trigger onclose, which handles reconnect
      };

      wsRef.current = ws;
    } catch {
      // WebSocket failed, will fall back to polling in init()
    }
  }, [handlePresenceUpdate]);

  /**
   * Send mood update via WebSocket
   */
  const sendMoodUpdate = useCallback((newMood: MoodId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mood',
          sessionId: sessionIdRef.current,
          mood: newMood,
        }),
      );
    }
  }, []);

  /**
   * Fetch presence via HTTP (polling fallback)
   */
  const fetchPresence = useCallback(async (): Promise<void> => {
    try {
      const data = await presenceApi.getPresence();
      setPresence(data);
      setIsConnected(true);
      if (connectionType === 'mock') setConnectionType('polling');
    } catch {
      fallbackToMock();
    }
  }, [connectionType, fallbackToMock]);

  /**
   * Send heartbeat via HTTP (polling fallback)
   */
  const maybeSendHeartbeat = useCallback(
    async (currentMood: MoodId, force = false): Promise<void> => {
      const shouldSend = force || Math.random() < configRef.current.sampleRate;
      if (!shouldSend) {
        await fetchPresence();
        return;
      }

      try {
        const data = await presenceApi.sendHeartbeat({
          sessionId: sessionIdRef.current,
          mood: currentMood,
        });
        setPresence(data);
        setIsConnected(true);
        setConnectionType('polling');
      } catch {
        await fetchPresence();
      }
    },
    [fetchPresence],
  );

  /**
   * Start polling (fallback when WebSocket unavailable)
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    maybeSendHeartbeat(moodRef.current, true);

    pollingIntervalRef.current = setInterval(() => {
      maybeSendHeartbeat(moodRef.current);
    }, configRef.current.heartbeatIntervalMs);

    setConnectionType('polling');
  }, [maybeSendHeartbeat]);

  /**
   * Update mood
   */
  const setMood = useCallback(
    (newMood: MoodId) => {
      setMoodState(newMood);
      storeMood(newMood);

      // Send update via appropriate channel
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMoodUpdate(newMood);
      } else {
        maybeSendHeartbeat(newMood, true);
      }
    },
    [sendMoodUpdate, maybeSendHeartbeat],
  );

  /**
   * Initialize connection
   */
  useEffect(() => {
    let mounted = true;
    reconnectAllowedRef.current = true;

    const init = async () => {
      // Fetch config with Zod validation
      try {
        const data = await presenceApi.getConfig();
        configRef.current = data;
      } catch {
        // Use default config on error
      }

      if (!mounted) return;

      // Try WebSocket first, with timeout fallback to polling
      if (configRef.current.supportsWebSocket && typeof WebSocket !== 'undefined') {
        connectWebSocket();
        // If WebSocket doesn't connect within timeout, fall back to polling
        wsFallbackTimeoutRef.current = setTimeout(() => {
          if (mounted && wsRef.current?.readyState !== WebSocket.OPEN) {
            startPolling();
          }
        }, CONFIG.WS_TIMEOUT_MS);
      } else {
        startPolling();
      }
    };

    init();

    return () => {
      mounted = false;
      reconnectAllowedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsFallbackTimeoutRef.current) {
        clearTimeout(wsFallbackTimeoutRef.current);
        wsFallbackTimeoutRef.current = null;
      }
    };
  }, [connectWebSocket, startPolling]);

  /**
   * Handle visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectWebSocket]);

  return {
    count: presence.count,
    moods: presence.moods,
    users: presence.users,
    countryCounts: presence.countryCounts,
    mood,
    setMood,
    isConnected,
    connectionType,
    sessionId: sessionIdRef.current,
  };
}
