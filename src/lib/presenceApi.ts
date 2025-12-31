/**
 * Presence API Client
 *
 * Type-safe client with Zod runtime validation for the Cloudflare Worker API.
 * Provides compile-time types AND runtime validation of API responses.
 */

import { z } from 'zod';

// =============================================================================
// Zod Schemas
// =============================================================================

/** Valid mood identifiers */
export const MoodIdSchema = z.enum(['gratitude', 'presence', 'release', 'connection']);
export type MoodId = z.infer<typeof MoodIdSchema>;

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

/** Error response */
export const ErrorResponseSchema = z.object({
  error: z.string(),
});

/** WebSocket presence message */
export const WsPresenceMessageSchema = z.object({
  type: z.literal('presence').optional(),
  count: z.number(),
  moods: MoodCountsSchema,
  timestamp: z.number(),
});

// =============================================================================
// API Client
// =============================================================================

export interface PresenceApiConfig {
  baseUrl: string;
  onError?: (error: Error) => void;
}

export class PresenceApiClient {
  private baseUrl: string;
  private onError?: (error: Error) => void;

  constructor(config: PresenceApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.onError = config.onError;
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
   * Notify server that user is leaving
   */
  async leave(sessionId: string): Promise<void> {
    await this.fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  }

  /**
   * Parse incoming WebSocket message
   */
  parseWsMessage(data: string): PresenceState | null {
    try {
      const parsed = JSON.parse(data);
      const result = WsPresenceMessageSchema.safeParse(parsed);
      if (result.success) {
        return {
          count: result.data.count,
          moods: result.data.moods,
          timestamp: result.data.timestamp,
        };
      }
      return null;
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
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, init);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const parsed = ErrorResponseSchema.safeParse(errorData);
        const message = parsed.success ? parsed.data.error : `HTTP ${response.status}`;
        throw new PresenceApiError(message, response.status);
      }

      return response;
    } catch (error) {
      if (error instanceof PresenceApiError) {
        this.onError?.(error);
        throw error;
      }

      const apiError = new PresenceApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
      );
      this.onError?.(apiError);
      throw apiError;
    }
  }
}

/**
 * API Error with status code
 */
export class PresenceApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'PresenceApiError';
  }
}

// =============================================================================
// Default Client Instance
// =============================================================================

const DEFAULT_BASE_URL = import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787';

/** Default API client instance */
export const presenceApi = new PresenceApiClient({
  baseUrl: DEFAULT_BASE_URL,
  onError: (error) => {
    console.warn('Presence API error:', error.message);
  },
});

// =============================================================================
// Validation Helpers
// =============================================================================

/** Validate mood ID at runtime */
export function validateMood(mood: unknown): MoodId {
  const result = MoodIdSchema.safeParse(mood);
  return result.success ? result.data : 'presence';
}

/** Check if value is a valid mood ID */
export function isMoodId(value: unknown): value is MoodId {
  return MoodIdSchema.safeParse(value).success;
}
