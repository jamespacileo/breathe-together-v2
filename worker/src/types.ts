/**
 * Shared types for Breathe Together presence system
 * These types are used by both the Cloudflare Worker and the frontend
 */

/**
 * Mood IDs - must match frontend constants
 */
export type MoodId = 'gratitude' | 'presence' | 'release' | 'connection';

/**
 * Individual user session stored in KV
 */
export interface PresenceSession {
  /** User's current mood */
  mood: MoodId;
  /** Unix timestamp of last heartbeat */
  lastSeen: number;
}

/**
 * Aggregated presence state returned by API
 */
export interface PresenceState {
  /** Total number of active users */
  count: number;
  /** Count of users per mood */
  moods: Record<MoodId, number>;
  /** Server timestamp when this was computed */
  timestamp: number;
}

/**
 * Heartbeat request body
 */
export interface HeartbeatRequest {
  /** Unique session identifier (UUID) */
  sessionId: string;
  /** Optional mood (defaults to 'presence') */
  mood?: MoodId;
}

/**
 * Leave request body
 */
export interface LeaveRequest {
  /** Session identifier to remove */
  sessionId: string;
}
