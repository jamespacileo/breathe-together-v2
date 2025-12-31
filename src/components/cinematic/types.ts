/**
 * Cinematic Intro Types
 *
 * Phase-based state machine for the cinematic landing experience.
 */

/**
 * Intro phases in sequence:
 * - void: Pure black, letterbox visible
 * - glow: Warm center glow emerges
 * - reveal: Camera pulls back, fog clears, scene appears
 * - title: "breathe together" text fades in
 * - cta: Call-to-action "Begin" button appears
 * - complete: Intro finished, unmount
 */
export type IntroPhase = 'void' | 'glow' | 'reveal' | 'title' | 'cta' | 'complete';

/**
 * Phase timing configuration (milliseconds)
 */
export const PHASE_TIMING: Record<IntroPhase, number> = {
  void: 1500, // 1.5s black screen
  glow: 2000, // 2s warm glow
  reveal: 3500, // 3.5s camera dolly + fog clear
  title: 4000, // 4s title display
  cta: 0, // CTA waits for user interaction (no auto-advance)
  complete: 0, // Immediate transition
};

/**
 * Phase sequence for iteration
 */
export const PHASE_SEQUENCE: IntroPhase[] = ['void', 'glow', 'reveal', 'title', 'cta', 'complete'];

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
