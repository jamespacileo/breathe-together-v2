/**
 * Frontend types for inspirational text system
 * Mirrors backend types for consistency
 */

export interface InspirationMessage {
  id: string;
  top: string;
  bottom: string;
  cyclesPerMessage: number;
  authoredAt: number;
  source: 'preset' | 'llm' | 'manual';
  batchId?: string;
  metadata?: {
    theme?: 'gratitude' | 'presence' | 'release' | 'connection';
    intensity?: 'subtle' | 'profound' | 'energetic';
  };
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
