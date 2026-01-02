/**
 * Inspirational text types for backend-driven message synchronization
 */

export interface InspirationMessage {
  /** Unique identifier for the message */
  id: string;

  /** Text to display above breathing globe */
  top: string;

  /** Text to display below breathing globe */
  bottom: string;

  /** How many 16-second breathing cycles to show this message */
  cyclesPerMessage: number;

  /** When this message was created (UTC timestamp) */
  authoredAt: number;

  /** Source of the message */
  source: 'preset' | 'llm' | 'manual';

  /** Batch ID if from LLM generation */
  batchId?: string;

  /** Optional metadata */
  metadata?: {
    theme?: 'gratitude' | 'presence' | 'release' | 'connection';
    intensity?: 'subtle' | 'profound' | 'energetic';
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
