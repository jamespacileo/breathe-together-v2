/**
 * Cinematic Intro Types
 *
 * Minimal phase-based state machine for elegant landing experience.
 */

/**
 * Intro phases in sequence:
 * - reveal: Globe visible with letterbox bars, title fades in
 * - cta: Letterbox retracts, CTA button appears
 * - complete: Intro finished, user has joined
 */
export type IntroPhase = 'reveal' | 'cta' | 'complete';

/**
 * Phase timing configuration (milliseconds)
 */
export const PHASE_TIMING: Record<IntroPhase, number> = {
  reveal: 3000, // 3s - globe with letterbox, title fades in elegantly
  cta: 0, // Main menu - waits for user interaction
  complete: 0, // Immediate transition
};

/**
 * Phase sequence for iteration
 */
export const PHASE_SEQUENCE: IntroPhase[] = ['reveal', 'cta', 'complete'];

/**
 * Cinematic intro configuration
 */
export interface CinematicConfig {
  /** Skip intro entirely (for returning users) */
  skipIntro?: boolean;
  /** Duration multiplier (0.5 = faster, 2 = slower) */
  speedMultiplier?: number;
  /** Callback when intro completes */
  onComplete?: () => void;
  /** Callback when user clicks CTA (after mood selection) */
  onJoin?: (selectedMood?: string) => void;
}
