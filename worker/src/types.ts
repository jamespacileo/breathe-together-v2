/**
 * Shared types for Breathe Together presence system
 * These types are used by both the Cloudflare Worker and the frontend
 */

/**
 * Mood IDs - must match frontend constants
 */
export type MoodId = 'gratitude' | 'presence' | 'release' | 'connection';

/**
 * Individual user for slot-based rendering
 * Enables synchronized particle positions across all clients
 */
export interface User {
  /** Stable slot ID (hashed session, same for all clients) */
  id: string;
  /** User's current mood */
  mood: MoodId;
}

/**
 * Aggregated presence state returned by API
 */
export interface PresenceState {
  /** Total number of active users */
  count: number;
  /** Count of users per mood */
  moods: Record<MoodId, number>;
  /** Individual users for slot-based rendering (synchronized positions) */
  users: User[];
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
