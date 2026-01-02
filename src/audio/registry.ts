/**
 * SOUND REGISTRY
 *
 * Single source of truth for all sounds in the application.
 * Uses `as const satisfies` for type-safe sound IDs with autocomplete.
 *
 * To add a new sound:
 * 1. Drop the audio file in public/audio/{category}/
 * 2. Add an entry below
 * 3. Done - the system loads it automatically
 *
 * Missing files will show a console warning but won't break the app.
 */

import type { SoundCategory, SoundDefinition } from './types';

/**
 * Sound registry with type-safe IDs
 *
 * Using `as const satisfies` provides:
 * - Autocomplete for sound IDs
 * - Compile-time error on typos
 * - Inferred SoundId type
 */
export const SOUNDS = {
  // ─────────────────────────────────────────────────────
  // AMBIENT DRONES
  // Foundation layer, constant volume, loops forever
  // Files: public/audio/ambient/
  // ─────────────────────────────────────────────────────
  'ambient/warm-pad': {
    path: '/audio/ambient/warm-pad.opt.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -12,
    fadeIn: 2,
    fadeOut: 2,
  },

  'ambient/high-shimmer': {
    path: '/audio/ambient/high-shimmer.opt.mp3',
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
    path: '/audio/breath/inhale.opt.mp3',
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
    path: '/audio/breath/exhale.opt.mp3',
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
    path: '/audio/nature/forest.opt.mp3',
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
    path: '/audio/nature/night.opt.mp3',
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
    path: '/audio/chimes/exhale-bell.opt.mp3',
    category: 'chimes',
    triggerPhase: 2,
    baseVolume: -9,
    fadeIn: 0,
    fadeOut: 0,
  },
} as const satisfies Record<string, SoundDefinition>;

/**
 * Type-safe sound ID derived from registry keys
 */
export type SoundId = keyof typeof SOUNDS;

/**
 * Array of all sound IDs for iteration
 */
export const SOUND_IDS = Object.keys(SOUNDS) as SoundId[];

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/**
 * Get all sounds in a category
 */
export function getSoundsByCategory(category: SoundCategory) {
  return Object.entries(SOUNDS)
    .filter(([_, def]) => def.category === category)
    .map(([id, def]) => ({ id: id as SoundId, ...def }));
}

/**
 * Get all sound IDs
 */
export function getSoundIds(): SoundId[] {
  return SOUND_IDS;
}

/**
 * Get all nature sound IDs
 */
export function getNatureSoundIds(): SoundId[] {
  return getSoundsByCategory('nature').map((s) => s.id);
}

/**
 * Get a sound definition by ID (type-safe)
 */
export function getSound(id: SoundId): SoundDefinition {
  return SOUNDS[id];
}

/**
 * Check if a string is a valid sound ID
 */
export function isValidSoundId(id: string): id is SoundId {
  return id in SOUNDS;
}
