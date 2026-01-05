/**
 * Router - HTTP request routing for the Agents service
 *
 * Routes:
 *   GET  /                        - Service info
 *   GET  /agents                  - List all agents with state
 *   GET  /agents/:type/...        - Forward to specific agent
 *   POST /agents/:type/tasks      - Create task on agent
 *   GET  /pipelines               - List available pipelines
 *   POST /pipelines/run           - Trigger pipeline execution
 *   GET  /health                  - Quick health status
 */

import {
  forwardToAgent,
  getAllAgentStates,
  isValidAgentType,
  parseAgentType,
} from './core/registry';
import type { Env, ScheduleType } from './core/types';
import { PIPELINES } from './pipelines';
import { DASHBOARD_HTML } from './ui';

// ============================================================================
// CORS Handling
// ============================================================================

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

// ============================================================================
// Route Handlers
// ============================================================================

async function handleRoot(env: Env): Promise<Response> {
  return jsonResponse({
    service: 'breathe-together-agents',
    version: '1.0.0',
    environment: env.ENVIRONMENT,
    endpoints: {
      agents: '/agents',
      pipelines: '/pipelines',
      health: '/health',
    },
    documentation: 'https://github.com/jamespacileo/breathe-together-v2/tree/main/agents',
  });
}

async function handleAgentList(env: Env): Promise<Response> {
  const agentStates = await getAllAgentStates(env);
  return jsonResponse({
    agents: agentStates,
    timestamp: Date.now(),
  });
}

async function handleAgentRoute(
  request: Request,
  env: Env,
  agentType: string,
  subPath: string,
): Promise<Response> {
  try {
    const type = parseAgentType(agentType);

    // Forward the request to the agent
    const response = await forwardToAgent(env, type, subPath, {
      method: request.method,
      body: request.method !== 'GET' ? await request.json().catch(() => undefined) : undefined,
    });

    return withCors(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 400);
  }
}

async function handlePipelineList(): Promise<Response> {
  return jsonResponse({
    pipelines: PIPELINES.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      steps: p.steps.length,
      schedule: p.schedule,
    })),
  });
}

async function handlePipelineRun(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { pipelineId: string };

    if (!body.pipelineId) {
      return jsonResponse({ error: 'pipelineId required' }, 400);
    }

    // Forward to orchestrator
    const response = await forwardToAgent(env, 'orchestrator', '/pipelines/run', {
      method: 'POST',
      body: { pipelineId: body.pipelineId },
    });

    return withCors(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
}

async function handleHealthCheck(env: Env): Promise<Response> {
  // Quick health check - just verify agents are responding
  try {
    const states = await getAllAgentStates(env);
    const allHealthy = states.every((s) => {
      const state = s.state as Record<string, unknown>;
      return !('error' in state);
    });

    return jsonResponse({
      status: allHealthy ? 'healthy' : 'degraded',
      agents: states.map((s) => {
        const state = s.state as Record<string, unknown>;
        return {
          type: s.type,
          status: 'error' in state ? 'error' : 'ok',
        };
      }),
      timestamp: Date.now(),
    });
  } catch (error) {
    return jsonResponse(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      503,
    );
  }
}

// ============================================================================
// Main Router
// ============================================================================

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTTP router requires branching for each route pattern
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // Route matching
  try {
    // Dashboard UI
    if ((path === '/ui' || path === '/dashboard') && request.method === 'GET') {
      return new Response(DASHBOARD_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Root - redirect to dashboard
    if (path === '/' && request.method === 'GET') {
      return Response.redirect(new URL('/ui', request.url).toString(), 302);
    }

    // API info
    if (path === '/api' && request.method === 'GET') {
      return handleRoot(env);
    }

    // Health check
    if (path === '/health' && request.method === 'GET') {
      return handleHealthCheck(env);
    }

    // Agent list
    if (path === '/agents' && request.method === 'GET') {
      return handleAgentList(env);
    }

    // Agent-specific routes: /agents/:type/...
    const agentMatch = path.match(/^\/agents\/([^/]+)(\/.*)?$/);
    if (agentMatch) {
      const [, agentType, subPath = ''] = agentMatch;
      if (isValidAgentType(agentType)) {
        return handleAgentRoute(request, env, agentType, subPath || '/');
      }
      return jsonResponse({ error: `Unknown agent type: ${agentType}` }, 404);
    }

    // Pipeline list
    if (path === '/pipelines' && request.method === 'GET') {
      return handlePipelineList();
    }

    // Pipeline runs (forward to orchestrator)
    if (path === '/pipelines/runs' && request.method === 'GET') {
      return handleAgentRoute(request, env, 'orchestrator', '/pipelines/runs');
    }

    // Trigger pipeline
    if (path === '/pipelines/run' && request.method === 'POST') {
      return handlePipelineRun(request, env);
    }

    // Pipeline run status
    const runMatch = path.match(/^\/pipelines\/runs\/([^/]+)$/);
    if (runMatch && request.method === 'GET') {
      return handleAgentRoute(request, env, 'orchestrator', `/pipelines/runs/${runMatch[1]}`);
    }

    // Not found
    return jsonResponse({ error: 'Not found', path }, 404);
  } catch (error) {
    console.error('Router error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
}

// ============================================================================
// Scheduled Event Handler
// ============================================================================

export async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const cron = event.cron;
  console.log(`[Scheduled] Cron triggered: ${cron}`);

  // Map cron to schedule type
  let _scheduleType: ScheduleType;
  let pipelineId: string | null = null;

  switch (cron) {
    case '*/15 * * * *':
      _scheduleType = 'health-quick';
      // Quick health check - direct task
      await forwardToAgent(env, 'health', '/tasks', {
        method: 'POST',
        body: { name: 'runHealthScan', payload: { quick: true } },
      });
      return;

    case '0 */6 * * *':
      _scheduleType = 'health-full';
      pipelineId = 'comprehensive-health';
      break;

    case '0 4 * * *':
      _scheduleType = 'maintenance-daily';
      pipelineId = 'daily-maintenance';
      break;

    case '0 3 * * 0':
      _scheduleType = 'maintenance-weekly';
      pipelineId = 'weekly-maintenance';
      break;

    case '*/5 * * * *':
      _scheduleType = 'github-refresh';
      // GitHub PR status refresh - direct task
      await forwardToAgent(env, 'github', '/tasks', {
        method: 'POST',
        body: { name: 'refreshPRData', payload: {} },
      });
      return;

    default:
      console.warn(`[Scheduled] Unknown cron: ${cron}`);
      return;
  }

  // Trigger pipeline if mapped
  if (pipelineId) {
    console.log(`[Scheduled] Triggering pipeline: ${pipelineId}`);
    await forwardToAgent(env, 'orchestrator', '/pipelines/run', {
      method: 'POST',
      body: { pipelineId },
    });
  }
}
