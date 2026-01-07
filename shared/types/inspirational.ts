/**
 * Shared types for inspirational text system (frontend + worker).
 *
 * Keep this file dependency-free so it can be imported from both Vite and Wrangler bundles.
 */

export type InspirationTheme = 'gratitude' | 'presence' | 'release' | 'connection';
export type InspirationIntensity = 'subtle' | 'profound' | 'energetic';
export type InspirationSource = 'preset' | 'llm' | 'manual';
export type NarrativeType = 'beginning' | 'middle' | 'end' | 'complete-arc';

export interface InspirationMessage {
  id: string;
  top: string;
  bottom: string;
  cyclesPerMessage: number;
  authoredAt: number;
  source: InspirationSource;
  storyId?: string;
  storyPosition?: number;
  storyTotal?: number;
  batchId?: string;
  metadata?: {
    theme?: InspirationTheme;
    intensity?: InspirationIntensity;
    narrativeContext?: string;
    narrativeType?: NarrativeType;
  };
}

export interface Story {
  id: string;
  title: string;
  description: string;
  messages: InspirationMessage[];
  source: InspirationSource;
  createdAt: number;
  metadata?: {
    theme?: InspirationTheme;
    intensity?: InspirationIntensity;
    narrativeType?: NarrativeType;
    totalDurationSeconds?: number;
  };
}

export interface MessageBatch {
  id: string;
  name: string;
  messages: InspirationMessage[];
  source: InspirationSource;
  createdAt: number;
  metadata?: {
    theme?: string;
    generatedBy?: string;
    tokenCount?: number;
  };
}

export interface GlobalTextState {
  currentMessageIndex: number;
  currentBatchId: string;
  batchStartTime: number;
  nextRotationTime: number;
  totalCycles: number;
  lastUpdated: number;
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

export interface MessageDisplayHistory {
  entityId: string;
  entityType: 'message' | 'story';
  displayedAt: number;
  durationSeconds: number;
  source: InspirationSource;
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
  batch: Array<InspirationMessage | Story>;
  recentHistory: MessageDisplayHistory[];
  totalCycles: number;
  batchStartedAtISO: string;
}

export interface InspirationResponse {
  message: InspirationMessage;
  currentIndex: number;
  batchId: string;
  override?: UserTextOverride;
  nextRotationTime: number;
  cacheMaxAge: number;
}
