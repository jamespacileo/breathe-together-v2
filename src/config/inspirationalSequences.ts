/**
 * Inspirational Message Sequences
 *
 * Pre-defined sequences for the queue system. These are curated collections
 * of messages that play in order to tell a story or guide an experience.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEQUENCE TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * intro    - Plays once when app first loads (highest priority)
 * story    - Themed narrative arcs that play in order
 * priority - Important messages (milestones, events) that interrupt ambient
 * ambient  - Background rotation pool (current behavior)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CREATING GOOD SEQUENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Each message should stand alone AND build on the previous
 * 2. Create an emotional arc: setup → development → climax → resolution
 * 3. Keep sequences 3-6 messages (longer loses attention)
 * 4. Use cyclesPerMessage to control pacing:
 *    - 1 cycle (16s): Fast, energetic, intro
 *    - 2 cycles (32s): Standard pacing
 *    - 3 cycles (48s): Slow, contemplative
 */

import type { InspirationalMessage, MessageSequence } from '../stores/inspirationalTextStore';

// ============================================================================
// INTRO SEQUENCES
// ============================================================================

/**
 * Welcome sequence for first-time visitors.
 * Plays once, then never again (persisted in localStorage).
 */
export const WELCOME_INTRO: MessageSequence = {
  id: 'welcome-intro',
  type: 'intro',
  playOnce: true,
  cyclesPerMessage: 2, // Slightly faster pace for intro
  description: 'First-time welcome experience',
  messages: [
    { top: 'Welcome', bottom: 'To This Space' },
    { top: 'Take A Moment', bottom: 'To Arrive' },
    { top: 'Let Go', bottom: 'Of Everything Else' },
    { top: 'Right Now', bottom: 'You Are Here' },
    { top: 'Breathing With', bottom: 'The World' },
  ],
};

/**
 * Shorter welcome for returning users who cleared storage.
 */
export const WELCOME_BACK: MessageSequence = {
  id: 'welcome-back',
  type: 'intro',
  playOnce: true,
  cyclesPerMessage: 2,
  description: 'Welcome back sequence',
  messages: [
    { top: 'Welcome Back', bottom: 'Beautiful Soul' },
    { top: 'Ready To', bottom: 'Breathe Together' },
  ],
};

// ============================================================================
// STORY SEQUENCES
// ============================================================================

/**
 * Building a sense of global connection.
 * Arc: self → awareness → others → unity
 */
export const CONNECTION_STORY: MessageSequence = {
  id: 'story-connection',
  type: 'story',
  cyclesPerMessage: 3,
  description: 'Journey from self to global connection',
  messages: [
    { top: 'Feel The', bottom: 'Stillness' },
    { top: 'Notice', bottom: 'Your Body' },
    { top: 'Sense', bottom: 'Your Breath' },
    { top: 'Now Imagine', bottom: 'Others Breathing' },
    { top: 'Across Oceans', bottom: 'And Mountains' },
    { top: 'We Are', bottom: 'One Rhythm' },
  ],
};

/**
 * Gratitude and appreciation arc.
 * Arc: pause → reflect → appreciate → radiate
 */
export const GRATITUDE_STORY: MessageSequence = {
  id: 'story-gratitude',
  type: 'story',
  cyclesPerMessage: 3,
  description: 'Cultivating gratitude and appreciation',
  messages: [
    { top: 'In This Breath', bottom: 'Find Stillness' },
    { top: 'Think Of', bottom: 'One Good Thing' },
    { top: 'Let It', bottom: 'Fill Your Heart' },
    { top: 'Send That Feeling', bottom: 'To The World' },
  ],
};

/**
 * Letting go and release arc.
 * Arc: hold → acknowledge → release → peace
 */
export const RELEASE_STORY: MessageSequence = {
  id: 'story-release',
  type: 'story',
  cyclesPerMessage: 3,
  description: 'Letting go of tension and worry',
  messages: [
    { top: 'What Are You', bottom: 'Holding Onto' },
    { top: 'Notice It', bottom: 'Without Judgment' },
    { top: 'With Each Exhale', bottom: 'Let It Go' },
    { top: 'Make Space', bottom: 'For Peace' },
    { top: 'You Are', bottom: 'Already Enough' },
  ],
};

/**
 * Present moment awareness arc.
 * Arc: past → future → now → acceptance
 */
export const PRESENCE_STORY: MessageSequence = {
  id: 'story-presence',
  type: 'story',
  cyclesPerMessage: 3,
  description: 'Returning to present moment awareness',
  messages: [
    { top: 'The Past', bottom: 'Has Passed' },
    { top: 'The Future', bottom: 'Will Wait' },
    { top: 'Right Now', bottom: 'Is All There Is' },
    { top: 'And Right Now', bottom: 'You Are Breathing' },
    { top: 'That Is', bottom: 'Enough' },
  ],
};

/**
 * Evening wind-down arc.
 * Arc: acknowledge day → release → rest → peace
 */
