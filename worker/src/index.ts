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

import {
  type AggregateState,
  addSample,
  createInitialState,
  PRESENCE_CONFIG,
  recalculate,
  toPresenceState,
  validateMood,
} from './presence';

// Re-export Durable Object class
export { BreathingRoom } from './BreathingRoom';

export interface Env {
  PRESENCE_KV: KVNamespace;
  BREATHING_ROOM: DurableObjectNamespace;
}

const AGGREGATE_KEY = 'presence:aggregate';
const CACHE_TTL_SECONDS = 10;

// ============================================================================
// KV Operations
// ============================================================================

async function getAggregate(kv: KVNamespace): Promise<AggregateState> {
  const data = await kv.get(AGGREGATE_KEY, 'json');
  if (data) return data as AggregateState;
  return createInitialState();
}

async function saveAggregate(kv: KVNamespace, state: AggregateState): Promise<void> {
  await kv.put(AGGREGATE_KEY, JSON.stringify(state));
}

// ============================================================================
// Request Handlers
// ============================================================================

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

    const validMood = validateMood(mood);
    const now = Date.now();

    const state = await getAggregate(env.PRESENCE_KV);
    const updated = addSample(state, sessionId, validMood, now);
    await saveAggregate(env.PRESENCE_KV, updated);

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
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
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
      sampleRate: PRESENCE_CONFIG.SAMPLE_RATE,
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
// Durable Object Routing
// ============================================================================

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const roomId = env.BREATHING_ROOM.idFromName('global');
  const room = env.BREATHING_ROOM.get(roomId);
  return room.fetch(request);
}

async function handleRoomPresence(env: Env): Promise<Response> {
  const roomId = env.BREATHING_ROOM.idFromName('global');
  const room = env.BREATHING_ROOM.get(roomId);
  return room.fetch(new Request('https://internal/presence'));
}

async function handleAdminRequest(request: Request, env: Env, path: string): Promise<Response> {
  const roomId = env.BREATHING_ROOM.idFromName('global');
  const room = env.BREATHING_ROOM.get(roomId);
  // Forward the request with the original URL to preserve query params
  const url = new URL(request.url);
  return room.fetch(new Request(`https://internal${path}${url.search}`));
}

// ============================================================================
// CORS & Routing
// ============================================================================

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
  };
}

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // WebSocket upgrade → Durable Object
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    let response: Response;

    // REST API routes
    switch (true) {
      case path === '/api/heartbeat' && request.method === 'POST':
        response = await handleHeartbeat(request, env);
        break;

      case path === '/api/presence' && request.method === 'GET':
        response =
          url.searchParams.get('realtime') === 'true'
            ? await handleRoomPresence(env)
            : await handlePresence(env);
        break;

      case path === '/api/config' && request.method === 'GET':
        response = handleConfig();
        break;

      case path === '/api/ws' && request.method === 'GET':
        response = new Response(
          JSON.stringify({
            url: `wss://${url.host}/api/room`,
            protocol: 'websocket',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
        break;

      case path === '/api/room':
        response = await handleRoomPresence(env);
        break;

      // Admin endpoints (forwarded to Durable Object)
      case path === '/admin/users' && request.method === 'GET':
      case path === '/admin/events' && request.method === 'GET':
      case path === '/admin/stats' && request.method === 'GET':
      case path === '/admin/inspirational' && request.method === 'GET':
        response = await handleAdminRequest(request, env, path);
        break;

      default:
        response = new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return addCorsHeaders(response);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const state = await getAggregate(env.PRESENCE_KV);
      const updated = recalculate(state, Date.now());

      // Only write if samples changed
      if (Object.keys(updated.samples).length !== Object.keys(state.samples).length) {
        await saveAggregate(env.PRESENCE_KV, updated);
      }
    } catch (e) {
      console.error('Scheduled cleanup error:', e);
    }
  },
};
