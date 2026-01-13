/**
 * PR Tracking Dashboard - Cloudflare Worker
 *
 * A dashboard for tracking open PRs with real-time updates,
 * useful links (preview, CF dashboard, Claude Code), and web notifications.
 */

import { generateDashboardHTML, generateServiceWorkerJS } from './dashboard';
import { fetchOpenPRs, verifyWebhookSignature } from './github';
import type { Env, PushSubscription, WebhookPayload } from './types';

// Re-export Durable Object class
export { PRTracker } from './PRTracker';

// KV keys
const PUSH_SUBSCRIPTIONS_KEY = 'push:subscriptions';

// ============================================================================
// Request Handlers
// ============================================================================

async function handleDashboard(env: Env): Promise<Response> {
  const html = generateDashboardHTML({
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    project: env.CLOUDFLARE_PROJECT,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    vapidPublicKey: env.VAPID_PUBLIC_KEY,
    refreshInterval: 30000,
  });

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleServiceWorker(): Promise<Response> {
  return new Response(generateServiceWorkerJS(), {
    headers: { 'Content-Type': 'application/javascript' },
  });
}

async function handleGetPRs(env: Env): Promise<Response> {
  const trackerId = env.PR_TRACKER.idFromName('main');
  const tracker = env.PR_TRACKER.get(trackerId);
  return tracker.fetch(new Request('https://internal/prs'));
}

async function handleRefresh(env: Env): Promise<Response> {
  const trackerId = env.PR_TRACKER.idFromName('main');
  const tracker = env.PR_TRACKER.get(trackerId);
  return tracker.fetch(new Request('https://internal/refresh', { method: 'POST' }));
}

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const trackerId = env.PR_TRACKER.idFromName('main');
  const tracker = env.PR_TRACKER.get(trackerId);
  return tracker.fetch(request);
}

async function handleStats(env: Env): Promise<Response> {
  const trackerId = env.PR_TRACKER.idFromName('main');
  const tracker = env.PR_TRACKER.get(trackerId);
  return tracker.fetch(new Request('https://internal/stats'));
}