export const EVENING_STORY: MessageSequence = {
  id: 'story-evening',
  type: 'story',
  cyclesPerMessage: 3,
  description: 'Evening wind-down sequence',
  messages: [
    { top: 'The Day', bottom: 'Is Complete' },
    { top: 'You Did', bottom: 'Your Best' },
    { top: 'Release', bottom: 'The Weight' },
    { top: 'Rest', bottom: 'Is Earned' },
    { top: 'Peace', bottom: 'Is Yours' },
  ],
};

// ============================================================================
// PRIORITY SEQUENCES (Milestones & Events)
// ============================================================================

/**
 * Factory function to create milestone celebration sequences.
 *
 * @example
 * const milestone = createMilestoneSequence(10, 'sessions');
 * queueSequence(milestone);
 */
export function createMilestoneSequence(
  count: number,
  unit: 'sessions' | 'minutes' | 'days' = 'sessions',
): MessageSequence {
  const unitLabel = {
    sessions: count === 1 ? 'Session' : 'Sessions',
    minutes: count === 1 ? 'Minute' : 'Minutes',
    days: count === 1 ? 'Day' : 'Days',
  }[unit];

  return {
    id: `milestone-${unit}-${count}`,
    type: 'priority',
    priority: 100,
    playOnce: true,
    cyclesPerMessage: 2,
    description: `Milestone: ${count} ${unitLabel.toLowerCase()}`,
    messages: [
      { top: `${count} ${unitLabel}`, bottom: 'Of Practice' },
      { top: 'Thank You', bottom: 'For Returning' },
      { top: 'Your Presence', bottom: 'Matters' },
    ],
  };
}

/**
 * Factory function for time-of-day greetings.
 */
export function createTimeGreeting(
  period: 'morning' | 'afternoon' | 'evening' | 'night',
): MessageSequence {
  const greetings: Record<typeof period, InspirationalMessage[]> = {
    morning: [
      { top: 'Good Morning', bottom: 'Beautiful Soul' },
      { top: 'A New Day', bottom: 'Of Possibility' },
    ],
    afternoon: [
      { top: 'Good Afternoon', bottom: 'Take A Pause' },
      { top: 'Breathe', bottom: 'And Reset' },
    ],
    evening: [
      { top: 'Good Evening', bottom: 'Well Done Today' },
      { top: 'Time To', bottom: 'Unwind' },
    ],
    night: [
      { top: 'Peaceful Night', bottom: 'Rest Awaits' },
      { top: 'Let Go', bottom: 'Of Today' },
    ],
  };

  return {
    id: `greeting-${period}`,
    type: 'priority',
    priority: 50,
    playOnce: true, // Once per session
    cyclesPerMessage: 2,
    description: `${period} greeting`,
    messages: greetings[period],
  };
}

/**
 * Special event sequence (e.g., New Year, solstice, etc.)
 */
export const NEW_YEAR_SEQUENCE: MessageSequence = {
  id: 'event-new-year',
  type: 'priority',
  priority: 200, // Higher than milestones
  playOnce: true,
  cyclesPerMessage: 2,
  description: 'New Year celebration',
  messages: [
    { top: 'A New Year', bottom: 'Begins' },
    { top: 'Fresh Start', bottom: 'Fresh Breath' },
    { top: 'May This Year', bottom: 'Bring Peace' },
    { top: 'Happy New Year', bottom: 'Beautiful Soul' },
  ],
};

// ============================================================================
// AMBIENT POOL (Default Background Rotation)
// ============================================================================

/**
 * The ambient pool contains standalone messages that play when no
 * sequences are queued. This is the "default" experience.
 */
export const AMBIENT_MESSAGES: InspirationalMessage[] = [
  // Core unity
  { top: 'We Are All', bottom: 'We Need' },
  { top: 'Love Is', bottom: 'The Answer' },
  { top: 'You Are Not', bottom: 'Alone' },
  { top: 'Together We', bottom: 'Breathe As One' },

  // Presence
  { top: 'This Moment', bottom: 'Is Ours' },
  { top: 'Be Here', bottom: 'Be Now' },
  { top: 'Surrender', bottom: 'To Now' },

  // Trust
  { top: 'Let Go', bottom: 'And Trust' },
  { top: 'Release', bottom: 'And Receive' },

  // Connection
  { top: 'Feel The', bottom: 'Connection' },
  { top: 'We Rise', bottom: 'Together' },
  { top: 'One Breath', bottom: 'One World' },

  // Inner peace
  { top: 'Peace Lives', bottom: 'Within Us' },
  { top: 'The Light', bottom: 'Is In You' },
  { top: 'Stillness', bottom: 'Speaks' },
];

// ============================================================================
// EXPORTS
// ============================================================================

/** All intro sequences */
export const INTRO_SEQUENCES = [WELCOME_INTRO, WELCOME_BACK];

/** All story sequences */
export const STORY_SEQUENCES = [
  CONNECTION_STORY,
  GRATITUDE_STORY,
  RELEASE_STORY,
  PRESENCE_STORY,
  EVENING_STORY,
];

/** All sequences combined */
export const ALL_SEQUENCES: MessageSequence[] = [...INTRO_SEQUENCES, ...STORY_SEQUENCES];
