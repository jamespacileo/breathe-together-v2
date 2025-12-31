/**
 * Cloudflare Worker - Breathe Together Presence API
 *
 * Optimized presence tracking for anonymous users using KV storage.
 *
 * Cost optimizations:
 * - 30s heartbeat interval (3x reduction vs 10s)
 * - Write coalescing (skip writes if mood unchanged)
 * - Edge caching for presence reads (5s cache)
 * - Scheduled cleanup via cron (not per-request)
 *
 * Endpoints:
 * - POST /api/heartbeat - Send presence heartbeat with mood
 * - GET /api/presence - Get current presence stats (cached)
 * - POST /api/leave - Explicit session cleanup
 */

import type { MoodId, PresenceSession, PresenceState } from './types';

export interface Env {
  PRESENCE_KV: KVNamespace;
}

// Configuration
const CONFIG = {
  /** Sessions expire after 90s without heartbeat (3x the 30s heartbeat interval) */
  SESSION_TTL_MS: 90_000,
  /** Minimum time between writes for same session (prevents redundant writes) */
  WRITE_COOLDOWN_MS: 20_000,
  /** Edge cache duration for presence reads */
  CACHE_TTL_SECONDS: 5,
  /** KV keys */
  KEYS: {
    SESSIONS: 'presence:sessions',
    AGGREGATE: 'presence:aggregate',
  },
} as const;

/**
 * Valid mood IDs (must match frontend constants)
 */
const VALID_MOODS: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

/**
 * Session data with write tracking
 */
interface SessionWithMeta extends PresenceSession {
  /** When this session was last written to KV */
  lastWritten?: number;
}

/**
 * Get all active sessions from KV
 */
async function getSessions(kv: KVNamespace): Promise<Record<string, SessionWithMeta>> {
  const data = await kv.get(CONFIG.KEYS.SESSIONS, 'json');
  return (data as Record<string, SessionWithMeta>) || {};
}

/**
 * Prune stale sessions (older than TTL)
 */
function pruneStale(sessions: Record<string, SessionWithMeta>): Record<string, SessionWithMeta> {
  const now = Date.now();
  const result: Record<string, SessionWithMeta> = {};

  for (const [id, session] of Object.entries(sessions)) {
    if (now - session.lastSeen < CONFIG.SESSION_TTL_MS) {
      result[id] = session;
    }
  }

  return result;
}

/**
 * Aggregate presence data from sessions
 */
function aggregatePresence(sessions: Record<string, SessionWithMeta>): PresenceState {
  const moodCounts: Record<MoodId, number> = {
    gratitude: 0,
    presence: 0,
    release: 0,
    connection: 0,
  };

  let totalCount = 0;

  for (const session of Object.values(sessions)) {
    totalCount++;
    if (session.mood && moodCounts[session.mood] !== undefined) {
      moodCounts[session.mood]++;
    }
  }

  return {
    count: totalCount,
    moods: moodCounts,
    timestamp: Date.now(),
  };
}

/**
 * Check if we should write this session update to KV
 * Returns true if:
 * - Session is new, OR
 * - Mood changed, OR
 * - Last write was > WRITE_COOLDOWN_MS ago
 */
function shouldWrite(existing: SessionWithMeta | undefined, newMood: MoodId, now: number): boolean {
  if (!existing) return true; // New session
  if (existing.mood !== newMood) return true; // Mood changed
  if (!existing.lastWritten) return true; // No write timestamp
  return now - existing.lastWritten > CONFIG.WRITE_COOLDOWN_MS; // Cooldown expired
}

/**
 * Handle heartbeat request with write coalescing
 */
async function handleHeartbeat(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { sessionId?: string; mood?: string };
    const { sessionId, mood } = body;

    // Validate session ID
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate mood (optional, defaults to 'presence')
    const validMood: MoodId = VALID_MOODS.includes(mood as MoodId) ? (mood as MoodId) : 'presence';

    const now = Date.now();

    // Get current sessions
    const sessions = await getSessions(env.PRESENCE_KV);
    const existing = sessions[sessionId];

    // Check if we need to write (write coalescing)
    const needsWrite = shouldWrite(existing, validMood, now);

    let activeSessions: Record<string, SessionWithMeta>;

    if (needsWrite) {
      // Prune stale sessions and update this one
      activeSessions = pruneStale(sessions);
      activeSessions[sessionId] = {
        mood: validMood,
        lastSeen: now,
        lastWritten: now,
      };

      // Write back to KV
      await env.PRESENCE_KV.put(CONFIG.KEYS.SESSIONS, JSON.stringify(activeSessions));
    } else {
      // Just update lastSeen in memory for aggregation (no KV write)
      activeSessions = pruneStale(sessions);
      activeSessions[sessionId] = {
        ...existing,
        lastSeen: now,
      };
    }

    // Return current presence state
    const presence = aggregatePresence(activeSessions);

    return new Response(JSON.stringify({ ...presence, written: needsWrite }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Heartbeat error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle presence request with edge caching
 */
async function handlePresence(env: Env): Promise<Response> {
  try {
    const sessions = await getSessions(env.PRESENCE_KV);
    const activeSessions = pruneStale(sessions);
    const presence = aggregatePresence(activeSessions);

    return new Response(JSON.stringify(presence), {
      headers: {
        'Content-Type': 'application/json',
        // Edge cache for 5 seconds - reduces KV reads significantly
        'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL_SECONDS}`,
      },
    });
  } catch (e) {
    console.error('Presence error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle leave request (explicit cleanup when user leaves)
 */
async function handleLeave(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current sessions and remove this one
    const sessions = await getSessions(env.PRESENCE_KV);
    delete sessions[sessionId];

    // Prune stale and write back
    const activeSessions = pruneStale(sessions);
    await env.PRESENCE_KV.put(CONFIG.KEYS.SESSIONS, JSON.stringify(activeSessions));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Leave error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Scheduled cleanup task - prunes stale sessions periodically
 * Configure in wrangler.toml: [triggers] crons = ["* * * * *"]
 */
async function handleScheduled(env: Env): Promise<void> {
  try {
    const sessions = await getSessions(env.PRESENCE_KV);
    const activeSessions = pruneStale(sessions);

    // Only write if we actually pruned something
    if (Object.keys(activeSessions).length !== Object.keys(sessions).length) {
      await env.PRESENCE_KV.put(CONFIG.KEYS.SESSIONS, JSON.stringify(activeSessions));
      console.log(
        `Cleanup: pruned ${Object.keys(sessions).length - Object.keys(activeSessions).length} stale sessions`,
      );
    }
  } catch (e) {
    console.error('Scheduled cleanup error:', e);
  }
}

/**
 * Add CORS headers for cross-origin requests
 */
function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * Main request handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    let response: Response;

    // Route requests
    if (path === '/api/heartbeat' && request.method === 'POST') {
      response = await handleHeartbeat(request, env);
    } else if (path === '/api/presence' && request.method === 'GET') {
      response = await handlePresence(env);
    } else if (path === '/api/leave' && request.method === 'POST') {
      response = await handleLeave(request, env);
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add CORS headers to response
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },

  // Scheduled handler for cleanup
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await handleScheduled(env);
  },
};
