# Inspirational Text Queue System - Design Exploration

## Overview

This document explores adding a queue system to the inspirational text feature, enabling:
1. **Sequenced messaging** - Messages that belong together play in order
2. **Storytelling** - Welcome flows, themed narratives, guided experiences
3. **Priority injection** - Queue up important messages (events, milestones)

## Current Implementation

**File:** `src/components/InspirationalText.tsx`
**Config:** `src/config/inspirationalMessages.ts`

### How It Works Now

```
┌──────────────────────────────────────────────────────────┐
│  MESSAGES array (flat list)                              │
│  [msg1, msg2, msg3, msg4, ...]                           │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  InspirationalText Component                             │
│  - quoteIndex state (0, 1, 2, ...)                       │
│  - Rotates every CYCLES_PER_MESSAGE cycles (~48s)        │
│  - Sequential through array, wraps to 0                  │
└──────────────────────────────────────────────────────────┘
```

**Limitations:**
- No grouping - each message is independent
- No priority - all messages treated equally
- No "play once" - intro/welcome would repeat forever
- No external triggering - can't queue messages from elsewhere

---

## Design Goals

### Primary Use Cases

1. **Welcome Intro Sequence**
   ```
   Welcome → To This Space
   Take A → Deep Breath
   We Are → Together Now
   You Are → Safe Here
   (plays once, then transitions to regular rotation)
   ```

2. **Themed Story Arcs**
   ```
   [Connection Arc - 4 messages that build on each other]
   Feel The → Stillness
   Notice → Your Body
   Sense The → Others
   We Are → Connected
   ```

3. **Event/Milestone Messages**
   ```
   (User reaches 10 sessions)
   Ten Sessions → Of Growth
   Thank You → For Being Here
   ```

4. **Time-Based Sequences**
   ```
   (Morning: 6am-10am)
   Good Morning → Beautiful Soul
   A New Day → Awaits
   ```

---

## Proposed Data Model

### Message Types

```typescript
// src/config/inspirationalMessages.ts

/** Single message with top/bottom text */
export interface InspirationalMessage {
  top: string;
  bottom: string;
}

/** A sequence of related messages */
export interface MessageSequence {
  /** Unique identifier for the sequence */
  id: string;

  /** Sequence type determines playback behavior */
  type: 'intro' | 'story' | 'priority' | 'ambient';

  /** Messages in this sequence (played in order) */
  messages: InspirationalMessage[];

  /** Optional: Override cycles per message for this sequence */
  cyclesPerMessage?: number;

  /** Optional: Only play once (for intro sequences) */
  playOnce?: boolean;

  /** Optional: Priority level (higher = plays sooner) */
  priority?: number;

  /** Optional: Human-readable description */
  description?: string;
}

/** Queue item with playback state */
export interface QueuedSequence {
  sequence: MessageSequence;
  currentIndex: number;
  cyclesRemaining: number;
  completed: boolean;
}
```

### Sequence Types Explained

| Type | Behavior | Use Case |
|------|----------|----------|
| `intro` | Plays once at app start, highest priority | Welcome flow |
| `story` | Plays all messages in order, then removes from queue | Themed narratives |
| `priority` | Inserted at front of queue, plays once | Milestones, events |
| `ambient` | Loops forever, lowest priority (current behavior) | Background rotation |

---

## Queue Manager Architecture

### Option A: React Context + useReducer

**Pros:**
- Fits React patterns
- Easy to test
- Type-safe dispatch actions

**Cons:**
- Requires wrapping component tree
- Not accessible outside React

```typescript
// src/context/InspirationalTextContext.tsx

interface QueueState {
  queue: QueuedSequence[];
  currentSequence: QueuedSequence | null;
  ambientPool: MessageSequence;
  hasPlayedIntro: boolean;
}

type QueueAction =
  | { type: 'ENQUEUE_SEQUENCE'; sequence: MessageSequence }
  | { type: 'ADVANCE_MESSAGE' }
  | { type: 'COMPLETE_SEQUENCE' }
  | { type: 'SKIP_SEQUENCE' }
  | { type: 'RESET_QUEUE' };

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ENQUEUE_SEQUENCE':
      return enqueueByPriority(state, action.sequence);
    case 'ADVANCE_MESSAGE':
      return advanceToNextMessage(state);
    // ...
  }
}
```

### Option B: Zustand Store

**Pros:**
- Simpler API
- Accessible anywhere (hooks or direct)
- Built-in devtools

**Cons:**
- Additional dependency
- Less explicit action flow

