/**
 * Inspirational Text Queue Store
 *
 * Manages a queue of message sequences for the InspirationalText component.
 * Supports intro sequences, story arcs, priority messages, and ambient rotation.
 *
 * @example
 * ```typescript
 * // Queue a milestone celebration
 * useInspirationalTextStore.getState().enqueue({
 *   id: 'milestone-10',
 *   type: 'priority',
 *   priority: 100,
 *   messages: [
 *     { top: 'Ten Sessions', bottom: 'Of Growth' },
 *     { top: 'Thank You', bottom: 'For Returning' },
 *   ],
 * });
 * ```
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/** Single message with top/bottom text */
export interface InspirationalMessage {
  top: string;
  bottom: string;
}

/** Sequence type determines playback behavior */
export type SequenceType = 'intro' | 'story' | 'priority' | 'ambient';

/** A sequence of related messages */
export interface MessageSequence {
  /** Unique identifier for the sequence */
  id: string;

  /** Sequence type determines playback behavior */
  type: SequenceType;

  /** Messages in this sequence (played in order) */
  messages: InspirationalMessage[];

  /** Override cycles per message for this sequence (default: 3) */
  cyclesPerMessage?: number;

  /** Only play once, then remove from pool (for intro/priority) */
  playOnce?: boolean;

  /** Priority level - higher values play sooner (default: 0) */
  priority?: number;

  /** Human-readable description */
  description?: string;
}

/** Queue item with playback state */
export interface QueuedSequence {
  sequence: MessageSequence;
  currentIndex: number;
  cyclesRemaining: number;
}

/** Store state */
interface InspirationalTextState {
  /** Queue of pending sequences (priority-sorted) */
  queue: QueuedSequence[];

  /** Currently playing sequence */
  currentSequence: QueuedSequence | null;

  /** Pool of ambient messages (loops forever) */
  ambientPool: InspirationalMessage[];

  /** Current index in ambient pool (when no sequences queued) */
  ambientIndex: number;

  /** Cycles remaining for current ambient message */
  ambientCyclesRemaining: number;

  /** Track which sequences have been played (for playOnce) */
  playedSequenceIds: Set<string>;

  /** Whether intro has been shown this session */
  hasPlayedIntro: boolean;

  /** Default cycles per message */
  defaultCyclesPerMessage: number;
}

/** Store actions */
interface InspirationalTextActions {
  /** Add a sequence to the queue */
  enqueue: (sequence: MessageSequence) => void;

  /** Add multiple sequences at once */
  enqueueAll: (sequences: MessageSequence[]) => void;

  /** Advance to next message (called each breath cycle) */
  advanceCycle: () => void;

  /** Skip current sequence entirely */
  skipSequence: () => void;

  /** Get the current message to display */
  getCurrentMessage: () => InspirationalMessage | null;

  /** Check if currently playing a sequence (vs ambient) */
  isPlayingSequence: () => boolean;

  /** Get info about current playback state */
  getPlaybackInfo: () => {
    sequenceId: string | null;
    sequenceType: SequenceType | null;
    messageIndex: number;
    totalMessages: number;
    cyclesRemaining: number;
  };

  /** Set the ambient message pool */
  setAmbientPool: (messages: InspirationalMessage[]) => void;

  /** Reset all state (for testing) */
  reset: () => void;
}

type InspirationalTextStore = InspirationalTextState & InspirationalTextActions;

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_CYCLES_PER_MESSAGE = 3;

const initialState: InspirationalTextState = {
  queue: [],
  currentSequence: null,
  ambientPool: [],
  ambientIndex: 0,
  ambientCyclesRemaining: DEFAULT_CYCLES_PER_MESSAGE,
  playedSequenceIds: new Set(),
  hasPlayedIntro: false,
  defaultCyclesPerMessage: DEFAULT_CYCLES_PER_MESSAGE,
};

// ============================================================================
// Helper Functions
// ============================================================================

/** Sort queue by priority (higher first), then by type (intro > priority > story) */
function sortQueue(queue: QueuedSequence[]): QueuedSequence[] {
  const typePriority: Record<SequenceType, number> = {
    intro: 1000,
    priority: 100,
    story: 10,
    ambient: 0,
  };

  return [...queue].sort((a, b) => {
    const aPriority = (a.sequence.priority ?? 0) + typePriority[a.sequence.type];
    const bPriority = (b.sequence.priority ?? 0) + typePriority[b.sequence.type];
    return bPriority - aPriority;
  });
}

/** Create a queued sequence from a message sequence */
function createQueuedSequence(sequence: MessageSequence, defaultCycles: number): QueuedSequence {
  return {
    sequence,
    currentIndex: 0,
    cyclesRemaining: sequence.cyclesPerMessage ?? defaultCycles,
  };
}

// ============================================================================
// Store
// ============================================================================

