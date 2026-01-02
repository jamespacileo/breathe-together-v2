/**
 * Inspirational text types for backend-driven message synchronization
 * Supports individual messages, atomic story blocks, and message history tracking
 */

export interface InspirationMessage {
  /** Unique identifier for the message */
  id: string;

  /** Text to display above breathing globe */
  top: string;

  /** Text to display below breathing globe */
  bottom: string;

  /** How many 16-second breathing cycles to show this message (32s = 2 cycles) */
  cyclesPerMessage: number;

  /** When this message was created (UTC timestamp) */
  authoredAt: number;

  /** Source of the message */
  source: 'preset' | 'llm' | 'manual';

  /** Story ID if part of a story (atomic block) */
  storyId?: string;

  /** Position within story (1-indexed) */
  storyPosition?: number;

  /** Total messages in story */
  storyTotal?: number;

  /** Batch ID if from LLM generation */
  batchId?: string;

  /** Optional metadata */
  metadata?: {
    theme?: 'gratitude' | 'presence' | 'release' | 'connection';
    intensity?: 'subtle' | 'profound' | 'energetic';
    narrativeContext?: string; // Previous message context for coherence
  };
}

/**
 * Story: An atomic block of messages that should be shown sequentially
 * Stories are indivisible units - all messages in a story must be shown together
 */
export interface Story {
  /** Unique story identifier */
  id: string;

  /** Human-readable story title */
  title: string;

  /** Story description/theme */
  description: string;

  /** Messages in sequence (beginning, middle, end) */
  messages: InspirationMessage[];

  /** Source of story */
  source: 'preset' | 'llm' | 'manual';

  /** When created */
  createdAt: number;

  /** Narrative arc metadata */
  metadata?: {
    theme?: 'gratitude' | 'presence' | 'release' | 'connection';
    intensity?: 'subtle' | 'profound' | 'energetic';
    narrativeType?: 'beginning' | 'middle' | 'end' | 'complete-arc';
    totalDurationSeconds?: number; // Total time for all messages
  };
}

export interface MessageBatch {
  /** Unique batch identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Messages in this batch */
  messages: InspirationMessage[];

  /** Source of batch */
  source: 'preset' | 'llm' | 'manual';

  /** When batch was created */
  createdAt: number;

  /** Optional metadata */
  metadata?: {
    theme?: string;
    generatedBy?: string;
    tokenCount?: number;
  };
}

export interface GlobalTextState {
  /** Index of current message in current batch */
  currentMessageIndex: number;

  /** ID of current batch */
  currentBatchId: string;

  /** When the current batch started (UTC timestamp) */
  batchStartTime: number;

  /** When to advance to next message (UTC timestamp) */
  nextRotationTime: number;

  /** Total cycles elapsed for analytics */
  totalCycles: number;

  /** Last updated timestamp */
  lastUpdated: number;
}

export interface UserTextOverride {
  /** Session ID being overridden */
  sessionId: string;

  /** Type of override */
  type: 'tutorial' | 'first-time-flow' | 'custom' | 'seasonal';

  /** Messages to show */
  messages: InspirationMessage[];

  /** Current index in override messages */
  currentIndex: number;

  /** When to stop overriding and return to global (UTC timestamp) */
  expiresAt: number;

  /** Whether tutorial/flow is complete */
  isComplete: boolean;

  /** Optional reason for logging */
  reason?: string;
}

/**
 * Message display history for analytics and coherence
 * Tracks what messages have been shown to calculate display times
 */
export interface MessageDisplayHistory {
  /** Message or story ID that was displayed */
  entityId: string;

  /** Type of entity displayed */
  entityType: 'message' | 'story';

  /** When it was displayed (UTC timestamp) */
  displayedAt: number;

  /** How long it was shown (seconds) */
  durationSeconds: number;

  /** Source (preset/llm/manual) for analytics */
  source: 'preset' | 'llm' | 'manual';

  /** Theme if applicable */
  theme?: string;

  /** For UI: friendly display format */
  displayedAtISO?: string; // "2025-01-02T14:30:45Z"
}

/**
 * Expanded batch state for admin panel with history and timing
 */
export interface AdminBatchState {
  /** Current batch ID */
  currentBatchId: string;

  /** Current message/story index */
  currentIndex: number;

  /** Current message/story being shown */
  currentEntity: InspirationMessage | Story | null;

  /** Total messages/stories in batch */
  totalEntities: number;

  /** Time remaining until next rotation (seconds) */
  timeUntilNextRotation: number;

  /** Estimated time next message will display */
  nextRotationTimeISO: string; // "2025-01-02T14:30:45Z"

  /** All messages and stories in current batch */
  batch: (InspirationMessage | Story)[];

  /** Recent display history (last 20 messages) */
  recentHistory: MessageDisplayHistory[];

  /** Total cycles displayed for this batch */
  totalCycles: number;

  /** Time batch started */
  batchStartedAtISO: string;
}

export interface InspirationResponse {
  /** Current message to display */
  message: InspirationMessage;

  /** Current index in batch */
  currentIndex: number;

  /** Current batch ID */
  batchId: string;

  /** If user has override, include it */
  override?: UserTextOverride;

  /** When next message rotates in (UTC timestamp) */
  nextRotationTime: number;

  /** Suggestion for client cache duration in seconds */
  cacheMaxAge: number;
}
