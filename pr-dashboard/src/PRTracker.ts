/**
 * PRTracker Durable Object
 * Manages WebSocket connections for real-time PR updates
 */

import { fetchOpenPRs } from './github';
import type { Env, PullRequest, WSMessage } from './types';

interface Session {
  webSocket: WebSocket;
  connectedAt: number;
}

export class PRTracker implements DurableObject {
  private sessions: Map<string, Session> = new Map();
  private cachedPRs: PullRequest[] = [];
  private lastFetch: number = 0;
  private env: Env;

  constructor(
    private state: DurableObjectState,
    env: Env,
  ) {
    this.env = env;

    // Restore state
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<PullRequest[]>('prs');
      if (stored) {
        this.cachedPRs = stored;
      }
      const lastFetch = await this.state.storage.get<number>('lastFetch');
      if (lastFetch) {
        this.lastFetch = lastFetch;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    switch (url.pathname) {
      case '/prs':
        return this.handleGetPRs();
      case '/refresh':
        return this.handleRefresh();
      case '/webhook':
        return this.handleWebhook(request);
      case '/stats':
        return this.handleStats();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const sessionId = crypto.randomUUID();

    server.accept();

    this.sessions.set(sessionId, {
      webSocket: server,
      connectedAt: Date.now(),
    });

    // Send initial state
    const connectMessage: WSMessage = {
      type: 'connected',
      data: this.cachedPRs,
      timestamp: new Date().toISOString(),
    };
    server.send(JSON.stringify(connectMessage));

    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string);
        if (message.type === 'ping') {
          server.send(
            JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
            }),
          );
        }
      } catch (_e) {
        // Ignore parse errors
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });

    server.addEventListener('error', () => {
      this.sessions.delete(sessionId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleGetPRs(): Promise<Response> {
    const CACHE_TTL = 30 * 1000; // 30 seconds

    // Refresh if cache is stale
    if (Date.now() - this.lastFetch > CACHE_TTL) {
      await this.refreshPRs();
    }

    return new Response(
      JSON.stringify({
        prs: this.cachedPRs,
        lastUpdated: new Date(this.lastFetch).toISOString(),
        repoUrl: `https://github.com/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private async handleRefresh(): Promise<Response> {
    await this.refreshPRs();
    return new Response(JSON.stringify({ success: true, count: this.cachedPRs.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebhook(request: Request): Promise<Response> {
    // Webhook already verified in main worker
    const payload = await request.json();
    await this.processWebhookPayload(payload);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleStats(): Promise<Response> {
    return new Response(
      JSON.stringify({
        connectedClients: this.sessions.size,
        cachedPRCount: this.cachedPRs.length,
        lastFetch: new Date(this.lastFetch).toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private async refreshPRs(): Promise<void> {
    try {
      const prs = await fetchOpenPRs(this.env);
      const previousPRs = new Map(this.cachedPRs.map((pr) => [pr.number, pr]));

      // Detect changes
      for (const pr of prs) {
        const previous = previousPRs.get(pr.number);
        if (!previous) {
          // New PR
          this.broadcast({
            type: 'pr_new',
            data: pr,
            timestamp: new Date().toISOString(),
          });
        } else if (pr.updatedAt !== previous.updatedAt) {
          // Updated PR
          this.broadcast({
            type: 'pr_update',
            data: pr,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Detect closed PRs
      const currentNumbers = new Set(prs.map((pr) => pr.number));
      for (const [number, pr] of previousPRs) {
        if (!currentNumbers.has(number)) {
          this.broadcast({
            type: 'pr_closed',
            data: pr,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.cachedPRs = prs;
      this.lastFetch = Date.now();

      // Persist state
      await this.state.storage.put('prs', prs);
      await this.state.storage.put('lastFetch', this.lastFetch);
    } catch (error) {
      console.error('Failed to refresh PRs:', error);
    }
  }

  private async processWebhookPayload(payload: unknown): Promise<void> {
    // Trigger a refresh on webhook events
    await this.refreshPRs();
  }

  private broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);

    for (const [sessionId, session] of this.sessions) {
      try {
        session.webSocket.send(data);
      } catch (_e) {
        // Remove dead connections
        this.sessions.delete(sessionId);
      }
    }
  }
}
