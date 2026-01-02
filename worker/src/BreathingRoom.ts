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

import { getEventStats, getRecentEvents, logJoin, logLeave, logMoodChange } from './events';
import {
  getSimulatedMoodCounts,
  getSimulatedUserCount,
  isSimulationEnabled,
  mergeWithSimulatedUsers,
} from './simulation';
import type { MoodId, User } from './types';

/** Active WebSocket session */
interface Session {
  id: string;
  mood: MoodId;
  webSocket: WebSocket;
  connectedAt: number;
}

/** Presence broadcast message */
interface PresenceBroadcast {
  type: 'presence';
  count: number;
  moods: Record<MoodId, number>;
  users: User[];
  timestamp: number;
}

const VALID_MOODS: readonly MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

/** Validate mood, defaulting to 'presence' for invalid values */
function validateMood(mood: unknown): MoodId {
  if (typeof mood === 'string' && VALID_MOODS.includes(mood as MoodId)) {
    return mood as MoodId;
  }
  return 'presence';
}

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
    // Note: Durable Objects manage their own lifecycle, so we don't need to clear the interval
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

    // Admin endpoints
    if (url.pathname === '/admin/users') {
      return this.handleAdminUsersRequest();
    }
    if (url.pathname === '/admin/events') {
      return this.handleAdminEventsRequest(url);
    }
    if (url.pathname === '/admin/stats') {
      return this.handleAdminStatsRequest();
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Handle WebSocket connection
   */
  private handleWebSocket(request: Request): Response {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const moodParam = url.searchParams.get('mood');

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    const validMood = validateMood(moodParam);

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

    // Log join event
    logJoin(sessionId, validMood);

    // Send initial presence
    this.sendPresenceTo(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Handle WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    let data: { type?: string; mood?: string; sessionId?: string };
    try {
      data = JSON.parse(message);
    } catch {
      console.error('WebSocket: invalid JSON message');
      return;
    }

    try {
      if (data.type === 'mood' && data.sessionId) {
        const session = this.sessions.get(data.sessionId);
        const validMood = validateMood(data.mood);
        if (session) {
          const previousMood = session.mood;
          if (previousMood !== validMood) {
            logMoodChange(session.id, previousMood, validMood);
          }
          session.mood = validMood;
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
        logLeave(id, session.mood);
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
   * Merges with simulated users when simulation is enabled
   */
  private calculatePresence(): PresenceBroadcast {
    const realMoods: Record<MoodId, number> = {
      gratitude: 0,
      presence: 0,
      release: 0,
      connection: 0,
    };

    // Build real users array
    const realUsers: User[] = [];

    for (const session of this.sessions.values()) {
      realMoods[session.mood]++;
      realUsers.push({ id: session.id, mood: session.mood });
    }

    // Sort by ID for deterministic ordering (all clients see same positions)
    realUsers.sort((a, b) => a.id.localeCompare(b.id));

    // Merge with simulated users if enabled
    const users = mergeWithSimulatedUsers(realUsers);

    // Calculate total count and moods (real + simulated)
    const simulatedCount = isSimulationEnabled() ? getSimulatedUserCount() : 0;
    const simMoods = getSimulatedMoodCounts();

    return {
      type: 'presence',
      count: this.sessions.size + simulatedCount,
      moods: {
        gratitude: realMoods.gratitude + simMoods.gratitude,
        presence: realMoods.presence + simMoods.presence,
        release: realMoods.release + simMoods.release,
        connection: realMoods.connection + simMoods.connection,
      },
      users,
      timestamp: Date.now(),
    };
  }

  /**
   * Send presence to a specific WebSocket
   */
  private sendPresenceTo(ws: WebSocket): void {
    try {
      ws.send(JSON.stringify(this.calculatePresence()));
    } catch {
      // Connection might be closed, will be cleaned up on close event
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
      } catch {
        // Will be cleaned up on close event
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

  /**
   * Admin endpoint: Get current users with order and connection time
   */
  private handleAdminUsersRequest(): Response {
    const users = Array.from(this.sessions.values())
      .map((session, index) => ({
        order: index + 1,
        id: session.id,
        mood: session.mood,
        connectedAt: session.connectedAt,
        durationMs: Date.now() - session.connectedAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return new Response(
      JSON.stringify({
        count: users.length,
        users,
        timestamp: Date.now(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  /**
   * Admin endpoint: Get recent events
   */
  private handleAdminEventsRequest(url: URL): Response {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const events = getRecentEvents(limit);

    return new Response(
      JSON.stringify({
        count: events.length,
        events,
        timestamp: Date.now(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  /**
   * Admin endpoint: Get event statistics
   */
  private handleAdminStatsRequest(): Response {
    const stats = getEventStats();
    const presence = this.calculatePresence();

    return new Response(
      JSON.stringify({
        ...stats,
        currentUsers: this.sessions.size,
        presence,
        timestamp: Date.now(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