async function handleGitHubWebhook(request: Request, env: Env): Promise<Response> {
  // Verify signature
  const signature = request.headers.get('X-Hub-Signature-256');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.text();

  if (!(await verifyWebhookSignature(body, signature, env.GITHUB_WEBHOOK_SECRET))) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = JSON.parse(body) as WebhookPayload;
  const event = request.headers.get('X-GitHub-Event');

  console.log(`Received webhook: ${event}, action: ${payload.action}`);

  // Forward to Durable Object for processing
  const trackerId = env.PR_TRACKER.idFromName('main');
  const tracker = env.PR_TRACKER.get(trackerId);
  await tracker.fetch(
    new Request('https://internal/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  // Send push notifications for relevant events
  if (event === 'pull_request' && payload.pull_request) {
    const pr = payload.pull_request;
    const action = payload.action;

    if (action === 'opened' || action === 'reopened') {
      await sendPushNotification(env, {
        title: `New PR #${pr.number}`,
        body: pr.title,
        url: pr.html_url,
        tag: `pr-${pr.number}`,
      });
    } else if (action === 'review_requested') {
      await sendPushNotification(env, {
        title: `Review Requested: PR #${pr.number}`,
        body: pr.title,
        url: pr.html_url,
        tag: `pr-${pr.number}-review`,
      });
    }
  }

  if (event === 'pull_request_review' && payload.review && payload.pull_request) {
    const pr = payload.pull_request;
    const review = payload.review;

    if (review.state === 'approved') {
      await sendPushNotification(env, {
        title: `PR #${pr.number} Approved`,
        body: `${review.user.login} approved: ${pr.title}`,
        url: pr.html_url,
        tag: `pr-${pr.number}-approved`,
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handlePushSubscribe(request: Request, env: Env): Promise<Response> {
  try {
    const subscription = (await request.json()) as PushSubscription;

    // Get existing subscriptions
    const stored = await env.PR_CACHE.get(PUSH_SUBSCRIPTIONS_KEY, 'json');
    const subscriptions: PushSubscription[] = (stored as PushSubscription[]) || [];

    // Check if already subscribed (by endpoint)
    const exists = subscriptions.some((s) => s.endpoint === subscription.endpoint);
    if (!exists) {
      subscription.createdAt = new Date().toISOString();
      subscription.preferences = {
        newPR: true,
        reviewRequested: true,
        ciStatusChange: true,
        prApproved: true,
        prMerged: true,
      };
      subscriptions.push(subscription);
      await env.PR_CACHE.put(PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return new Response(JSON.stringify({ error: 'Invalid subscription' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handlePushUnsubscribe(request: Request, env: Env): Promise<Response> {
  try {
    const { endpoint } = (await request.json()) as { endpoint: string };

    const stored = await env.PR_CACHE.get(PUSH_SUBSCRIPTIONS_KEY, 'json');
    const subscriptions: PushSubscription[] = (stored as PushSubscription[]) || [];

    const filtered = subscriptions.filter((s) => s.endpoint !== endpoint);
    await env.PR_CACHE.put(PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(filtered));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleConfig(env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      project: env.CLOUDFLARE_PROJECT,
      vapidPublicKey: env.VAPID_PUBLIC_KEY || null,
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
// Push Notification Helper
// ============================================================================

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

async function sendPushNotification(env: Env, payload: PushPayload): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return; // Push not configured
  }

  const stored = await env.PR_CACHE.get(PUSH_SUBSCRIPTIONS_KEY, 'json');
  const subscriptions: PushSubscription[] = (stored as PushSubscription[]) || [];

  if (subscriptions.length === 0) {
    return;
  }

  // Send to all subscriptions
  // Note: In production, use web-push library or a push service
  // For CF Workers, we'd need to implement the Web Push Protocol
  // This is a simplified version that logs the intent
  console.log(`Would send push to ${subscriptions.length} subscribers:`, payload);

  // TODO: Implement actual Web Push Protocol
  // This requires:
  // 1. Creating a JWT with VAPID keys
  // 2. Encrypting the payload using the subscription keys
  // 3. Sending HTTP/2 request to the push service endpoint
  //
  // Consider using a service like Cloudflare Queues + a push worker
  // or an external push notification service
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

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    let response: Response;

    try {
      switch (true) {
        // Dashboard
        case path === '/' && request.method === 'GET':
          response = await handleDashboard(env);
          break;

        // Service worker
        case path === '/sw.js' && request.method === 'GET':
          response = await handleServiceWorker();
          break;

        // API routes
        case path === '/api/prs' && request.method === 'GET':
          response = await handleGetPRs(env);
          break;

        case path === '/api/refresh' && request.method === 'POST':
          response = await handleRefresh(env);
          break;

        case path === '/api/ws' && request.method === 'GET':
          // WebSocket info endpoint
          response = new Response(
            JSON.stringify({
              url: `wss://${url.host}/api/ws`,
              protocol: 'websocket',
            }),
            { headers: { 'Content-Type': 'application/json' } },
          );
          break;

        case path === '/api/config' && request.method === 'GET':
          response = await handleConfig(env);
          break;

        case path === '/api/stats' && request.method === 'GET':
          response = await handleStats(env);
          break;

        // GitHub webhook
        case path === '/webhook/github' && request.method === 'POST':
          response = await handleGitHubWebhook(request, env);
          break;

        // Push subscription management
        case path === '/api/push/subscribe' && request.method === 'POST':
          response = await handlePushSubscribe(request, env);
          break;

        case path === '/api/push/unsubscribe' && request.method === 'POST':
          response = await handlePushUnsubscribe(request, env);
          break;

        // Static assets (placeholder)
        case path === '/icon.png' || path === '/badge.png':
          // Return a simple placeholder or 404
          response = new Response(null, { status: 404 });
          break;

        default:
          response = new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Request error:', error);
      response = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return addCorsHeaders(response);
  },
};
