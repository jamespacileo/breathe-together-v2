/**
 * AudioEngine - Tone.js wrapper for atmospheric audio
 *
 * Handles loading, playback, and breath synchronization.
 * Fails softly when audio files are missing (warns in console).
 */

import * as Tone from 'tone';
import { getSoundsByCategory, SOUNDS } from './registry';
import type { AudioState, SoundCategory, SoundState } from './types';

// Prefix for console messages
const LOG_PREFIX = '[Audio]';

/**
 * Convert linear gain (0-1) to decibels
 */
function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}

/**
 * Low-level audio control wrapping Tone.js
 */
export class AudioEngine {
  private players: Map<string, Tone.Player> = new Map();
  private loadingStates: Map<string, SoundState> = new Map();
  private masterGain: Tone.Gain;
  private ready = false;
  private state: AudioState;
  private lastPhase = -1;

  constructor(initialState: Omit<AudioState, 'ready' | 'loadingStates'>) {
    this.state = {
      ...initialState,
      ready: false,
      loadingStates: {},
    };
    this.masterGain = new Tone.Gain(initialState.masterVolume).toDestination();
  }

  /**
   * Initialize audio context and load all sounds
   */
  async init(): Promise<Map<string, SoundState>> {
    try {
      // Start audio context (requires user interaction)
      await Tone.start();
      console.log(LOG_PREFIX, 'Audio context started');

      // Load all sounds (soft failure for missing files)
      await this.loadSounds();

      this.ready = true;
      console.log(LOG_PREFIX, 'Audio engine ready');

      return this.loadingStates;
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to initialize audio engine:', error);
      return this.loadingStates;
    }
  }

