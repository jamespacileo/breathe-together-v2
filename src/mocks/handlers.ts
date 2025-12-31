/**
 * MSW Request Handlers for Presence API
 *
 * These handlers mock the Cloudflare Worker API for:
 * - Local development without running the worker
 * - Testing without network requests
 */

import { HttpResponse, http } from 'msw';
import type { MoodId } from '../constants';

// Simulated presence state
interface MockPresenceState {
  sessions: Map<string, { mood: MoodId; lastSeen: number }>;
  baseCount: number;
}

const state: MockPresenceState = {
  sessions: new Map(),
  baseCount: 42, // Base mock count for realistic numbers
};

// Configuration
const CONFIG = {
  SESSION_TTL_MS: 90_000,
  SAMPLE_RATE: 0.03,
};

/**
 * Calculate presence from mock state
 */
function calculatePresence() {
  const now = Date.now();
  const cutoff = now - CONFIG.SESSION_TTL_MS;

  // Prune stale sessions
  const idsToDelete: string[] = [];
  state.sessions.forEach((session, id) => {
    if (session.lastSeen < cutoff) {
      idsToDelete.push(id);
    }
  });
  for (const id of idsToDelete) {
    state.sessions.delete(id);
  }

  // Count moods
  const moodCounts: Record<MoodId, number> = {
    gratitude: 0,
    presence: 0,
    release: 0,
    connection: 0,
  };

  state.sessions.forEach((session) => {
    moodCounts[session.mood]++;
  });

  // Extrapolate from samples + add base count for realistic numbers
  const sampleCount = state.sessions.size;
  const estimatedCount = Math.max(state.baseCount, Math.round(sampleCount / CONFIG.SAMPLE_RATE));

  // Distribute base count according to mood ratios
  const ratios = {
    gratitude: 0.25,
    presence: 0.35,
    release: 0.25,
    connection: 0.15,
  };

  return {
    count: estimatedCount,
    moods: {
      gratitude: moodCounts.gratitude + Math.round(state.baseCount * ratios.gratitude),
      presence: moodCounts.presence + Math.round(state.baseCount * ratios.presence),
      release: moodCounts.release + Math.round(state.baseCount * ratios.release),
      connection: moodCounts.connection + Math.round(state.baseCount * ratios.connection),
    },
    timestamp: now,
  };
}

export const handlers = [
  // GET /api/config - Server configuration
  http.get('*/api/config', () => {
    return HttpResponse.json({
      sampleRate: CONFIG.SAMPLE_RATE,
      heartbeatIntervalMs: 30000,
      supportsWebSocket: false, // MSW doesn't support WebSocket
      version: 2,
    });
  }),

  // GET /api/presence - Current presence state
  http.get('*/api/presence', () => {
    return HttpResponse.json(calculatePresence());
  }),

  // POST /api/heartbeat - Register presence heartbeat
  http.post('*/api/heartbeat', async ({ request }) => {
    try {
      const body = (await request.json()) as { sessionId?: string; mood?: string };
      const { sessionId, mood } = body;

      if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
        return HttpResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
      }

      const validMoods: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];
      const validMood: MoodId = validMoods.includes(mood as MoodId) ? (mood as MoodId) : 'presence';

      // Store session
      state.sessions.set(sessionId.slice(0, 8), {
        mood: validMood,
        lastSeen: Date.now(),
      });

      return HttpResponse.json(calculatePresence());
    } catch {
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  // POST /api/leave - Remove session
  http.post('*/api/leave', async ({ request }) => {
    try {
      const body = (await request.json()) as { sessionId?: string };
      const { sessionId } = body;

      if (sessionId) {
        state.sessions.delete(sessionId.slice(0, 8));
      }

      return HttpResponse.json({ success: true });
    } catch {
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),
];

/**
 * Reset mock state (for testing)
 */
export function resetMockState() {
  state.sessions.clear();
  state.baseCount = 42;
}

/**
 * Set base count (for testing different scenarios)
 */
export function setMockBaseCount(count: number) {
  state.baseCount = count;
}
