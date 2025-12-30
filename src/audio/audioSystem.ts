/**
 * Audio System - ECS integration for breath-synchronized audio
 *
 * Runs every frame after breathSystem, reads breath state traits,
 * and updates audio parameters accordingly.
 */

import type { World } from 'koota';
import {
  phaseType,
  easedProgress,
} from '../entities/breath/traits';
import type { AudioEngine } from './AudioEngine';

/**
 * Audio system - runs every frame after breathSystem
 *
 * Reads breath state from ECS and updates audio engine parameters.
 */
export function audioSystem(
  world: World,
  _delta: number,
  engine: AudioEngine | null
): void {
  // Skip if engine not ready
  if (!engine?.isReady()) return;

  // Query breath entity for current state
  try {
    const breathEntity = world.queryFirst(phaseType, easedProgress);
    if (!breathEntity) return;

    const currentPhase = breathEntity.get(phaseType)?.value ?? 0;
    const progress = breathEntity.get(easedProgress)?.value ?? 0;

    // Update audio engine with current breath state
    engine.updateBreathProgress(currentPhase, progress);
  } catch {
    // Silently catch ECS errors during unmount/remount in Triplex
  }
}
