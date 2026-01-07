import { readBool, readInt } from './config/env';

export interface InspirationalConfig {
  enabled: boolean;
  cycleDurationMs: number;
  cyclesPerMessage: number;
  /** TTL for generated batches stored in KV */
  batchTtlSeconds: number;
  /** Max number of display history entries stored in KV */
  historyMaxEntries: number;
}

export const INSPIRATIONAL_CONFIG: InspirationalConfig = {
  enabled: true,
  cycleDurationMs: 16_000,
  cyclesPerMessage: 2,
  batchTtlSeconds: 60 * 60 * 24 * 7, // 7 days
  historyMaxEntries: 50,
};

/**
 * Supported vars:
 * - `INSPIRATION_TEXT_ENABLED=true|false`
 * - `INSPIRATION_MESSAGE_DURATION=<ms>` (rounded to whole breathing cycles)
 * - `INSPIRATION_BATCH_TTL_SECONDS=<seconds>`
 * - `INSPIRATION_HISTORY_MAX=<int>`
 */
export function configureInspirationalFromEnv(env: Record<string, unknown>): void {
  const enabled = readBool(env.INSPIRATION_TEXT_ENABLED);
  if (enabled !== undefined) INSPIRATIONAL_CONFIG.enabled = enabled;

  const messageDurationMs = readInt(env.INSPIRATION_MESSAGE_DURATION);
  if (messageDurationMs !== undefined && messageDurationMs > 0) {
    const cycles = Math.max(
      1,
      Math.round(messageDurationMs / INSPIRATIONAL_CONFIG.cycleDurationMs),
    );
    INSPIRATIONAL_CONFIG.cyclesPerMessage = cycles;
  }

  const batchTtl = readInt(env.INSPIRATION_BATCH_TTL_SECONDS);
  if (batchTtl !== undefined && batchTtl > 0) INSPIRATIONAL_CONFIG.batchTtlSeconds = batchTtl;

  const historyMax = readInt(env.INSPIRATION_HISTORY_MAX);
  if (historyMax !== undefined && historyMax > 0)
    INSPIRATIONAL_CONFIG.historyMaxEntries = historyMax;
}

export function getMessageDisplayTimeMs(): number {
  return INSPIRATIONAL_CONFIG.cycleDurationMs * INSPIRATIONAL_CONFIG.cyclesPerMessage;
}
