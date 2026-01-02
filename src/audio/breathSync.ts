/**
 * Breath Synchronization - Phase detection and volume modulation
 *
 * Manages breath-reactive audio parameters:
 * - Phase change detection and triggering
 * - Volume modulation based on breath progress
 * - Smooth transitions between phases
 */

import type * as Tone from 'tone';
import { gainToDb } from './mixer';
import type { BreathSyncConfig, SoundDefinition } from './types';

const LOG_PREFIX = '[Audio:BreathSync]';

export interface BreathSyncState {
  lastPhase: number;
  syncIntensity: number;
}

export interface BreathSyncCallbacks {
  onPhaseChange?: (newPhase: number, oldPhase: number) => void;
}

/**
 * Phase volume presets - predefined curves for different moods
 */
export const PHASE_VOLUME_PRESETS = {
  default: [0.85, 1.0, 0.85, 0.7] as const, // Balanced
  subtle: [0.9, 1.0, 0.9, 0.85] as const, // Minimal variation
  dramatic: [0.6, 1.0, 0.6, 0.4] as const, // High contrast
  'hold-emphasis': [0.7, 1.0, 0.7, 0.5] as const, // Emphasize holds
} as const;

export type PhaseVolumePreset = keyof typeof PHASE_VOLUME_PRESETS;

/**
 * Create initial breath sync state
 */
export function createBreathSyncState(): BreathSyncState {
  return {
    lastPhase: -1,
    syncIntensity: 1.0,
  };
}

/**
 * Check if phase has changed and return new phase info
 */
export function detectPhaseChange(
  currentPhase: number,
  state: BreathSyncState,
): { changed: boolean; oldPhase: number } {
  const changed = currentPhase !== state.lastPhase;
  const oldPhase = state.lastPhase;

  if (changed) {
    state.lastPhase = currentPhase;
  }

  return { changed, oldPhase };
}

/**
 * Calculate target volume for a sound based on breath state
 *
 * @param definition - Sound definition with breathSync config
 * @param phase - Current breath phase (0-3)
 * @param progress - Progress within phase (0-1)
 * @param syncIntensity - How much to apply sync (0 = none, 1 = full, 2 = exaggerated)
 * @returns Target volume multiplier (0-1)
 */
export function calculateBreathVolume(
  definition: SoundDefinition,
  phase: number,
  progress: number,
  syncIntensity = 1.0,
): number | null {
  const sync = definition.breathSync;
  if (!sync) return null;

  let targetVolume: number;

  if (sync.followProgress) {
    // Volume follows eased progress within phase
    const { volumeMin, volumeMax } = sync;
    targetVolume = volumeMin + (volumeMax - volumeMin) * progress;
  } else if (sync.phaseVolumes) {
    // Volume snaps to phase-specific target
    targetVolume = sync.phaseVolumes[phase] ?? 1.0;
  } else {
    return null;
  }

  // Apply sync intensity (0 = always 1.0, 1 = normal, 2 = exaggerated)
  if (syncIntensity !== 1.0) {
    const deviation = targetVolume - 1.0;
    targetVolume = 1.0 + deviation * syncIntensity;
    // Clamp to valid range
    targetVolume = Math.max(0, Math.min(1, targetVolume));
  }

  return targetVolume;
}

/**
 * Apply breath volume to a player
 */
export function applyBreathVolume(
  player: Tone.Player,
  definition: SoundDefinition,
  targetVolume: number,
  rampTime = 0.1,
): void {
  // Calculate final dB value
  const targetDb = definition.baseVolume + gainToDb(targetVolume);
  player.volume.rampTo(targetDb, rampTime);
}

/**
 * Check if a sound should trigger on phase change
 */
export function shouldTriggerOnPhase(
  definition: SoundDefinition,
  newPhase: number,
  categoryEnabled: boolean,
): boolean {
  return definition.triggerPhase === newPhase && categoryEnabled;
}

/**
 * Get breath sync config with preset applied
 */
export function getBreathSyncWithPreset(
  breathSync: BreathSyncConfig | undefined,
  preset: PhaseVolumePreset = 'default',
): BreathSyncConfig | undefined {
  if (!breathSync) return undefined;

  // If phaseVolumes not set, use preset
  if (!breathSync.phaseVolumes && !breathSync.followProgress) {
    return {
      ...breathSync,
      phaseVolumes: [...PHASE_VOLUME_PRESETS[preset]],
    };
  }

  return breathSync;
}

/**
 * Debug helper - log current breath state
 */
export function logBreathState(phase: number, progress: number, state: BreathSyncState): void {
  const phaseNames = ['Inhale', 'Hold-In', 'Exhale', 'Hold-Out'];
  console.log(
    LOG_PREFIX,
    `Phase: ${phaseNames[phase]} (${phase})`,
    `Progress: ${(progress * 100).toFixed(0)}%`,
    `Intensity: ${state.syncIntensity}`,
  );
}
