/**
 * SOUND REGISTRY
 *
 * Single source of truth for all sounds in the application.
 *
 * To add a new sound:
 * 1. Drop the audio file in public/audio/{category}/
 * 2. Add an entry below
 * 3. Done - the system loads it automatically
 *
 * Missing files will show a console warning but won't break the app.
 */

import type { SoundCategory, SoundDefinition } from './types';

export const SOUNDS: Record<string, SoundDefinition> = {
  // ─────────────────────────────────────────────────────
  // AMBIENT DRONES
  // Foundation layer, constant volume, loops forever
  // Files: public/audio/ambient/
  // ─────────────────────────────────────────────────────
  'ambient/warm-pad': {
    path: '/audio/ambient/warm-pad.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -12,
    fadeIn: 2,
    fadeOut: 2,
  },

  'ambient/high-shimmer': {
    path: '/audio/ambient/high-shimmer.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -15,
    fadeIn: 2,
    fadeOut: 2,
  },

  // ─────────────────────────────────────────────────────
  // BREATH TONES
  // Triggered per phase, volume follows progress
  // Files: public/audio/breath/
  // ─────────────────────────────────────────────────────
  'breath/inhale': {
    path: '/audio/breath/inhale.mp3',
    category: 'breath',
    triggerPhase: 0,
    baseVolume: -6,
    fadeIn: 0.3,
    fadeOut: 0.5,
    breathSync: {
      volumeMin: 0.3,
      volumeMax: 1.0,
      followProgress: true,
    },
  },

  'breath/hold-in': {
    path: '/audio/breath/hold-in.mp3',
    category: 'breath',
    triggerPhase: 1,
    baseVolume: -9,
    fadeIn: 0.5,
    fadeOut: 0.5,
    breathSync: {
      volumeMin: 0.8,
      volumeMax: 1.0,
      followProgress: false,
    },
  },

  'breath/exhale': {
    path: '/audio/breath/exhale.mp3',
    category: 'breath',
    triggerPhase: 2,
    baseVolume: -6,
    fadeIn: 0.3,
    fadeOut: 0.8,
    breathSync: {
      volumeMin: 1.0,
      volumeMax: 0.3,
      followProgress: true,
    },
  },

  'breath/hold-out': {
    path: '/audio/breath/hold-out.mp3',
    category: 'breath',
    triggerPhase: 3,
    baseVolume: -12,
    fadeIn: 0.3,
    fadeOut: 0.3,
    breathSync: {
      volumeMin: 0.5,
      volumeMax: 0.7,
      followProgress: false,
    },
  },

  // ─────────────────────────────────────────────────────
  // NATURE SOUNDSCAPES
  // One active at a time, volume breathes with cycle
  // Files: public/audio/nature/
  // ─────────────────────────────────────────────────────
  'nature/ocean': {
    path: '/audio/nature/ocean.mp3',
    category: 'nature',
    loop: true,
    baseVolume: -15,
    fadeIn: 3,
    fadeOut: 3,
    breathSync: {
      volumeMin: 0.7,
      volumeMax: 1.0,
      phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    },
  },

  'nature/forest': {
    path: '/audio/nature/forest.mp3',
    category: 'nature',
    loop: true,
    baseVolume: -15,
    fadeIn: 3,
    fadeOut: 3,
    breathSync: {
      volumeMin: 0.7,
      volumeMax: 1.0,
      phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    },
  },

  'nature/rain': {
    path: '/audio/nature/rain.mp3',
    category: 'nature',
    loop: true,
    baseVolume: -15,
    fadeIn: 3,
    fadeOut: 3,
    breathSync: {
      volumeMin: 0.7,
      volumeMax: 1.0,
      phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    },
  },

  'nature/wind': {
    path: '/audio/nature/wind.mp3',
    category: 'nature',
    loop: true,
    baseVolume: -15,
    fadeIn: 3,
    fadeOut: 3,
    breathSync: {
      volumeMin: 0.7,
      volumeMax: 1.0,
      phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    },
  },

  'nature/night': {
    path: '/audio/nature/night.mp3',
    category: 'nature',
    loop: true,
    baseVolume: -15,
    fadeIn: 3,
    fadeOut: 3,
    breathSync: {
      volumeMin: 0.7,
      volumeMax: 1.0,
      phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    },
  },

  // ─────────────────────────────────────────────────────
  // TRANSITION CHIMES (optional)
  // One-shot at phase boundaries
  // Files: public/audio/chimes/
  // ─────────────────────────────────────────────────────
  'chimes/inhale-bell': {
    path: '/audio/chimes/inhale-bell.mp3',
    category: 'chimes',
    triggerPhase: 0,
    baseVolume: -9,
    fadeIn: 0,
    fadeOut: 0,
  },

  'chimes/exhale-bell': {
    path: '/audio/chimes/exhale-bell.mp3',
    category: 'chimes',
    triggerPhase: 2,
    baseVolume: -9,
    fadeIn: 0,
    fadeOut: 0,
  },
};

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/**
 * Get all sounds in a category
 */
export function getSoundsByCategory(category: SoundCategory) {
  return Object.entries(SOUNDS)
    .filter(([_, def]) => def.category === category)
    .map(([id, def]) => ({ id, ...def }));
}

/**
 * Get all sound IDs
 */
export function getSoundIds(): string[] {
  return Object.keys(SOUNDS);
}

/**
 * Get all nature sound IDs
 */
export function getNatureSoundIds(): string[] {
  return getSoundsByCategory('nature').map((s) => s.id);
}

/**
 * Get a sound definition by ID
 */
export function getSound(id: string): SoundDefinition | undefined {
  return SOUNDS[id];
}
