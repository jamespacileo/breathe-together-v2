/**
 * AudioEngine - Thin facade combining loader, mixer, and breath sync modules
 *
 * Provides a unified API for audio management while delegating to specialized modules.
 * Handles loading, playback, and breath synchronization.
 */

import * as Tone from 'tone';
import {
  applyBreathVolume,
  type BreathSyncState,
  calculateBreathVolume,
  createBreathSyncState,
  detectPhaseChange,
  shouldTriggerOnPhase,
} from './breathSync';
import { disposeAllSounds, getLoadingStates, type LoadedSound, loadAllSounds } from './loader';
import { AudioMixer } from './mixer';
import { isValidSoundId, SOUNDS } from './registry';
import type { AudioState, SoundCategory, SoundState } from './types';

const LOG_PREFIX = '[Audio]';

/**
 * Audio engine configuration
 */
export interface AudioEngineConfig {
  masterVolume: number;
  ambientEnabled: boolean;
  ambientSound: string | null;
  breathEnabled: boolean;
  natureSound: string | null;
  chimesEnabled: boolean;
  inhaleChime: string | null;
  exhaleChime: string | null;
  syncIntensity: number;
  rampTime: number;
  categoryVolumes: Partial<Record<SoundCategory, number>>;
}

const DEFAULT_CONFIG: AudioEngineConfig = {
  masterVolume: 0.7,
  ambientEnabled: true,
  ambientSound: 'ambient/warm-pad',
  breathEnabled: true,
  natureSound: null,
  chimesEnabled: false,
  inhaleChime: 'chimes/inhale-bell',
  exhaleChime: 'chimes/exhale-bell',
  syncIntensity: 1.0,
  rampTime: 0.1,
  categoryVolumes: {},
};

/**
 * Low-level audio control using modular architecture
 */
export class AudioEngine {
  private mixer: AudioMixer;
  private loadedSounds: Map<string, LoadedSound> = new Map();
  private breathSync: BreathSyncState;
  private ready = false;
  private config: AudioEngineConfig;

  constructor(initialConfig: Partial<AudioEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.mixer = new AudioMixer({
      masterVolume: this.config.masterVolume,
      rampTime: this.config.rampTime,
      categoryVolumes: {
        ambient: this.config.categoryVolumes.ambient ?? 0.5,
        breath: this.config.categoryVolumes.breath ?? 0.6,
        nature: this.config.categoryVolumes.nature ?? 0.5,
        chimes: this.config.categoryVolumes.chimes ?? 0.4,
        ui: this.config.categoryVolumes.ui ?? 0.3,
      },
    });
    this.breathSync = createBreathSyncState();
    this.breathSync.syncIntensity = this.config.syncIntensity;
  }

