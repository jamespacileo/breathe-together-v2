/**
 * Event Logging System
 *
 * Simple in-memory event tracking for monitoring user activity.
 * Keeps recent events for admin panel display.
 */

import type { MoodId } from './types';

// =============================================================================
// Event Types
// =============================================================================

export type EventType = 'join' | 'leave' | 'mood_change';

export interface PresenceEvent {
  id: string;
  type: EventType;
  userId: string;
  mood?: MoodId;
  previousMood?: MoodId;
  timestamp: number;
}

// =============================================================================
// Event Store (in-memory, resets on worker restart)
// =============================================================================

const MAX_EVENTS = 100;
let eventIdCounter = 0;
const events: PresenceEvent[] = [];

/**
 * Log a user join event
 */
export function logJoin(userId: string, mood: MoodId): PresenceEvent {
  const event: PresenceEvent = {
    id: `evt-${++eventIdCounter}`,
    type: 'join',
    userId,
    mood,
    timestamp: Date.now(),
  };
  addEvent(event);
  return event;
}

/**
 * Log a user leave event
 */
export function logLeave(userId: string, mood: MoodId): PresenceEvent {
  const event: PresenceEvent = {
    id: `evt-${++eventIdCounter}`,
    type: 'leave',
    userId,
    mood,
    timestamp: Date.now(),
  };
  addEvent(event);
  return event;
}

/**
 * Log a mood change event
 */
export function logMoodChange(
  userId: string,
  previousMood: MoodId,
  newMood: MoodId,
): PresenceEvent {
  const event: PresenceEvent = {
    id: `evt-${++eventIdCounter}`,
    type: 'mood_change',
    userId,
    mood: newMood,
    previousMood,
    timestamp: Date.now(),
  };
  addEvent(event);
  return event;
}

/**
 * Add event to store (FIFO, max 100 events)
 */
function addEvent(event: PresenceEvent): void {
  events.unshift(event); // Add to front
  if (events.length > MAX_EVENTS) {
    events.pop(); // Remove oldest
  }
}

/**
 * Get recent events
 */
export function getRecentEvents(limit = 50): PresenceEvent[] {
  return events.slice(0, limit);
}

/**
 * Get events by type
 */
export function getEventsByType(type: EventType, limit = 50): PresenceEvent[] {
  return events.filter((e) => e.type === type).slice(0, limit);
}

/**
 * Get event statistics
 */
export function getEventStats(): {
  totalEvents: number;
  joinCount: number;
  leaveCount: number;
  moodChangeCount: number;
  oldestEventTime: number | null;
  newestEventTime: number | null;
} {
  const joins = events.filter((e) => e.type === 'join').length;
  const leaves = events.filter((e) => e.type === 'leave').length;
  const moodChanges = events.filter((e) => e.type === 'mood_change').length;

  return {
    totalEvents: events.length,
    joinCount: joins,
    leaveCount: leaves,
    moodChangeCount: moodChanges,
    oldestEventTime: events.length > 0 ? events[events.length - 1].timestamp : null,
    newestEventTime: events.length > 0 ? events[0].timestamp : null,
  };
}

/**
 * Clear all events (for testing)
 */
export function clearEvents(): void {
  events.length = 0;
  eventIdCounter = 0;
}
