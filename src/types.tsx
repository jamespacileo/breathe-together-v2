import type { World } from 'koota';

export type ECSSystem = (world: World, delta: number) => void;

/**
 * Breath state returned by calculateBreathState()
 *
 * Simplified (Dec 2024): Removed unused fields (easedProgress, crystallization, sphereScale)
 * Only fields actively consumed by entities are included.
 */
export interface BreathState {
  /** Breath phase 0-1: 0 = exhaled, 1 = inhaled */
  breathPhase: number;
  /** Phase type 0-3: inhale, hold-in, exhale, hold-out */
  phaseType: number;
  /** Raw progress 0-1 within current phase (used by HUD) */
  rawProgress: number;
  /** Particle orbit radius (derived from breathPhase) */
  orbitRadius: number;
}
