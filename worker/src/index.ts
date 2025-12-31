/**
 * Cloudflare Worker - Breathe Together Presence API
 *
 * Hybrid architecture for cost-effective presence at any scale:
 *
 * 1. KV-based (default): Probabilistic sampling for <1000 users
 *    - Simple polling, ~$30/month at 1000 users
 *
 * 2. Durable Objects (opt-in): WebSocket for 1000+ users
 *    - Real-time push, ~$8/month at 10000 users
 *
 * The frontend auto-detects WebSocket support and upgrades.
 */

import type { MoodId, PresenceState } from './types';

// Re-export Durable Object class
export { BreathingRoom } from './BreathingRoom';

export interface Env {
  PRESENCE_KV: KVNamespace;
  BREATHING_ROOM: DurableObjectNamespace;
}

// Configuration
const CONFIG = {
  SAMPLE_RATE: 0.03,
  SAMPLE_TTL_SECONDS: 120,
  DECAY_FACTOR: 0.85,
  CACHE_TTL_SECONDS: 10,
  AGGREGATE_KEY: 'presence:aggregate',
} as const;

const VALID_MOODS: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

// ============================================================================
// KV-based implementation (for smaller scale)
// ============================================================================

interface AggregateState {
  estimatedCount: number;
  sampleCount: number;
  moodRatios: Record<MoodId, number>;
  lastUpdate: number;
  samples: Record<string, { mood: MoodId; ts: number }>;
}

function hashSession(sessionId: string): string {
  return sessionId.slice(0, 8);
}

async function getAggregate(kv: KVNamespace): Promise<AggregateState> {
  const data = await kv.get(CONFIG.AGGREGATE_KEY, 'json');
  if (data) return data as AggregateState;

  return {
    estimatedCount: 0,
    sampleCount: 0,
    moodRatios: { gratitude: 0.25, presence: 0.35, release: 0.25, connection: 0.15 },
    lastUpdate: Date.now(),
    samples: {},
  };
}

function recalculate(state: AggregateState, now: number): AggregateState {
  const cutoff = now - CONFIG.SAMPLE_TTL_SECONDS * 1000;

  const activeSamples: Record<string, { mood: MoodId; ts: number }> = {};
  for (const [slot, sample] of Object.entries(state.samples)) {
    if (sample.ts > cutoff) {
      activeSamples[slot] = sample;
    }
  }

  const moodCounts: Record<MoodId, number> = {
    gratitude: 0,
    presence: 0,
    release: 0,
    connection: 0,
  };
  let sampleCount = 0;

  for (const sample of Object.values(activeSamples)) {
    sampleCount++;
    moodCounts[sample.mood]++;
  }

  const moodRatios: Record<MoodId, number> = { ...state.moodRatios };
  if (sampleCount > 0) {
    for (const mood of VALID_MOODS) {
      const newRatio = moodCounts[mood] / sampleCount;
      moodRatios[mood] = newRatio * 0.7 + state.moodRatios[mood] * 0.3;
    }
  }

  const rawEstimate = sampleCount / CONFIG.SAMPLE_RATE;
  const timeSinceUpdate = (now - state.lastUpdate) / 60000;
  const decayedPrevious = state.estimatedCount * CONFIG.DECAY_FACTOR ** timeSinceUpdate;
  const estimatedCount = Math.round(rawEstimate * 0.6 + decayedPrevious * 0.4);

  return {
    estimatedCount: Math.max(0, estimatedCount),
    sampleCount,
    moodRatios,
    lastUpdate: now,
    samples: activeSamples,
  };
}

function toPresenceState(state: AggregateState): PresenceState {
  const count = state.estimatedCount;
  return {
    count,
    moods: {
      gratitude: Math.round(count * state.moodRatios.gratitude),
      presence: Math.round(count * state.moodRatios.presence),
      release: Math.round(count * state.moodRatios.release),
      connection: Math.round(count * state.moodRatios.connection),
    },
    timestamp: state.lastUpdate,
  };
}

async function handleHeartbeat(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { sessionId?: string; mood?: string };
    const { sessionId, mood } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validMood: MoodId = VALID_MOODS.includes(mood as MoodId) ? (mood as MoodId) : 'presence';
    const now = Date.now();
    const slot = hashSession(sessionId);

    const state = await getAggregate(env.PRESENCE_KV);
    state.samples[slot] = { mood: validMood, ts: now };
    const updated = recalculate(state, now);

    await env.PRESENCE_KV.put(CONFIG.AGGREGATE_KEY, JSON.stringify(updated));

    const presence = toPresenceState(updated);
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

async function handlePresence(env: Env): Promise<Response> {
  try {
    const state = await getAggregate(env.PRESENCE_KV);
    const updated = recalculate(state, Date.now());
    const presence = toPresenceState(updated);

    return new Response(JSON.stringify(presence), {
      headers: {
        'Content-Type': 'application/json',
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

function handleConfig(): Response {
  return new Response(
    JSON.stringify({
      sampleRate: CONFIG.SAMPLE_RATE,
      heartbeatIntervalMs: 30000,
      supportsWebSocket: true,
      version: 2,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}

// ============================================================================
// Durable Object routing
// ============================================================================

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  // Get the single global breathing room
  const roomId = env.BREATHING_ROOM.idFromName('global');
  const room = env.BREATHING_ROOM.get(roomId);
  return room.fetch(request);
}

async function handleRoomPresence(env: Env): Promise<Response> {
  const roomId = env.BREATHING_ROOM.idFromName('global');
  const room = env.BREATHING_ROOM.get(roomId);
  return room.fetch(new Request('https://internal/presence'));
}

// ============================================================================
// Main router
// ============================================================================

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    let response: Response;

    // WebSocket upgrade → Durable Object
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    // REST API routes
    if (path === '/api/heartbeat' && request.method === 'POST') {
      response = await handleHeartbeat(request, env);
    } else if (path === '/api/presence' && request.method === 'GET') {
      // Check if DO-based presence is preferred
      const preferDO = url.searchParams.get('realtime') === 'true';
      response = preferDO ? await handleRoomPresence(env) : await handlePresence(env);
    } else if (path === '/api/config' && request.method === 'GET') {
      response = handleConfig();
    } else if (path === '/api/ws') {
      // WebSocket endpoint info
      response = new Response(
        JSON.stringify({
          url: `wss://${url.host}/api/room`,
          protocol: 'websocket',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    } else if (path === '/api/room') {
      // Direct room access (for WebSocket or REST)
      response = await handleRoomPresence(env);
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add CORS headers
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      headers.set(key, value);
    }

    return new Response(response.body, { status: response.status, headers });
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Cleanup stale KV samples
    try {
      const state = await getAggregate(env.PRESENCE_KV);
      const updated = recalculate(state, Date.now());
      if (Object.keys(updated.samples).length !== Object.keys(state.samples).length) {
        await env.PRESENCE_KV.put(CONFIG.AGGREGATE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Scheduled cleanup error:', e);
    }
  },
};
