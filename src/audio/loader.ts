/**
 * Audio Loader - Handles sound file loading with soft failures
 *
 * Loads audio files from the registry and tracks loading states.
 * Missing files produce warnings but don't break the app.
 */

import * as Tone from 'tone';
import type { SoundCategory, SoundDefinition, SoundState } from './types';

const LOG_PREFIX = '[Audio:Loader]';

export interface LoadedSound {
  player: Tone.Player;
  definition: SoundDefinition;
  state: SoundState;
}

/**
 * Load a single sound file
 */
export async function loadSound(
  id: string,
  definition: SoundDefinition,
  destination: Tone.InputNode,
): Promise<LoadedSound> {
  try {
    const player = new Tone.Player({
      url: definition.path,
      loop: definition.loop ?? false,
      fadeIn: definition.fadeIn,
      fadeOut: definition.fadeOut,
      volume: definition.baseVolume,
    }).connect(destination);

    // Wait for the player to load
    await Tone.loaded();

    console.log(LOG_PREFIX, `✓ Loaded: ${id}`);

    return {
      player,
      definition,
      state: { loaded: true, playing: false },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.warn(
      LOG_PREFIX,
      `⚠ Missing audio file: ${definition.path}`,
      `\n  To fix: Add the file to public${definition.path}`,
      `\n  The app will continue without this sound.`,
    );

    // Return a dummy player for soft failure
    const dummyPlayer = new Tone.Player().connect(destination);

    return {
      player: dummyPlayer,
      definition,
      state: { loaded: false, playing: false, error: errorMessage },
    };
  }
}

/**
 * Load all sounds from a registry
 */
export async function loadAllSounds(
  sounds: Record<string, SoundDefinition>,
  getCategoryDestination: (category: SoundCategory) => Tone.InputNode,
): Promise<Map<string, LoadedSound>> {
  const loadedSounds = new Map<string, LoadedSound>();

  const loadPromises = Object.entries(sounds).map(async ([id, def]) => {
    const destination = getCategoryDestination(def.category);
    const loaded = await loadSound(id, def, destination);
    loadedSounds.set(id, loaded);
  });

  await Promise.allSettled(loadPromises);

  // Summary
  const loaded = Array.from(loadedSounds.values()).filter((s) => s.state.loaded).length;
  const total = Object.keys(sounds).length;
  console.log(LOG_PREFIX, `Loaded ${loaded}/${total} sounds. Missing sounds will be skipped.`);

  return loadedSounds;
}

/**
 * Get loading states as a plain object
 */
export function getLoadingStates(
  loadedSounds: Map<string, LoadedSound>,
): Record<string, SoundState> {
  const states: Record<string, SoundState> = {};
  loadedSounds.forEach((sound, id) => {
    states[id] = sound.state;
  });
  return states;
}

/**
 * Dispose all loaded sounds
 */
export function disposeAllSounds(loadedSounds: Map<string, LoadedSound>): void {
  loadedSounds.forEach((sound, id) => {
    try {
      sound.player.dispose();
    } catch (e) {
      console.warn(LOG_PREFIX, `Failed to dispose ${id}:`, e);
    }
  });
  loadedSounds.clear();
}
