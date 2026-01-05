/**
 * Inspirational text system - backend-driven message synchronization
 * All users see the same message at the same time (UTC-synced)
 */

import type {
  GlobalTextState,
  InspirationResponse,
  MessageBatch,
  MessageDisplayHistory,
  UserTextOverride,
} from './types/inspirational';

// ============================================================================
// KV Keys
// ============================================================================

const GLOBAL_STATE_KEY = 'inspiration:state';
const CURRENT_BATCH_KEY = 'inspiration:batch:current';
const BATCH_PREFIX = 'inspiration:batch:';
const OVERRIDE_PREFIX = 'inspiration:override:';
const HISTORY_KEY = 'inspiration:history'; // Stores array of recent displays

// ============================================================================
// Defaults & Config
// ============================================================================

const CYCLES_PER_MESSAGE = 2; // 2 cycles = 32 seconds per message
const CYCLE_DURATION_MS = 16 * 1000; // 16-second breathing cycle
const MESSAGE_DISPLAY_TIME_MS = CYCLES_PER_MESSAGE * CYCLE_DURATION_MS;

// ============================================================================
// Preset Message Batches
// ============================================================================

function createPresetBatches(): Record<string, MessageBatch> {
  return {
    'preset:intro': {
      id: 'preset:intro',
      name: 'Welcome Intro',
      source: 'preset',
      createdAt: Date.now(),
      messages: [
        {
          id: 'intro-1',
          top: 'Welcome',
          bottom: 'To Breathe Together',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
        {
          id: 'intro-2',
          top: 'Breathing in',
          bottom: 'We breathe as one',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
        {
          id: 'intro-3',
          top: 'Presence',
          bottom: 'Connected across the world',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
      ],
    },
    'preset:ambient': {
      id: 'preset:ambient',
      name: 'Ambient Wisdom',
      source: 'preset',
      createdAt: Date.now(),
      messages: [
        {
          id: 'ambient-1',
          top: 'Notice your breath',
          bottom: 'Without judgment',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
        {
          id: 'ambient-2',
          top: 'Each breath',
          bottom: 'Is a fresh beginning',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
        {
          id: 'ambient-3',
          top: 'In this moment',
          bottom: 'We are all together',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
        {
          id: 'ambient-4',
          top: 'Breathing teaches us',
          bottom: 'The rhythm of life',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
        {
          id: 'ambient-5',
          top: 'Your presence matters',
          bottom: 'You are connected',
          cyclesPerMessage: CYCLES_PER_MESSAGE,
          authoredAt: Date.now(),
          source: 'preset',
        },
      ],
    },
  };
}

// ============================================================================
// State Management
// ============================================================================

function createInitialState(): GlobalTextState {
  return {
    currentMessageIndex: 0,
    currentBatchId: 'preset:intro',
    batchStartTime: Date.now(),
    nextRotationTime: Date.now() + MESSAGE_DISPLAY_TIME_MS,
    totalCycles: 0,
    lastUpdated: Date.now(),
  };
}

export async function initializeInspirational(kv: KVNamespace): Promise<void> {
  // Check if already initialized
  const existing = await kv.get(GLOBAL_STATE_KEY);
  if (existing) return;

  // Create initial state
  const state = createInitialState();
  await kv.put(GLOBAL_STATE_KEY, JSON.stringify(state));

  // Store preset batches
  const presets = createPresetBatches();
  for (const [id, batch] of Object.entries(presets)) {
    await kv.put(BATCH_PREFIX + id, JSON.stringify(batch));
  }

  // Set current batch
  await kv.put(CURRENT_BATCH_KEY, JSON.stringify({ id: 'preset:intro', updatedAt: Date.now() }));
}

async function getGlobalState(kv: KVNamespace): Promise<GlobalTextState> {
  const data = await kv.get(GLOBAL_STATE_KEY, 'json');
  if (data) return data as GlobalTextState;
  return createInitialState();
}

async function saveGlobalState(kv: KVNamespace, state: GlobalTextState): Promise<void> {
  state.lastUpdated = Date.now();
  await kv.put(GLOBAL_STATE_KEY, JSON.stringify(state));
}

async function getBatch(kv: KVNamespace, batchId: string): Promise<MessageBatch | null> {
  const data = await kv.get(BATCH_PREFIX + batchId, 'json');
  return data as MessageBatch | null;
}

export async function getUserOverride(
  kv: KVNamespace,
  sessionId: string,
): Promise<UserTextOverride | null> {
  const data = await kv.get(OVERRIDE_PREFIX + sessionId, 'json');
  if (!data) return null;

  const override = data as UserTextOverride;

  // Check if expired
  if (override.expiresAt < Date.now()) {
    await kv.delete(OVERRIDE_PREFIX + sessionId);
    return null;
  }

  return override;
}

export async function setUserOverride(
  kv: KVNamespace,
  sessionId: string,
  override: UserTextOverride,
): Promise<void> {
  const ttl = Math.ceil((override.expiresAt - Date.now()) / 1000);
  if (ttl > 0) {
    await kv.put(OVERRIDE_PREFIX + sessionId, JSON.stringify(override), {
      expirationTtl: ttl,
    });
  }
}

// ============================================================================
// Message History
// ============================================================================

async function getDisplayHistory(kv: KVNamespace): Promise<MessageDisplayHistory[]> {
  const data = await kv.get(HISTORY_KEY, 'json');
  if (!data) return [];
  return (data as MessageDisplayHistory[]).sort((a, b) => b.displayedAt - a.displayedAt);
}

async function recordMessageDisplay(
  kv: KVNamespace,
  entityId: string,
  durationSeconds: number,
  source: 'preset' | 'llm' | 'manual',
  theme?: string,
): Promise<void> {
  const history = await getDisplayHistory(kv);

  const entry: MessageDisplayHistory = {
    entityId,
    entityType: 'message',
    displayedAt: Date.now(),
    durationSeconds,
    source,
    theme,
    displayedAtISO: new Date().toISOString(),
  };

  // Keep only last 50 entries (for memory efficiency in KV)
  const updated = [entry, ...history].slice(0, 50);
  await kv.put(HISTORY_KEY, JSON.stringify(updated));
}

// ============================================================================
// Message Rotation
// ============================================================================

export async function rotateMessage(
  kv: KVNamespace,
): Promise<{ advanced: boolean; newState: GlobalTextState }> {
  const state = await getGlobalState(kv);
  const now = Date.now();

  // Check if it's time to rotate
  if (now < state.nextRotationTime) {
    return { advanced: false, newState: state };
  }

  const batch = await getBatch(kv, state.currentBatchId);
  let currentBatch = batch;

  if (!currentBatch) {
    // Fallback to intro batch if current batch missing
    state.currentBatchId = 'preset:intro';
    currentBatch = await getBatch(kv, 'preset:intro');
    if (!currentBatch) {
      return { advanced: false, newState: state };
    }
  }

  // Record the message that's about to be replaced in history
  const currentMessage = currentBatch.messages[state.currentMessageIndex];
  if (currentMessage) {
    await recordMessageDisplay(
      kv,
      currentMessage.id,
      MESSAGE_DISPLAY_TIME_MS / 1000,
      currentMessage.source,
      currentMessage.metadata?.theme,
    );
  }

  // Advance to next message
  state.currentMessageIndex++;
  state.totalCycles++;

  // Wrap around if at end of batch
  if (state.currentMessageIndex >= currentBatch.messages.length) {
    state.currentMessageIndex = 0;
    // In production, could queue next batch here
  }

  state.nextRotationTime = now + MESSAGE_DISPLAY_TIME_MS;
  await saveGlobalState(kv, state);

  return { advanced: true, newState: state };
}

// ============================================================================
// Get Current Message
// ============================================================================

export async function getCurrentInspirationMessage(
  kv: KVNamespace,
  sessionId?: string,
): Promise<InspirationResponse> {
  const now = Date.now();

  // Check for user override first
  let override: UserTextOverride | null = null;
  if (sessionId) {
    override = await getUserOverride(kv, sessionId);
  }

  if (override) {
    // User has override - return override message
    const message = override.messages[override.currentIndex];
    const cyclesUntilNext = message.cyclesPerMessage;

    return {
      message,
      currentIndex: override.currentIndex,
      batchId: `override:${sessionId}`,
      override,
      nextRotationTime: now + cyclesUntilNext * CYCLE_DURATION_MS,
      cacheMaxAge: Math.min(cyclesUntilNext * CYCLE_DURATION_MS, 30000) / 1000,
    };
  }

  // Get global state and current batch
  const state = await getGlobalState(kv);
  const batch = await getBatch(kv, state.currentBatchId);

  if (!batch || batch.messages.length === 0) {
    // Fallback - shouldn't happen with proper initialization
    return {
      message: {
        id: 'fallback',
        top: 'Welcome',
        bottom: 'To Breathe Together',
        cyclesPerMessage: CYCLES_PER_MESSAGE,
        authoredAt: now,
        source: 'preset',
      },
      currentIndex: 0,
      batchId: 'fallback',
      nextRotationTime: now + MESSAGE_DISPLAY_TIME_MS,
      cacheMaxAge: 30,
    };
  }

  const message = batch.messages[state.currentMessageIndex];
  const timeUntilNext = Math.max(0, state.nextRotationTime - now);
  const cacheMaxAge = Math.min(timeUntilNext, 30000) / 1000;

  return {
    message,
    currentIndex: state.currentMessageIndex,
    batchId: state.currentBatchId,
    nextRotationTime: state.nextRotationTime,
    cacheMaxAge,
  };
}

// ============================================================================
// Admin Batch State (with history and timing)
// ============================================================================

export async function getAdminBatchState(kv: KVNamespace): Promise<{
  currentBatchId: string;
  currentIndex: number;
  nextRotationTimeISO: string;
  timeUntilNextRotation: number;
  totalEntities: number;
  batchStartedAtISO: string;
  recentHistory: MessageDisplayHistory[];
  totalCycles: number;
}> {
  const state = await getGlobalState(kv);
  const batch = await getBatch(kv, state.currentBatchId);
  const history = await getDisplayHistory(kv);
  const now = Date.now();

  const nextRotationTime = state.nextRotationTime;
  const timeUntilNextRotation = Math.max(0, nextRotationTime - now);

  return {
    currentBatchId: state.currentBatchId,
    currentIndex: state.currentMessageIndex,
    nextRotationTimeISO: new Date(nextRotationTime).toISOString(),
    timeUntilNextRotation: Math.round(timeUntilNextRotation / 1000), // Convert to seconds
    totalEntities: batch?.messages.length || 0,
    batchStartedAtISO: new Date(state.batchStartTime).toISOString(),
    recentHistory: history.slice(0, 20), // Last 20 for admin view
    totalCycles: state.totalCycles,
  };
}

// ============================================================================
// Cleanup Jobs
// ============================================================================

export async function cleanupExpiredOverrides(_kv: KVNamespace): Promise<void> {
  // Note: KV doesn't provide list operation in free tier, so cleanup happens
  // on-demand when checking overrides (see getUserOverride)
  // In paid tier with KV list API, you could enumerate and delete expired
  console.log('Override cleanup: Using TTL-based expiration (no-op)');
}

// ============================================================================
// Scheduled Rotation Job
// ============================================================================

export async function rotateInspirationalOnSchedule(kv: KVNamespace): Promise<void> {
  const { advanced } = await rotateMessage(kv);
  if (advanced) {
    console.log('Inspirational message rotated');
  }
}
