/**
 * BreathingRoom - Durable Object for real-time presence
 *
 * Handles WebSocket connections for ultra-low-cost presence at scale.
 * All state lives in memory; KV only used for periodic snapshots.
 *
 * Cost model:
 * - No per-message charges (WebSocket is free after connection)
 * - Pay only for duration (~$0.001/GB-second)
 * - 10k users × 15min avg session = ~$8/month
 */

import type { MoodId } from './types';

interface Session {
  id: string;
  mood: MoodId;
  webSocket: WebSocket;
  connectedAt: number;
}

interface PresenceBroadcast {
  type: 'presence';
  count: number;
  moods: Record<MoodId, number>;
  timestamp: number;
}

const VALID_MOODS: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

// Cloudflare Workers global (not in standard DOM types)
declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

export class BreathingRoom {
  private sessions: Map<string, Session> = new Map();
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;

    // Broadcast presence every 5 seconds
    setInterval(() => {
      this.broadcastPresence();
    }, 5000);
  }

  /**
   * Handle incoming HTTP/WebSocket requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST fallback for non-WebSocket clients
    if (url.pathname === '/presence') {
      return this.handlePresenceRequest();
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Handle WebSocket connection
   */
  private handleWebSocket(request: Request): Response {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const mood = url.searchParams.get('mood') as MoodId;

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    const validMood = VALID_MOODS.includes(mood) ? mood : 'presence';

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Accept the WebSocket
    this.state.acceptWebSocket(server);

    // Store session
    const session: Session = {
      id: sessionId,
      mood: validMood,
      webSocket: server,
      connectedAt: Date.now(),
    };
    this.sessions.set(sessionId, session);

    // Send initial presence
    this.sendPresenceTo(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Handle WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as { type: string; mood?: string; sessionId?: string };

      if (data.type === 'mood' && data.sessionId) {
        const session = this.sessions.get(data.sessionId);
        if (session && VALID_MOODS.includes(data.mood as MoodId)) {
          session.mood = data.mood as MoodId;
          // Broadcast updated presence immediately on mood change
          this.broadcastPresence();
        }
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(ws: WebSocket): Promise<void> {
    // Find and remove session
    for (const [id, session] of this.sessions) {
      if (session.webSocket === ws) {
        this.sessions.delete(id);
        break;
      }
    }
    // Broadcast updated presence
    this.broadcastPresence();
  }

  /**
   * Handle WebSocket error
   */
  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /**
   * Calculate current presence state
   */
  private calculatePresence(): PresenceBroadcast {
    const moods: Record<MoodId, number> = {
      gratitude: 0,
      presence: 0,
      release: 0,
      connection: 0,
    };

    for (const session of this.sessions.values()) {
      moods[session.mood]++;
    }

    return {
      type: 'presence',
      count: this.sessions.size,
      moods,
      timestamp: Date.now(),
    };
  }

  /**
   * Send presence to a specific WebSocket
   */
  private sendPresenceTo(ws: WebSocket): void {
    try {
      ws.send(JSON.stringify(this.calculatePresence()));
    } catch (_e) {
      // Connection might be closed
    }
  }

  /**
   * Broadcast presence to all connected clients
   */
  private broadcastPresence(): void {
    const presence = this.calculatePresence();
    const message = JSON.stringify(presence);

    for (const session of this.sessions.values()) {
      try {
        session.webSocket.send(message);
      } catch (_e) {
        // Will be cleaned up on close
      }
    }
  }

  /**
   * REST endpoint for non-WebSocket clients
   */
  private handlePresenceRequest(): Response {
    const presence = this.calculatePresence();
    return new Response(JSON.stringify(presence), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
