/**
 * Presence types shared between frontend and Cloudflare Worker
 * Canonical definitions - worker/src/types.ts mirrors these
 */

import type { MoodId } from '../constants';

/**
 * Individual user session data
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
