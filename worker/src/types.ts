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
  /** ISO 3166-1 alpha-2 country code (from Cloudflare geolocation) */
  country?: string;
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
  /** Count of users per country (ISO 3166-1 alpha-2 codes) */
  countryCounts: Record<string, number>;
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
