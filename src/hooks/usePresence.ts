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
import { generateMockPresence } from '../lib/mockPresence';
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
  STORAGE_KEYS: {
    SESSION_ID: 'breathe-together:sessionId',
    MOOD: 'breathe-together:mood',
  },
} as const;

function generateSessionId(): string {
  return crypto.randomUUID();
}

function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  let sessionId = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
}

function getStoredMood(): MoodId {
  if (typeof window === 'undefined') return 'presence';
  const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.MOOD);
  return validateMood(stored);
}

function storeMood(mood: MoodId): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MOOD, mood);
  }
}

export interface UsePresenceResult {
  count: number;
  moods: Record<MoodId, number>;
  users: User[];
  mood: MoodId;
  setMood: (mood: MoodId) => void;
  isConnected: boolean;
  connectionType: 'websocket' | 'polling' | 'mock';
}

export function usePresence(): UsePresenceResult {
  const [presence, setPresence] = useState<PresenceState>(() => {
    const mockData = generateMockPresence(42);
    console.log('[usePresence] Initial mock data:', {
      count: mockData.count,
      usersLength: mockData.users.length,
      sampleUser: mockData.users[0],
    });
    return {
      ...mockData,
      timestamp: Date.now(),
    };
  });
  const [mood, setMoodState] = useState<MoodId>(getStoredMood);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'mock'>('mock');

  const sessionIdRef = useRef<string>(getSessionId());
  const configRef = useRef<ServerConfig>(DEFAULT_CONFIG);
  const moodRef = useRef<MoodId>(mood); // Ref to avoid reconnect on mood change
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setPresence({ ...generateMockPresence(42), timestamp: Date.now() });
  }, []);

  /**
   * Connect via WebSocket
   * Uses moodRef to avoid recreating callback on mood changes
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = presenceApi.getWsUrl(sessionIdRef.current, moodRef.current);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionType('websocket');
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
        // Attempt reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
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

    // Fire-and-forget heartbeat - errors handled internally
    void maybeSendHeartbeat(mood, true);

    pollingIntervalRef.current = setInterval(() => {
      // Fire-and-forget heartbeat - errors handled internally
      void maybeSendHeartbeat(mood);
    }, configRef.current.heartbeatIntervalMs);

    setConnectionType('polling');
  }, [mood, maybeSendHeartbeat]);

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
        // Fire-and-forget heartbeat - errors handled internally
        void maybeSendHeartbeat(newMood, true);
      }
    },
    [sendMoodUpdate, maybeSendHeartbeat],
  );

  /**
   * Initialize connection
   */
  useEffect(() => {
    let mounted = true;

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
        setTimeout(() => {
          if (mounted && wsRef.current?.readyState !== WebSocket.OPEN) {
            startPolling();
          }
        }, CONFIG.WS_TIMEOUT_MS);
      } else {
        startPolling();
      }
    };

    // Fire-and-forget initialization - errors handled internally
    void init();

    return () => {
      mounted = false;
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

  // Debug: Log presence state periodically
  useEffect(() => {
    console.log('[usePresence] Returning presence:', {
      count: presence.count,
      usersLength: presence.users.length,
      connectionType,
      isConnected,
    });
  }, [presence, connectionType, isConnected]);

  return {
    count: presence.count,
    moods: presence.moods,
    users: presence.users,
    mood,
    setMood,
    isConnected,
    connectionType,
  };
}