export const useInspirationalTextStore = create<InspirationalTextStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      enqueue: (sequence) => {
        const state = get();

        // Skip if already played and playOnce is true
        if (sequence.playOnce && state.playedSequenceIds.has(sequence.id)) {
          return;
        }

        // Skip if currently playing this sequence
        if (state.currentSequence?.sequence.id === sequence.id) {
          return;
        }

        // Skip if already in queue
        if (state.queue.some((q) => q.sequence.id === sequence.id)) {
          return;
        }

        const queuedSequence = createQueuedSequence(sequence, state.defaultCyclesPerMessage);

        set((state) => ({
          queue: sortQueue([...state.queue, queuedSequence]),
        }));

        // If nothing is currently playing, start the new sequence
        if (!state.currentSequence) {
          get().advanceCycle();
        }
      },

      enqueueAll: (sequences) => {
        for (const sequence of sequences) {
          get().enqueue(sequence);
        }
      },

      advanceCycle: () => {
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: State machine for inspirational text sequences handles multiple transition cases (sequence/queue/ambient) - splitting would fragment related logic
        set((state) => {
          const { currentSequence, queue, ambientPool, ambientIndex } = state;

          // Case 1: Currently playing a sequence
          if (currentSequence) {
            const cyclesRemaining = currentSequence.cyclesRemaining - 1;

            // Same message, fewer cycles remaining
            if (cyclesRemaining > 0) {
              return {
                currentSequence: { ...currentSequence, cyclesRemaining },
              };
            }

            // Move to next message in sequence
            const nextIndex = currentSequence.currentIndex + 1;
            const { sequence } = currentSequence;

            // More messages in this sequence
            if (nextIndex < sequence.messages.length) {
              return {
                currentSequence: {
                  ...currentSequence,
                  currentIndex: nextIndex,
                  cyclesRemaining: sequence.cyclesPerMessage ?? state.defaultCyclesPerMessage,
                },
              };
            }

            // Sequence complete - mark as played if playOnce
            const newPlayedIds = new Set(state.playedSequenceIds);
            if (sequence.playOnce) {
              newPlayedIds.add(sequence.id);
            }

            // Check if this was intro
            const wasIntro = sequence.type === 'intro';

            // Start next sequence from queue, or fall back to ambient
            if (queue.length > 0) {
              const [nextSequence, ...remainingQueue] = queue;
              return {
                currentSequence: nextSequence,
                queue: remainingQueue,
                playedSequenceIds: newPlayedIds,
                hasPlayedIntro: wasIntro ? true : state.hasPlayedIntro,
              };
            }

            // Fall back to ambient
            return {
              currentSequence: null,
              playedSequenceIds: newPlayedIds,
              hasPlayedIntro: wasIntro ? true : state.hasPlayedIntro,
            };
          }

          // Case 2: No current sequence - check queue
          if (queue.length > 0) {
            const [nextSequence, ...remainingQueue] = queue;
            return {
              currentSequence: nextSequence,
              queue: remainingQueue,
            };
          }

          // Case 3: Ambient rotation with cycle counting
          if (ambientPool.length > 0) {
            const cyclesRemaining = state.ambientCyclesRemaining - 1;

            // Same message, fewer cycles remaining
            if (cyclesRemaining > 0) {
              return {
                ambientCyclesRemaining: cyclesRemaining,
              };
            }

            // Move to next ambient message
            return {
              ambientIndex: (ambientIndex + 1) % ambientPool.length,
              ambientCyclesRemaining: state.defaultCyclesPerMessage,
            };
          }

          return state;
        });
      },

      skipSequence: () => {
        set((state) => {
          if (!state.currentSequence) return state;

          const { sequence } = state.currentSequence;
          const newPlayedIds = new Set(state.playedSequenceIds);

          // Mark as played if playOnce (even when skipped)
          if (sequence.playOnce) {
            newPlayedIds.add(sequence.id);
          }

          // Move to next sequence or ambient
          if (state.queue.length > 0) {
            const [nextSequence, ...remainingQueue] = state.queue;
            return {
              currentSequence: nextSequence,
              queue: remainingQueue,
              playedSequenceIds: newPlayedIds,
            };
          }

          return {
            currentSequence: null,
            playedSequenceIds: newPlayedIds,
          };
        });
      },

      getCurrentMessage: () => {
        const { currentSequence, ambientPool, ambientIndex } = get();

        if (currentSequence) {
          return currentSequence.sequence.messages[currentSequence.currentIndex];
        }

        if (ambientPool.length > 0) {
          return ambientPool[ambientIndex];
        }

        return null;
      },

      isPlayingSequence: () => {
        return get().currentSequence !== null;
      },

      getPlaybackInfo: () => {
        const { currentSequence, ambientPool, ambientIndex, ambientCyclesRemaining } = get();

        if (currentSequence) {
          return {
            sequenceId: currentSequence.sequence.id,
            sequenceType: currentSequence.sequence.type,
            messageIndex: currentSequence.currentIndex,
            totalMessages: currentSequence.sequence.messages.length,
            cyclesRemaining: currentSequence.cyclesRemaining,
          };
        }

        return {
          sequenceId: null,
          sequenceType: 'ambient' as SequenceType,
          messageIndex: ambientIndex,
          totalMessages: ambientPool.length,
          cyclesRemaining: ambientCyclesRemaining,
        };
      },

      setAmbientPool: (messages) => {
        set({
          ambientPool: messages,
          ambientIndex: 0,
          ambientCyclesRemaining: DEFAULT_CYCLES_PER_MESSAGE,
        });
      },

      reset: () => {
        set({
          ...initialState,
          playedSequenceIds: new Set(),
        });
      },
    }),
    {
      name: 'inspirational-text-storage',
      partialize: (state) => ({
        // Only persist which sequences have been played
        playedSequenceIds: Array.from(state.playedSequenceIds),
        hasPlayedIntro: state.hasPlayedIntro,
      }),
      merge: (persisted, current) => {
        const persistedData = persisted as {
          playedSequenceIds?: string[];
          hasPlayedIntro?: boolean;
        };
        return {
          ...current,
          playedSequenceIds: new Set(persistedData?.playedSequenceIds ?? []),
          hasPlayedIntro: persistedData?.hasPlayedIntro ?? false,
        };
      },
    },
  ),
);

// ============================================================================
// Convenience Exports
// ============================================================================

/** Get store state outside of React */
export const getInspirationalTextState = () => useInspirationalTextStore.getState();

/** Queue a sequence imperatively (outside React) */
export const queueSequence = (sequence: MessageSequence) =>
  useInspirationalTextStore.getState().enqueue(sequence);