  /**
   * Load all sounds from registry
   */
  private async loadSounds(): Promise<void> {
    const loadPromises = Object.entries(SOUNDS).map(async ([id, def]) => {
      try {
        const player = new Tone.Player({
          url: def.path,
          loop: def.loop ?? false,
          fadeIn: def.fadeIn,
          fadeOut: def.fadeOut,
          volume: def.baseVolume,
        }).connect(this.masterGain);

        // Wait for the player to load
        await Tone.loaded();

        this.players.set(id, player);
        this.loadingStates.set(id, { loaded: true, playing: false });

        console.log(LOG_PREFIX, `✓ Loaded: ${id}`);
      } catch (error) {
        // Soft failure - warn but don't throw
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.loadingStates.set(id, {
          loaded: false,
          playing: false,
          error: errorMessage,
        });

        console.warn(
          LOG_PREFIX,
          `⚠ Missing audio file: ${def.path}`,
          `\n  To fix: Add the file to public${def.path}`,
          `\n  The app will continue without this sound.`,
        );
      }
    });

    await Promise.allSettled(loadPromises);

    // Summary
    const loaded = Array.from(this.loadingStates.values()).filter((s) => s.loaded).length;
    const total = Object.keys(SOUNDS).length;
    console.log(LOG_PREFIX, `Loaded ${loaded}/${total} sounds. Missing sounds will be skipped.`);
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get loading states for all sounds
   */
  getLoadingStates(): Record<string, SoundState> {
    return Object.fromEntries(Array.from(this.loadingStates.entries()));
  }

  /**
   * Update state from provider
   */
  updateState(newState: Partial<AudioState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Check if a category is enabled
   */
  private isCategoryEnabled(category: SoundCategory): boolean {
    switch (category) {
      case 'ambient':
        return this.state.ambientEnabled;
      case 'breath':
        return this.state.breathEnabled;
      case 'nature':
        return this.state.natureSound !== null;
      case 'chimes':
        return this.state.chimesEnabled;
      case 'ui':
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if a sound is loaded and ready
   */
  private isSoundReady(id: string): boolean {
    const state = this.loadingStates.get(id);
    return state?.loaded ?? false;
  }

  /**
   * Update playing state for a sound
   */
  private setPlayingState(id: string, playing: boolean): void {
    const current = this.loadingStates.get(id);
    if (current) {
      this.loadingStates.set(id, { ...current, playing });
    }
  }

  /**
   * Handle phase transition - trigger phase-specific sounds
   */
  onPhaseChange(newPhase: number, _oldPhase: number): void {
    if (!this.ready) return;

    // Trigger phase-specific sounds
    for (const [id, def] of Object.entries(SOUNDS)) {
      if (
        def.triggerPhase === newPhase &&
        this.isCategoryEnabled(def.category) &&
        this.isSoundReady(id)
      ) {
        const player = this.players.get(id);
        if (player && player.state !== 'started') {
          player.start();
          this.setPlayingState(id, true);
        }
      }
    }
  }

  /**
   * Update breath-synced parameters every frame
   */
  updateBreathProgress(phase: number, progress: number): void {
    if (!this.ready) return;

    // Detect phase change
    if (phase !== this.lastPhase) {
      this.onPhaseChange(phase, this.lastPhase);
      this.lastPhase = phase;
    }

    // Update volume for breath-synced sounds
    for (const [id, def] of Object.entries(SOUNDS)) {
      if (!def.breathSync || !this.isCategoryEnabled(def.category)) continue;
      if (!this.isSoundReady(id)) continue;

      const player = this.players.get(id);
      if (!player) continue;

      // Only update volume for playing sounds or looping sounds
      if (player.state !== 'started' && !def.loop) continue;

      let targetVolume: number;

      if (def.breathSync.followProgress) {
        // Volume follows eased progress within phase
        const { volumeMin, volumeMax } = def.breathSync;
        targetVolume = volumeMin + (volumeMax - volumeMin) * progress;
      } else if (def.breathSync.phaseVolumes) {
        // Volume snaps to phase-specific target
        targetVolume = def.breathSync.phaseVolumes[phase];
      } else {
        continue;
      }

      // Smooth volume transition (100ms ramp)
      const targetDb = def.baseVolume + gainToDb(targetVolume);
      player.volume.rampTo(targetDb, 0.1);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.state.masterVolume = volume;
    this.masterGain.gain.rampTo(volume, 0.1);
  }

  /**
   * Start all ambient sounds
   */
  startAmbient(): void {
    if (!this.ready || !this.state.ambientEnabled) return;

    getSoundsByCategory('ambient').forEach(({ id }) => {
      if (this.isSoundReady(id)) {
        const player = this.players.get(id);
        if (player && player.state !== 'started') {
          player.start();
          this.setPlayingState(id, true);
        }
      }
    });
  }

  /**
   * Stop all ambient sounds
   */
  stopAmbient(): void {
    getSoundsByCategory('ambient').forEach(({ id }) => {
      const player = this.players.get(id);
      if (player && player.state === 'started') {
        player.stop();
        this.setPlayingState(id, false);
      }
    });
  }

  /**
   * Set nature soundscape (only one at a time)
   */
  setNatureSound(soundId: string | null): void {
    // Stop current nature sound
    if (this.state.natureSound) {
      const currentPlayer = this.players.get(this.state.natureSound);
      if (currentPlayer && currentPlayer.state === 'started') {
        currentPlayer.stop();
        this.setPlayingState(this.state.natureSound, false);
      }
    }

    this.state.natureSound = soundId;

    // Start new nature sound
    if (soundId && this.isSoundReady(soundId)) {
      const player = this.players.get(soundId);
      if (player && player.state !== 'started') {
        player.start();
        this.setPlayingState(soundId, true);
      }
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.players.forEach((player, id) => {
      if (player.state === 'started') {
        player.stop();
        const state = this.loadingStates.get(id);
        if (state) {
          this.loadingStates.set(id, { ...state, playing: false });
        }
      }
    });
  }

  /**
   * Pause audio when tab is hidden
   */
  suspend(): void {
    const context = Tone.getContext();
    if (context.state === 'running') {
      // Cast to standard AudioContext to use suspend()
      const rawCtx = context.rawContext as unknown as AudioContext;
      void rawCtx.suspend();
    }
  }

  /**
   * Resume audio when tab is visible
   */
  resume(): void {
    const context = Tone.getContext();
    if (context.state === 'suspended') {
      // Cast to standard AudioContext to use resume()
      const rawCtx = context.rawContext as unknown as AudioContext;
      void rawCtx.resume();
    }
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    this.stopAll();
    this.players.forEach((player) => {
      player.dispose();
    });
    this.players.clear();
    this.masterGain.dispose();
    this.ready = false;
    console.log(LOG_PREFIX, 'Audio engine disposed');
  }
}
