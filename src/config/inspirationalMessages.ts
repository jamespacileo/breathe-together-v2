/**
 * Inspirational Messages Configuration
 *
 * Above & Beyond inspired quotes displayed during the breathing cycle.
 * Text appears above and below the globe, fading in during inhale and out during exhale.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW TO ADD NEW MESSAGES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Add a new entry to the MESSAGES array below:
 *
 *   { top: 'Your Top Line', bottom: 'Your Bottom Line' },
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CRITERIA FOR GOOD MESSAGES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ DO:
 *   - Keep it SHORT: 2-4 words per line (reads in ~2 seconds)
 *   - Use PRESENT TENSE: "We Are" not "We Were"
 *   - Focus on UNITY themes: togetherness, connection, collective experience
 *   - Focus on PRESENCE themes: here, now, this moment
 *   - Focus on POSITIVITY: love, peace, light, trust
 *   - Make it UNIVERSAL: avoid cultural/religious specifics
 *   - Create a COMPLETE thought when top + bottom combine
 *   - Use SIMPLE vocabulary: accessible to non-native speakers
 *
 * ✗ DON'T:
 *   - Use negative words: "don't", "can't", "won't", "never"
 *   - Use imperatives that feel demanding: "You Must", "You Should"
 *   - Reference specific beliefs, religions, or ideologies
 *   - Use jargon or complex vocabulary
 *   - Make the lines too long (breaks visual balance)
 *   - Use questions (statements feel more grounding)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXAMPLES OF GOOD VS BAD
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ GOOD:
 *   { top: 'We Are All', bottom: 'We Need' }         // Unity, complete thought
 *   { top: 'This Moment', bottom: 'Is Ours' }        // Presence, simple
 *   { top: 'Peace Lives', bottom: 'Within Us' }      // Positivity, universal
 *
 * ✗ BAD:
 *   { top: 'You Should Not', bottom: 'Be Afraid' }   // Negative, imperative
 *   { top: 'Transcendental Meditation', bottom: 'Awaits' }  // Jargon, too long
 *   { top: 'What If We', bottom: 'Could Fly?' }      // Question, abstract
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAL RHYTHM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Messages rotate every CYCLES_PER_MESSAGE breathing cycles (default: 3).
 * Each cycle is 16 seconds, so users see each message for ~48 seconds.
 *
 * The text fades in during Inhale (3s), stays visible during Hold (5s),
 * then fades out during Exhale (5s). Total visible time per cycle: ~13s.
 */

export interface InspirationalMessage {
  /** Text displayed above the globe */
  top: string;
  /** Text displayed below the globe */
  bottom: string;
}

/**
 * Number of breathing cycles before rotating to the next message.
 * Each cycle is 16 seconds, so 3 cycles = 48 seconds per message.
 */
export const CYCLES_PER_MESSAGE = 3;

/**
 * Collection of inspirational messages.
 * Add new messages here following the criteria documented above.
 */
export const MESSAGES: InspirationalMessage[] = [
  // Core unity messages
  { top: 'We Are All', bottom: 'We Need' },
  { top: 'Love Is', bottom: 'The Answer' },
  { top: 'You Are Not', bottom: 'Alone' },
  { top: 'Together We', bottom: 'Breathe As One' },

  // Presence and mindfulness
  { top: 'This Moment', bottom: 'Is Ours' },
  { top: 'Be Here', bottom: 'Be Now' },
  { top: 'Surrender', bottom: 'To Now' },

  // Trust and release
  { top: 'Let Go', bottom: 'And Trust' },
  { top: 'Release', bottom: 'And Receive' },

  // Connection and collective
  { top: 'Feel The', bottom: 'Connection' },
  { top: 'We Rise', bottom: 'Together' },
  { top: 'One Breath', bottom: 'One World' },

  // Inner peace and light
  { top: 'Peace Lives', bottom: 'Within Us' },
  { top: 'The Light', bottom: 'Is In You' },
  { top: 'Stillness', bottom: 'Speaks' },
];
