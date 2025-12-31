/**
 * Cloudflare Worker - Breathe Together Presence API
 *
 * Simple presence tracking for anonymous users using KV storage.
 * Design goals:
 * - Cheap: Polling-based, minimal KV operations
 * - Simple: Single KV key with all sessions, TTL-based cleanup
 * - Anonymous: Session IDs only, no PII
 *
 * Endpoints:
 * - POST /api/heartbeat - Send presence heartbeat with mood
 * - GET /api/presence - Get current presence stats
 */

import type { MoodId, PresenceSession, PresenceState } from './types';

export interface Env {
  PRESENCE_KV: KVNamespace;
}

// Configuration
const SESSION_TTL_MS = 30_000; // Sessions expire after 30 seconds without heartbeat
const PRESENCE_KEY = 'presence:sessions';

/**
 * Valid mood IDs (must match frontend constants)
 */
const VALID_MOODS: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

/**
 * Get all active sessions from KV
 */
async function getSessions(kv: KVNamespace): Promise<Record<string, PresenceSession>> {
  const data = await kv.get(PRESENCE_KEY, 'json');
  return (data as Record<string, PresenceSession>) || {};
}

/**
 * Prune stale sessions (older than TTL)
 */
function pruneStale(sessions: Record<string, PresenceSession>): Record<string, PresenceSession> {
  const now = Date.now();
  const result: Record<string, PresenceSession> = {};

  for (const [id, session] of Object.entries(sessions)) {
    if (now - session.lastSeen < SESSION_TTL_MS) {
      result[id] = session;
    }
  }

  return result;
}

/**
 * Aggregate presence data from sessions
 */
function aggregatePresence(sessions: Record<string, PresenceSession>): PresenceState {
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
 * Handle heartbeat request
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

    // Get current sessions, prune stale, add/update this session
    const sessions = await getSessions(env.PRESENCE_KV);
    const activeSessions = pruneStale(sessions);

    activeSessions[sessionId] = {
      mood: validMood,
      lastSeen: Date.now(),
    };

    // Write back to KV
    await env.PRESENCE_KV.put(PRESENCE_KEY, JSON.stringify(activeSessions));

    // Return current presence state
    const presence = aggregatePresence(activeSessions);

    return new Response(JSON.stringify(presence), {
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
 * Handle presence request (read-only)
 */
async function handlePresence(env: Env): Promise<Response> {
  try {
    const sessions = await getSessions(env.PRESENCE_KV);
    const activeSessions = pruneStale(sessions);
    const presence = aggregatePresence(activeSessions);

    return new Response(JSON.stringify(presence), {
      headers: { 'Content-Type': 'application/json' },
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
    await env.PRESENCE_KV.put(PRESENCE_KEY, JSON.stringify(activeSessions));

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
};
