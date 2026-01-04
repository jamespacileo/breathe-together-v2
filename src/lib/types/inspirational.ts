/**
 * Frontend types for inspirational text system
 * Mirrors backend types for consistency
 * Supports stories as atomic message blocks
 */

export interface InspirationMessage {
  id: string;
  top: string;
  bottom: string;
  cyclesPerMessage: number;
  authoredAt: number;
  source: 'preset' | 'llm' | 'manual';
  storyId?: string;
  storyPosition?: number;
  storyTotal?: number;
  batchId?: string;
  metadata?: {
    theme?: 'gratitude' | 'presence' | 'release' | 'connection';
    intensity?: 'subtle' | 'profound' | 'energetic';
    narrativeContext?: string;
  };
}

export interface Story {
  id: string;
  title: string;
  description: string;
  messages: InspirationMessage[];
  source: 'preset' | 'llm' | 'manual';
  createdAt: number;
  metadata?: {
    theme?: 'gratitude' | 'presence' | 'release' | 'connection';
    intensity?: 'subtle' | 'profound' | 'energetic';
    narrativeType?: 'beginning' | 'middle' | 'end' | 'complete-arc';
    totalDurationSeconds?: number;
  };
}

export interface MessageDisplayHistory {
  entityId: string;
  entityType: 'message' | 'story';
  displayedAt: number;
  durationSeconds: number;
  source: 'preset' | 'llm' | 'manual';
  theme?: string;
  displayedAtISO?: string;
}

export interface AdminBatchState {
  currentBatchId: string;
  currentIndex: number;
  currentEntity: InspirationMessage | Story | null;
  totalEntities: number;
  timeUntilNextRotation: number;
  nextRotationTimeISO: string;
  batch: (InspirationMessage | Story)[];
  recentHistory: MessageDisplayHistory[];
  totalCycles: number;
  batchStartedAtISO: string;
}

export interface MessageBatch {
  id: string;
  name: string;
  messages: InspirationMessage[];
  source: 'preset' | 'llm' | 'manual';
  createdAt: number;
  metadata?: {
    theme?: string;
    generatedBy?: string;
    tokenCount?: number;
  };
}

export interface UserTextOverride {
  sessionId: string;
  type: 'tutorial' | 'first-time-flow' | 'custom' | 'seasonal';
  messages: InspirationMessage[];
  currentIndex: number;
  expiresAt: number;
  isComplete: boolean;
  reason?: string;
}

export interface InspirationResponse {
  message: InspirationMessage;
  currentIndex: number;
  batchId: string;
  override?: UserTextOverride;
  nextRotationTime: number;
  cacheMaxAge: number;
}
