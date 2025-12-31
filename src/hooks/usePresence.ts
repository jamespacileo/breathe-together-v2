/**
 * usePresence - Hybrid presence tracking with WebSocket + polling fallback
 *
 * Architecture:
 * 1. Try WebSocket connection (Durable Objects) - ~$8/month at 10k users
 * 2. Fall back to polling with probabilistic sampling - ~$30/month at 1k users
 *
 * WebSocket provides:
 * - Real-time push updates (no polling overhead)
 * - Exact user counts (no sampling needed)
 * - Lower cost at scale
 *
 * Usage:
 * ```tsx
 * const { count, moods, mood, setMood, isConnected } = usePresence();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId } from '../constants';
import { generateMockPresence } from '../lib/mockPresence';

export interface PresenceState {
  count: number;
  moods: Record<MoodId, number>;
  timestamp: number;
}

interface ServerConfig {
  sampleRate: number;
  heartbeatIntervalMs: number;
  supportsWebSocket: boolean;
  version: number;
}

const DEFAULT_CONFIG: ServerConfig = {
  sampleRate: 0.03,
  heartbeatIntervalMs: 30_000,
  supportsWebSocket: true,
  version: 2,
};

const CONFIG = {
  API_URL: import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787',
  PRESENCE_POLL_INTERVAL_MS: 10_000,
  WS_RECONNECT_DELAY_MS: 3_000,
  STORAGE_KEYS: {
    SESSION_ID: 'breathe-together:sessionId',
    MOOD: 'breathe-together:mood',
  },
} as const;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  if (stored && ['gratitude', 'presence', 'release', 'connection'].includes(stored)) {
    return stored as MoodId;
  }
  return 'presence';
}

function storeMood(mood: MoodId): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MOOD, mood);
  }
}

export interface UsePresenceResult {
  count: number;
  moods: Record<MoodId, number>;
  mood: MoodId;
  setMood: (mood: MoodId) => void;
  isConnected: boolean;
  isMock: boolean;
  connectionType: 'websocket' | 'polling' | 'mock';
}

export function usePresence(): UsePresenceResult {
  const [presence, setPresence] = useState<PresenceState>(() => ({
    ...generateMockPresence(42),
    timestamp: Date.now(),
  }));
  const [mood, setMoodState] = useState<MoodId>(getStoredMood);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'mock'>('mock');

  const sessionIdRef = useRef<string>(getSessionId());
  const configRef = useRef<ServerConfig>(DEFAULT_CONFIG);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Get WebSocket URL from HTTP URL
   */
  const getWsUrl = useCallback((): string => {
    const httpUrl = new URL(CONFIG.API_URL);
    const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${httpUrl.host}/api/room?sessionId=${sessionIdRef.current}&mood=${mood}`;
  }, [mood]);

  /**
   * Handle incoming WebSocket presence update
   */
  const handlePresenceUpdate = useCallback((data: PresenceState) => {
    setPresence(data);
    setIsConnected(true);
  }, []);

  /**
   * Connect via WebSocket
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionType('websocket');
        console.log('Presence: WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string } & PresenceState;
          if (data.type === 'presence' || data.count !== undefined) {
            handlePresenceUpdate(data);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
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
        console.warn('Presence: WebSocket error, falling back to polling');
      };

      wsRef.current = ws;
    } catch (e) {
      // WebSocket failed, will fall back to polling in init()
      console.warn('Failed to create WebSocket:', e);
    }
  }, [getWsUrl, handlePresenceUpdate]);

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
      const response = await fetch(`${CONFIG.API_URL}/api/presence`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as PresenceState;
      setPresence(data);
      setIsConnected(true);
      if (connectionType === 'mock') setConnectionType('polling');
    } catch (e) {
      console.warn('Presence fetch failed:', e);
      setIsConnected(false);
      setConnectionType('mock');
      setPresence({ ...generateMockPresence(42), timestamp: Date.now() });
    }
  }, [connectionType]);

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
        const response = await fetch(`${CONFIG.API_URL}/api/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            mood: currentMood,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as PresenceState;
        setPresence(data);
        setIsConnected(true);
        setConnectionType('polling');
      } catch (e) {
        console.warn('Heartbeat failed:', e);
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

    maybeSendHeartbeat(mood, true);

    pollingIntervalRef.current = setInterval(() => {
      maybeSendHeartbeat(mood);
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

    const init = async () => {
      // Fetch config
      try {
        const response = await fetch(`${CONFIG.API_URL}/api/config`);
        if (response.ok) {
          const data = (await response.json()) as ServerConfig;
          configRef.current = data;
        }
      } catch (e) {
        console.warn('Failed to fetch config:', e);
      }

      if (!mounted) return;

      // Try WebSocket first, with timeout fallback to polling
      if (configRef.current.supportsWebSocket && typeof WebSocket !== 'undefined') {
        connectWebSocket();
        // If WebSocket doesn't connect within 5s, fall back to polling
        setTimeout(() => {
          if (mounted && wsRef.current?.readyState !== WebSocket.OPEN) {
            console.log('Presence: WebSocket timeout, falling back to polling');
            startPolling();
          }
        }, 5000);
      } else {
        startPolling();
      }
    };

    init();

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

  return {
    count: presence.count,
    moods: presence.moods,
    mood,
    setMood,
    isConnected,
    isMock: connectionType === 'mock',
    connectionType,
  };
}
