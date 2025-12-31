/**
 * Cinematic Intro Types
 *
 * Simplified phase-based state machine for the cinematic landing experience.
 */

/**
 * Intro phases in sequence:
 * - void: Pure black screen
 * - reveal: Globe fades in with letterbox bars
 * - cta: Main menu state - title + CTA visible, waiting for user
 * - complete: Intro finished, user has joined
 */
export type IntroPhase = 'void' | 'reveal' | 'cta' | 'complete';

/**
 * Phase timing configuration (milliseconds)
 */
export const PHASE_TIMING: Record<IntroPhase, number> = {
  void: 1000, // 1s pure black screen
  reveal: 4000, // 4s - title fades in (15-40%), scene gently fades in (50-100%)
  cta: 0, // Main menu - waits for user interaction
  complete: 0, // Immediate transition
};

/**
 * Phase sequence for iteration
 */
export const PHASE_SEQUENCE: IntroPhase[] = ['void', 'reveal', 'cta', 'complete'];

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
