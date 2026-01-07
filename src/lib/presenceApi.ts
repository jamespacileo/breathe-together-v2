/**
 * Presence API Client
 *
 * Type-safe client with Zod runtime validation for the Cloudflare Worker API.
 * Provides compile-time types AND runtime validation of API responses.
 */

import { z } from 'zod';

export { getPresenceApiBaseUrl } from '../config/api';

import { getPresenceApiBaseUrl as getPresenceApiBaseUrlImpl } from '../config/api';

// =============================================================================
// Zod Schemas
// =============================================================================

/** Valid mood identifiers */
export const MoodIdSchema = z.enum(['gratitude', 'presence', 'release', 'connection']);
export type MoodId = z.infer<typeof MoodIdSchema>;

/** Individual user for slot-based rendering */
export const UserSchema = z.object({
  id: z.string(),
  mood: MoodIdSchema,
  /** ISO 3166-1 alpha-2 country code (from Cloudflare geolocation) */
  country: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

/** Mood counts record */
export const MoodCountsSchema = z.object({
  gratitude: z.number(),
  presence: z.number(),
  release: z.number(),
  connection: z.number(),
});

/** Presence state returned by /api/presence and /api/heartbeat */
export const PresenceStateSchema = z.object({
  count: z.number(),
  moods: MoodCountsSchema,
  users: z.array(UserSchema),
  /** Count of users per country (ISO 3166-1 alpha-2 codes) */
  countryCounts: z.record(z.string(), z.number()),
  timestamp: z.number(),
});
export type PresenceState = z.infer<typeof PresenceStateSchema>;

/** Server configuration from /api/config */
export const ServerConfigSchema = z.object({
  sampleRate: z.number().min(0).max(1),
  heartbeatIntervalMs: z.number().positive(),
  supportsWebSocket: z.boolean(),
  version: z.number(),
});
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/** Heartbeat request body */
export const HeartbeatRequestSchema = z.object({
  sessionId: z.string().min(8),
  mood: MoodIdSchema.optional(),
});
export type HeartbeatRequest = z.infer<typeof HeartbeatRequestSchema>;

/** WebSocket presence message (reuses PresenceStateSchema with optional type field) */
export const WsPresenceMessageSchema = PresenceStateSchema.extend({
  type: z.literal('presence').optional(),
});

// =============================================================================
// API Client
// =============================================================================

export class PresenceApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Fetch server configuration
   */
  async getConfig(): Promise<ServerConfig> {
    const response = await this.fetch('/api/config');
    const data = await response.json();
    return ServerConfigSchema.parse(data);
  }

  /**
   * Fetch current presence state
   */
  async getPresence(): Promise<PresenceState> {
    const response = await this.fetch('/api/presence');
    const data = await response.json();
    return PresenceStateSchema.parse(data);
  }

  /**
   * Send heartbeat to register/update presence
   */
  async sendHeartbeat(request: HeartbeatRequest): Promise<PresenceState> {
    // Validate request before sending
    const validated = HeartbeatRequestSchema.parse(request);

    const response = await this.fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });

    const data = await response.json();
    return PresenceStateSchema.parse(data);
  }

  /**
   * Parse incoming WebSocket message
   */
  parseWsMessage(data: string): PresenceState | null {
    try {
      const result = WsPresenceMessageSchema.safeParse(JSON.parse(data));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Get WebSocket URL for real-time connection
   */
  getWsUrl(sessionId: string, mood: MoodId): string {
    const httpUrl = new URL(this.baseUrl);
    const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${httpUrl.host}/api/room?sessionId=${sessionId}&mood=${mood}`;
  }

  /**
   * Internal fetch with error handling
   */
  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  }
}

// =============================================================================
// Default Client Instance
// =============================================================================

export const presenceApi = new PresenceApiClient(getPresenceApiBaseUrlImpl());

// =============================================================================
// Validation Helper
// =============================================================================

/** Validate mood ID at runtime, defaults to 'presence' */
export function validateMood(mood: unknown): MoodId {
  const result = MoodIdSchema.safeParse(mood);
  return result.success ? result.data : 'presence';
}