```typescript
// src/stores/inspirationalTextStore.ts

import { create } from 'zustand';

interface InspirationalTextStore {
  queue: QueuedSequence[];
  currentSequence: QueuedSequence | null;

  // Actions
  enqueue: (sequence: MessageSequence) => void;
  advance: () => void;
  skip: () => void;
  getCurrentMessage: () => InspirationalMessage | null;
}

export const useInspirationalText = create<InspirationalTextStore>((set, get) => ({
  queue: [],
  currentSequence: null,

  enqueue: (sequence) => set((state) => ({
    queue: insertByPriority(state.queue, sequence)
  })),

  advance: () => {
    // Advance to next message or sequence
  },

  getCurrentMessage: () => {
    const { currentSequence } = get();
    if (!currentSequence) return null;
    return currentSequence.sequence.messages[currentSequence.currentIndex];
  },
}));
```

### Option C: Integrate with Koota ECS

**Pros:**
- Consistent with app architecture
- Systems can respond to queue state
- Decoupled from React lifecycle

**Cons:**
- More complex
- ECS might be overkill for UI state

```typescript
// src/entities/inspirationalText/traits.ts

import { trait } from 'koota';

export const InspirationalTextQueue = trait({
  queue: [] as QueuedSequence[],
  currentSequenceId: null as string | null,
  currentMessageIndex: 0,
});

// src/entities/inspirationalText/systems.ts

export function inspirationalTextSystem(world: World) {
  const [entity] = world.query([InspirationalTextQueue]);
  if (!entity) return;

  const queue = entity.get(InspirationalTextQueue);
  // Update queue state based on breath cycles
}
```

### Recommendation: Option B (Zustand)

**Rationale:**
- Queue state is UI-centric, not scene/physics
- Zustand is already a common pattern in React apps
- Simple API for external triggers (milestones, time-based)
- Doesn't add complexity to ECS (keeps ECS for 3D behavior)

---

## Playback Logic

### Queue Priority Resolution

```
┌─────────────────────────────────────────────────────────────┐
│                     PLAYBACK PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Check for INTRO sequence (first-time only)              │
│     └── If exists and not played → Play intro               │
│                                                              │
│  2. Check PRIORITY queue (descending priority)              │
│     └── If any priority sequences → Play highest            │
│                                                              │
│  3. Check STORY queue (FIFO)                                │
│     └── If any story sequences → Play next                  │
│                                                              │
│  4. Fall back to AMBIENT pool                               │
│     └── Random selection from ambient messages              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### State Machine

```
                    ┌──────────────────┐
                    │      IDLE        │
                    │  (no messages)   │
                    └────────┬─────────┘
                             │ enqueue()
                             ▼
                    ┌──────────────────┐
         ┌─────────│    PLAYING       │◄────────────┐
         │         │ currentSequence   │             │
         │         └────────┬─────────┘             │
         │                  │                        │
         │    ┌─────────────┼─────────────┐         │
         │    │             │             │         │
         │    ▼             ▼             ▼         │
         │ ┌──────┐   ┌──────────┐  ┌─────────┐    │
         │ │INHALE│──▶│ VISIBLE  │─▶│ EXHALE  │    │
         │ │fade  │   │ hold     │  │ fade    │    │
         │ └──────┘   └──────────┘  └────┬────┘    │
         │                               │         │
         │                               ▼         │
         │                    ┌──────────────────┐ │
         │                    │   HOLD-OUT       │ │
         │                    │ (decide next)    │─┘
         │                    └────────┬─────────┘
         │                             │ sequence complete?
         │                             ▼
         │                    ┌──────────────────┐
         └────────────────────│  NEXT_SEQUENCE   │
                              │ (pop queue)      │
                              └──────────────────┘
