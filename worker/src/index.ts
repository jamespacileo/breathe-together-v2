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
  getAdminBatchState,
  getCurrentInspirationMessage,
  initializeInspirational,
  rotateInspirationalOnSchedule,
  setUserOverride,
} from './inspirational';
import { generateInspirationalMessages } from './llm';
import type { GenerationRequest } from './llm-config';
import { loadLLMConfig } from './llm-config';
import {
  type AggregateState,
  addSample,
  createInitialState,
  PRESENCE_CONFIG,
  recalculate,
  toPresenceState,
  validateMood,
} from './presence';
import type { InspirationMessage, UserTextOverride } from './types/inspirational';

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

async function handleInspirationText(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId') ?? undefined;
    const skipCache = url.searchParams.get('skipCache') === 'true';

    // Advance rotation if needed (probabilistic to reduce KV writes)
    if (Math.random() < 0.1) {
      // 10% of requests trigger rotation check
      await rotateInspirationalOnSchedule(env.PRESENCE_KV);
    }

    const message = await getCurrentInspirationMessage(env.PRESENCE_KV, sessionId);

    const cacheControl = skipCache
      ? 'private, no-cache'
      : `public, max-age=${Math.ceil(message.cacheMaxAge)}`;

    return new Response(JSON.stringify(message), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
      },
    });
  } catch (e) {
    console.error('Inspirational text error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleCreateTextOverride(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      type: 'tutorial' | 'first-time-flow' | 'custom' | 'seasonal';
      messages: InspirationMessage[];
      durationMinutes: number;
      reason?: string;
    };

    const { sessionId, type, messages, durationMinutes, reason } = body;

    // Validate request
    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create override
    const override: UserTextOverride = {
      sessionId,
      type,
      messages,
      currentIndex: 0,
      expiresAt: Date.now() + durationMinutes * 60 * 1000,
      isComplete: false,
      reason,
    };

    await setUserOverride(env.PRESENCE_KV, sessionId, override);

    return new Response(JSON.stringify({ success: true, override }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Override creation error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleGenerateInspirationalMessages(request: Request, env: Env): Promise<Response> {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: Request body can contain various generation types (messages or story)
    const body = (await request.json()) as any;

    const { theme, intensity, type, recentMessageIds, narrativeContext } = body;

    // Extract count based on generation type
    let count: number;
    let messageCount: number | undefined;
    let storyType: string | undefined;

    if (type === 'story') {
      messageCount = body.messageCount;
      storyType = body.storyType;
      count = messageCount || 6; // Default to 6 messages per story

      // Validate story-specific params
      if (!messageCount || messageCount < 3 || messageCount > 12) {
        return new Response(JSON.stringify({ error: 'Invalid messageCount for story (3-12)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!['complete-arc', 'beginning', 'middle', 'end'].includes(storyType)) {
        return new Response(JSON.stringify({ error: 'Invalid storyType' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      count = body.count || 32;

      // Validate message count
      if (!count || count < 1 || count > 64) {
        return new Response(JSON.stringify({ error: 'Invalid count for messages (1-64)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate common params
    if (!theme || !intensity) {
      return new Response(JSON.stringify({ error: 'Missing theme or intensity' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load LLM config
    const llmConfig = loadLLMConfig(env);

    // Build generation request with context
    const generationRequest: GenerationRequest = {
      theme,
      intensity,
      count,
      type: type || 'messages',
      recentMessageIds: Array.isArray(recentMessageIds) ? recentMessageIds : undefined,
      narrativeContext: typeof narrativeContext === 'string' ? narrativeContext : undefined,
    };

    // Add story-specific params if applicable
    if (type === 'story') {
      // biome-ignore lint/suspicious/noExplicitAny: messageCount and storyType only on StoryGenerationRequest
      (generationRequest as any).messageCount = messageCount;
      // biome-ignore lint/suspicious/noExplicitAny: messageCount and storyType only on StoryGenerationRequest
      (generationRequest as any).storyType = storyType;
    }

    // Generate messages
    const batch = await generateInspirationalMessages(llmConfig, generationRequest);

    // Store batch in KV for future use
    const batchKey = `inspiration:batch:${batch.id}`;
    await env.PRESENCE_KV.put(batchKey, JSON.stringify(batch));

    return new Response(JSON.stringify({ success: true, batch }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Message generation error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetInspirationBatches(env: Env): Promise<Response> {
  try {
    const adminState = await getAdminBatchState(env.PRESENCE_KV);

    // Fetch the current batch for the "currentBatch" field
    const currentBatch = await env.PRESENCE_KV.get(
      `inspiration:batch:${adminState.currentBatchId}`,
      'json',
    );

    return new Response(
      JSON.stringify({
        currentBatchId: adminState.currentBatchId,
        currentMessageIndex: adminState.currentIndex,
        nextRotationTime: new Date(adminState.nextRotationTimeISO).getTime(),
        nextRotationTimeISO: adminState.nextRotationTimeISO,
        timeUntilNextRotation: adminState.timeUntilNextRotation,
        totalCycles: adminState.totalCycles,
        batchStartedAtISO: adminState.batchStartedAtISO,
        recentHistory: adminState.recentHistory,
        currentBatch: currentBatch || null,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error('Get batches error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleEditMessage(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      batchId: string;
      messageIndex: number;
      top: string;
      bottom: string;
    };

    const { batchId, messageIndex, top, bottom } = body;

    if (!batchId || messageIndex < 0 || !top || !bottom) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // biome-ignore lint/suspicious/noExplicitAny: KV returns untyped data
    const batchData = (await env.PRESENCE_KV.get(`inspiration:batch:${batchId}`, 'json')) as any;
    if (!batchData) {
      return new Response(JSON.stringify({ error: 'Batch not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const batch = batchData;
    if (messageIndex >= batch.messages.length) {
      return new Response(JSON.stringify({ error: 'Message index out of range' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    batch.messages[messageIndex].top = top;
    batch.messages[messageIndex].bottom = bottom;

    await env.PRESENCE_KV.put(`inspiration:batch:${batchId}`, JSON.stringify(batch));

    return new Response(JSON.stringify({ success: true, message: batch.messages[messageIndex] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Edit message error:', e);
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

    // Initialize inspirational text system on first request
    try {
      await initializeInspirational(env.PRESENCE_KV);
    } catch (e) {
      console.error('Failed to initialize inspirational text:', e);
    }

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

      case path === '/api/inspirational' && request.method === 'GET':
        response = await handleInspirationText(request, env);
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

      // Admin inspirational text endpoints
      case path === '/admin/inspirational' && request.method === 'GET':
        response = await handleGetInspirationBatches(env);
        break;

      case path === '/admin/inspirational/override' && request.method === 'POST':
        response = await handleCreateTextOverride(request, env);
        break;

      case path === '/admin/inspirational/generate' && request.method === 'POST':
        response = await handleGenerateInspirationalMessages(request, env);
        break;

      case path === '/admin/inspirational/message' && request.method === 'POST':
        response = await handleEditMessage(request, env);
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

      // Rotate inspirational messages if needed
      await rotateInspirationalOnSchedule(env.PRESENCE_KV);
    } catch (e) {
      console.error('Scheduled cleanup error:', e);
    }
  },
};
