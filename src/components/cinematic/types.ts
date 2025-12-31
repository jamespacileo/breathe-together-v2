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
  void: 800, // 0.8s black screen
  reveal: 2000, // 2s globe reveal
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
  /** Callback when user clicks CTA */
  onJoin?: () => void;
}
