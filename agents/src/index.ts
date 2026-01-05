/**
 * Cloudflare Agents SDK - Main Entry Point
 *
 * Exports:
 * - Durable Object classes (required for Wrangler)
 * - Default fetch/scheduled handlers
 *
 * Architecture:
 * - Each agent is a Durable Object with persistent SQLite storage
 * - Router handles HTTP request dispatch
 * - Scheduled handler triggers maintenance pipelines
 */

import type { Env } from './core/types';
import { handleRequest, handleScheduled } from './router';

// ============================================================================
// Durable Object Exports (required by Wrangler)
// ============================================================================

export { ContentAgent } from './agents/content';
export { GitHubAgent } from './agents/github';
export { HealthAgent } from './agents/health';
export { OrchestratorAgent } from './agents/orchestrator';

// ============================================================================
// Worker Handlers
// ============================================================================

export default {
  /**
   * Handle incoming HTTP requests
   */
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },

  /**
   * Handle scheduled (cron) events
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Use waitUntil to ensure scheduled tasks complete even if worker times out
    ctx.waitUntil(handleScheduled(event, env));
  },
};