  /**
   * Initialize audio context and load all sounds
   */
  async init(): Promise<Map<string, SoundState>> {
    try {
      // Start audio context (requires user interaction)
      await Tone.start();
      console.log(LOG_PREFIX, 'Audio context started');

      // Load all sounds using the loader module
      this.loadedSounds = await loadAllSounds(SOUNDS, (category) =>
        this.mixer.getCategoryGain(category),
      );

      this.ready = true;
      console.log(LOG_PREFIX, 'Audio engine ready');

      return new Map(
        Array.from(this.loadedSounds.entries()).map(([id, sound]) => [id, sound.state]),
      );
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to initialize audio engine:', error);
      return new Map();
    }
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
    return getLoadingStates(this.loadedSounds);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Apply changes
    if (newConfig.syncIntensity !== undefined) {
      this.breathSync.syncIntensity = newConfig.syncIntensity;
    }
    if (newConfig.rampTime !== undefined) {
      this.mixer.setRampTime(newConfig.rampTime);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  updateState(newState: Partial<AudioState>): void {
    this.updateConfig({
      ambientEnabled: newState.ambientEnabled,
      breathEnabled: newState.breathEnabled,
      natureSound: newState.natureSound,
      chimesEnabled: newState.chimesEnabled,
    });
  }

  /**
   * Check if a category is enabled
   */
  private isCategoryEnabled(category: SoundCategory): boolean {
    switch (category) {
      case 'ambient':
        return this.config.ambientEnabled;
      case 'breath':
        return this.config.breathEnabled;
      case 'nature':
        return this.config.natureSound !== null;
      case 'chimes':
        return this.config.chimesEnabled;
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
    const sound = this.loadedSounds.get(id);
    return sound?.state.loaded ?? false;
  }

  /**
   * Update playing state for a sound
   */
  private setPlayingState(id: string, playing: boolean): void {
    const sound = this.loadedSounds.get(id);
    if (sound) {
      sound.state.playing = playing;
    }
  }

  /**
   * Handle phase transition - trigger phase-specific sounds
   */
  private onPhaseChange(newPhase: number, _oldPhase: number): void {
    // Handle chimes - only trigger selected variant
    if (this.config.chimesEnabled) {
      const chimeId =
        newPhase === 0 ? this.config.inhaleChime : newPhase === 2 ? this.config.exhaleChime : null;
      if (chimeId && this.isSoundReady(chimeId)) {
        const sound = this.loadedSounds.get(chimeId);
        if (sound && sound.player.state !== 'started') {
          sound.player.start();
          this.setPlayingState(chimeId, true);
        }
      }
    }

    // Handle breath sounds (non-chimes phase-triggered sounds)
    this.loadedSounds.forEach((sound, id) => {
      // Skip chimes - handled above
      if (sound.definition.category === 'chimes') return;

      if (
        shouldTriggerOnPhase(
          sound.definition,
          newPhase,
          this.isCategoryEnabled(sound.definition.category),
        ) &&
        sound.state.loaded
      ) {
        const { player } = sound;
        if (player.state !== 'started') {
          player.start();
          this.setPlayingState(id, true);
        }
      }
    });
  }

  /**
   * Update breath-synced parameters every frame
   */
  updateBreathProgress(phase: number, progress: number): void {
    if (!this.ready) return;

    // Detect phase change using breath sync module
    const { changed, oldPhase } = detectPhaseChange(phase, this.breathSync);
    if (changed) {
      this.onPhaseChange(phase, oldPhase);
    }

    // Update volume for breath-synced sounds
    const rampTime = this.mixer.getRampTime();

    this.loadedSounds.forEach((sound) => {
      const { player, definition } = sound;

      if (!definition.breathSync || !this.isCategoryEnabled(definition.category)) return;
      if (!sound.state.loaded) return;
      if (player.state !== 'started' && !definition.loop) return;

      const targetVolume = calculateBreathVolume(
        definition,
        phase,
        progress,
        this.breathSync.syncIntensity,
      );

      if (targetVolume !== null) {
        applyBreathVolume(player, definition, targetVolume, rampTime);
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // MIXER CONTROLS
  // ─────────────────────────────────────────────────────

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = volume;
    this.mixer.setMasterVolume(volume);
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.mixer.getMasterVolume();
  }

  /**
   * Set category volume
   */
  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.config.categoryVolumes[category] = volume;
    this.mixer.setCategoryVolume(category, volume);
  }

  /**
   * Get category volume
   */
  getCategoryVolume(category: SoundCategory): number {
    return this.mixer.getCategoryVolume(category);
  }

  /**
   * Get all category volumes
   */
  getAllCategoryVolumes(): Record<SoundCategory, number> {
    return this.mixer.getAllCategoryVolumes();
  }

  /**
   * Set volume ramp time
   */
  setRampTime(time: number): void {
    this.config.rampTime = time;
    this.mixer.setRampTime(time);
  }

  /**
   * Set breath sync intensity
   */
  setSyncIntensity(intensity: number): void {
    this.config.syncIntensity = intensity;
    this.breathSync.syncIntensity = intensity;
  }

  /**
   * Get breath sync intensity
   */
  getSyncIntensity(): number {
    return this.breathSync.syncIntensity;
  }

  // ─────────────────────────────────────────────────────
  // PLAYBACK CONTROLS
  // ─────────────────────────────────────────────────────

  /**
   * Start the selected ambient sound
   */
  startAmbient(): void {
    if (!this.ready || !this.config.ambientEnabled) return;

    const soundId = this.config.ambientSound;
    if (soundId && isValidSoundId(soundId) && this.isSoundReady(soundId)) {
      const sound = this.loadedSounds.get(soundId);
      if (sound && sound.player.state !== 'started') {
        sound.player.start();
        this.setPlayingState(soundId, true);
      }
    }
  }

  /**
   * Stop the current ambient sound
   */
  stopAmbient(): void {
    const soundId = this.config.ambientSound;
    if (soundId) {
      const sound = this.loadedSounds.get(soundId);
      if (sound && sound.player.state === 'started') {
        sound.player.stop();
        this.setPlayingState(soundId, false);
      }
    }
  }

  /**
   * Set ambient sound variant (only one at a time)
   */
  setAmbientSound(soundId: string): void {
    // Stop current ambient sound
    if (this.config.ambientSound) {
      const currentSound = this.loadedSounds.get(this.config.ambientSound);
      if (currentSound && currentSound.player.state === 'started') {
        currentSound.player.stop();
        this.setPlayingState(this.config.ambientSound, false);
      }
    }

    this.config.ambientSound = soundId;

    // Start new ambient sound if ambient is enabled
    if (this.config.ambientEnabled && isValidSoundId(soundId) && this.isSoundReady(soundId)) {
      const sound = this.loadedSounds.get(soundId);
      if (sound && sound.player.state !== 'started') {
        sound.player.start();
        this.setPlayingState(soundId, true);
      }
    }
  }

  /**
   * Set nature soundscape (only one at a time)
   */
  setNatureSound(soundId: string | null): void {
    // Stop current nature sound
    if (this.config.natureSound) {
      const currentSound = this.loadedSounds.get(this.config.natureSound);
      if (currentSound && currentSound.player.state === 'started') {
        currentSound.player.stop();
        this.setPlayingState(this.config.natureSound, false);
      }
    }

    this.config.natureSound = soundId;

    // Start new nature sound
    if (soundId && isValidSoundId(soundId) && this.isSoundReady(soundId)) {
      const sound = this.loadedSounds.get(soundId);
      if (sound && sound.player.state !== 'started') {
        sound.player.start();
        this.setPlayingState(soundId, true);
      }
    }
  }

  /**
   * Set inhale chime variant
   */
  setInhaleChime(soundId: string): void {
    this.config.inhaleChime = soundId;
  }

  /**
   * Set exhale chime variant
   */
  setExhaleChime(soundId: string): void {
    this.config.exhaleChime = soundId;
  }

  /**
   * Get current inhale chime ID
   */
  getInhaleChime(): string | null {
    return this.config.inhaleChime;
  }

  /**
   * Get current exhale chime ID
   */
  getExhaleChime(): string | null {
    return this.config.exhaleChime;
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.loadedSounds.forEach((sound) => {
      if (sound.player.state === 'started') {
        sound.player.stop();
        sound.state.playing = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // CONTEXT MANAGEMENT
  // ─────────────────────────────────────────────────────

  /**
   * Pause audio when tab is hidden
   */
  suspend(): void {
    const context = Tone.getContext();
    if (context.state === 'running') {
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
      const rawCtx = context.rawContext as unknown as AudioContext;
      void rawCtx.resume();
    }
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    this.stopAll();
    disposeAllSounds(this.loadedSounds);
    this.mixer.dispose();
    this.ready = false;
    console.log(LOG_PREFIX, 'Audio engine disposed');
  }
}
