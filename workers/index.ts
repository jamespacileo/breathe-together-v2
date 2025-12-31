/**
 * Main Cloudflare Worker Entry Point
 *
 * Handles:
 * 1. API routes (/api/*) for screenshots and other services
 * 2. Static file serving (SPA fallback handled by wrangler.json assets config)
 */

import { handleScreenshotRequest, type Env as ScreenshotEnv } from './screenshots-api';

export interface Env extends ScreenshotEnv {
  // Add additional bindings here as needed
  ASSETS: Fetcher; // Bound automatically by Wrangler for static assets
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      // Screenshots API
      const screenshotResponse = await handleScreenshotRequest(request, env);
      if (screenshotResponse) {
        return screenshotResponse;
      }

      // Add more API handlers here as needed
      // Example:
      // if (url.pathname.startsWith('/api/presence')) {
      //   return handlePresenceRequest(request, env);
      // }

      // No matching API route
      return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // For non-API routes, let Wrangler's asset handler serve static files
    // This is handled automatically via the "assets" config in wrangler.json
    return env.ASSETS.fetch(request);
  },
};
