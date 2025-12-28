import type { World } from 'koota';

export type ECSSystem = (world: World, delta: number) => void;

export interface BreathState {
  breathPhase: number; // 0-1 (Target)
  phaseType: number; // 0-3: inhale, hold-in, exhale, hold-out
  rawProgress: number; // 0-1 within phase
  easedProgress: number; // Smoothed progress
  crystallization: number; // Stillness during holds (Target)
  sphereScale: number;
  orbitRadius: number;
}
