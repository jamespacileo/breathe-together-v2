/**
 * Audio Mixer - Volume and gain management with per-category control
 *
 * Manages the audio routing graph:
 * Master Gain → Category Gains → Individual Players
 */

import * as Tone from 'tone';
import type { SoundCategory } from './types';

const LOG_PREFIX = '[Audio:Mixer]';

/**
 * Convert linear gain (0-1) to decibels
 */
export function gainToDb(gain: number): number {
  if (gain <= 0) return Number.NEGATIVE_INFINITY;
  return 20 * Math.log10(gain);
}

/**
 * Convert decibels to linear gain (0-1)
 */
export function dbToGain(db: number): number {
  if (db <= Number.NEGATIVE_INFINITY) return 0;
  return 10 ** (db / 20);
}

export interface MixerConfig {
  masterVolume: number;
  categoryVolumes: Record<SoundCategory, number>;
  rampTime: number;
}

const DEFAULT_CONFIG: MixerConfig = {
  masterVolume: 0.7,
  categoryVolumes: {
    ambient: 0.5,
    breath: 0.6,
    nature: 0.5,
    chimes: 0.4,
    ui: 0.3,
  },
  rampTime: 0.1,
};

/**
 * Audio Mixer class - manages gain structure
 */
export class AudioMixer {
  private masterGain: Tone.Gain;
  private categoryGains: Map<SoundCategory, Tone.Gain> = new Map();
  private config: MixerConfig;

  constructor(config: Partial<MixerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create master gain connected to destination
    this.masterGain = new Tone.Gain(this.config.masterVolume).toDestination();

    // Create per-category gain nodes
    const categories: SoundCategory[] = ['ambient', 'breath', 'nature', 'chimes', 'ui'];
    for (const category of categories) {
      const volume = this.config.categoryVolumes[category] ?? 1.0;
      const gain = new Tone.Gain(volume).connect(this.masterGain);
      this.categoryGains.set(category, gain);
    }

    console.log(LOG_PREFIX, 'Mixer initialized with per-category gains');
  }

  /**
   * Get the gain node for a category (for connecting players)
   */
  getCategoryGain(category: SoundCategory): Tone.Gain {
    const gain = this.categoryGains.get(category);
    if (!gain) {
      console.warn(LOG_PREFIX, `Unknown category: ${category}, using master`);
      return this.masterGain;
    }
    return gain;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = volume;
    this.masterGain.gain.rampTo(volume, this.config.rampTime);
  }

  /**
   * Get current master volume
   */
  getMasterVolume(): number {
    return this.config.masterVolume;
  }

  /**
   * Set category volume (0-1)
   */
  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.config.categoryVolumes[category] = volume;
    const gain = this.categoryGains.get(category);
    if (gain) {
      gain.gain.rampTo(volume, this.config.rampTime);
    }
  }

  /**
   * Get category volume
   */
  getCategoryVolume(category: SoundCategory): number {
    return this.config.categoryVolumes[category] ?? 1.0;
  }

  /**
   * Set volume ramp time (seconds)
   */
  setRampTime(time: number): void {
    this.config.rampTime = time;
  }

  /**
   * Get current ramp time
   */
  getRampTime(): number {
    return this.config.rampTime;
  }

  /**
   * Get all category volumes
   */
  getAllCategoryVolumes(): Record<SoundCategory, number> {
    return { ...this.config.categoryVolumes };
  }

  /**
   * Dispose all gain nodes
   */
  dispose(): void {
    this.categoryGains.forEach((gain) => {
      gain.dispose();
    });
    this.categoryGains.clear();
    this.masterGain.dispose();
    console.log(LOG_PREFIX, 'Mixer disposed');
  }
}