```

### Cycle Counting Logic

```typescript
function advanceMessage(state: QueueState): QueueState {
  const { currentSequence } = state;
  if (!currentSequence) return startNextSequence(state);

  // Decrement cycles remaining for current message
  const cyclesRemaining = currentSequence.cyclesRemaining - 1;

  if (cyclesRemaining > 0) {
    // Same message, fewer cycles
    return {
      ...state,
      currentSequence: { ...currentSequence, cyclesRemaining }
    };
  }

  // Move to next message in sequence
  const nextIndex = currentSequence.currentIndex + 1;
  const { sequence } = currentSequence;

  if (nextIndex >= sequence.messages.length) {
    // Sequence complete
    return completeSequence(state, currentSequence);
  }

  // Next message in sequence
  return {
    ...state,
    currentSequence: {
      ...currentSequence,
      currentIndex: nextIndex,
      cyclesRemaining: sequence.cyclesPerMessage ?? CYCLES_PER_MESSAGE,
    }
  };
}
```

---

## Example Sequences

### Welcome Intro

```typescript
export const INTRO_SEQUENCE: MessageSequence = {
  id: 'welcome-intro',
  type: 'intro',
  playOnce: true,
  cyclesPerMessage: 2, // Faster pace for intro (32s total)
  description: 'First-time welcome sequence',
  messages: [
    { top: 'Welcome', bottom: 'To This Space' },
    { top: 'Take A Moment', bottom: 'To Arrive' },
    { top: 'Breathe With', bottom: 'The World' },
    { top: 'You Are', bottom: 'Not Alone' },
  ],
};
```

### Connection Story Arc

```typescript
export const CONNECTION_STORY: MessageSequence = {
  id: 'connection-arc',
  type: 'story',
  cyclesPerMessage: 3,
  description: 'Building sense of global connection',
  messages: [
    { top: 'Feel The', bottom: 'Stillness' },
    { top: 'Notice', bottom: 'Your Body' },
    { top: 'Sense The', bottom: 'Others' },
    { top: 'Across The', bottom: 'World' },
    { top: 'We Breathe', bottom: 'Together' },
    { top: 'One Rhythm', bottom: 'One Heart' },
  ],
};
```

### Milestone Celebration

```typescript
export function createMilestoneSequence(sessionCount: number): MessageSequence {
  return {
    id: `milestone-${sessionCount}`,
    type: 'priority',
    priority: 100,
    playOnce: true,
    cyclesPerMessage: 2,
    messages: [
      { top: `${sessionCount} Sessions`, bottom: 'Of Growth' },
      { top: 'Thank You', bottom: 'For Being Here' },
    ],
  };
}
```

### Time-Based Morning Greeting

```typescript
export const MORNING_SEQUENCE: MessageSequence = {
  id: 'morning-greeting',
  type: 'priority',
  priority: 50,
  playOnce: true,
  messages: [
    { top: 'Good Morning', bottom: 'Beautiful Soul' },
    { top: 'A New Day', bottom: 'Of Possibility' },
  ],
};
```

---

## API Design

### Hook API

```typescript
// Usage in components
function SomeComponent() {
  const {
    currentMessage,
    queueSequence,
    skipCurrentSequence,
    isPlaying,
  } = useInspirationalText();

  // Queue a celebration sequence
  const celebrate = () => {
    queueSequence(createMilestoneSequence(10));
  };
}
```

### Imperative API (for external triggers)

```typescript
// Usage from anywhere (timers, event handlers)
import { inspirationalTextStore } from '../stores/inspirationalTextStore';

// Queue morning greeting at 6am
if (hour >= 6 && hour < 10 && !hasShownMorning) {
  inspirationalTextStore.getState().enqueue(MORNING_SEQUENCE);
}
```

---

## Migration Path

### Phase 1: Add Store (Non-Breaking)

1. Create `useInspirationalTextStore` with Zustand
2. Initialize with current behavior (ambient pool only)
3. `InspirationalText` component reads from store
4. No visible change to users

### Phase 2: Add Intro Sequence

1. Define `INTRO_SEQUENCE` in config
2. Store checks `hasPlayedIntro` on mount
3. Plays intro once, then falls back to ambient
4. Persists `hasPlayedIntro` in localStorage

### Phase 3: Add Story Sequences

1. Define story sequences in config
2. Add rotation logic between ambient and stories
3. Stories play periodically (e.g., every 5 minutes)

### Phase 4: Add Priority Queue

1. Expose `queueSequence()` API
2. Integrate with milestone/achievement system
3. Add time-based triggers (morning, evening)

---

## Open Questions

1. **Persistence:** Should queue state persist across page refreshes?
   - Pro: Resume where you left off
   - Con: Intro plays once ever vs once per session

2. **Shuffle vs Sequential:** Should ambient pool shuffle or play sequentially?
   - Current: Sequential (predictable)
   - Option: Shuffle (more variety)

3. **Skip Controls:** Should users be able to skip sequences?
   - Pro: User control
   - Con: Breaks intended flow

4. **Transition Animation:** Should there be a distinct transition between sequences?
   - Option: Brief pause/fade between sequences
   - Option: Same animation, just different content

5. **Analytics:** Track which messages are seen, sequence completion rates?
   - Would help curate better content
   - Privacy considerations

---

## File Structure (Proposed)

```
src/
├── stores/
│   └── inspirationalTextStore.ts    # Zustand store
├── config/
│   └── inspirationalMessages.ts     # Updated with sequences
├── components/
│   └── InspirationalText.tsx        # Updated to use store
└── hooks/
    └── useInspirationalTextQueue.ts # Optional convenience hook
```

---

## Next Steps

1. **Decide on state management approach** (Zustand recommended)
2. **Define initial sequences** (welcome intro, 2-3 story arcs)
3. **Implement store with ambient-only** (Phase 1)
4. **Add intro sequence** (Phase 2)
5. **Test and iterate on timing/pacing**
