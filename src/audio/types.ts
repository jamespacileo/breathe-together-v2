/**
 * Audio system type definitions
 */

export type SoundCategory = 'ambient' | 'breath' | 'nature' | 'chimes' | 'ui';

/**
 * Configuration for breath-synchronized volume modulation
 */
export interface BreathSyncConfig {
  /** Minimum volume multiplier (0-1) */
  volumeMin: number;
  /** Maximum volume multiplier (0-1) */
  volumeMax: number;
  /** If true, volume follows easedProgress within phase */
  followProgress?: boolean;
  /** Per-phase target volumes [inhale, hold-in, exhale, hold-out] */
  phaseVolumes?: readonly [number, number, number, number];
}

/**
 * Definition for a single sound in the registry
 */
export interface SoundDefinition {
  /** URL path from public folder (e.g., '/audio/ambient/drone.mp3') */
  path: string;
  /** Sound category for grouping and enable/disable */
  category: SoundCategory;
  /** Whether the sound loops continuously */
  loop?: boolean;
  /** Base volume in dB (-20 to 0) */
  baseVolume: number;
  /** Fade in time in seconds */
  fadeIn: number;
  /** Fade out time in seconds */
  fadeOut: number;
  /** Phase to trigger on (0=inhale, 1=hold-in, 2=exhale, 3=hold-out) */
  triggerPhase?: number;
  /** Breath synchronization configuration */
  breathSync?: BreathSyncConfig;
}

/**
 * Runtime state for a loaded sound
 */
export interface SoundState {
  /** Whether the sound loaded successfully */
  loaded: boolean;
  /** Whether the sound is currently playing */
  playing: boolean;
  /** Error message if loading failed */
  error?: string;
}

/**
 * Per-category volume levels
 */
export type CategoryVolumes = Record<SoundCategory, number>;

/**
 * Global audio state managed by AudioProvider
 */
export interface AudioState {
  /** Whether audio is enabled (user has clicked enable) */
  enabled: boolean;
  /** Whether the audio context is ready */
  ready: boolean;
  /** Master volume (0-1) */
  masterVolume: number;
  /** Whether ambient sounds are enabled */
  ambientEnabled: boolean;
  /** Whether breath-sync sounds are enabled */
  breathEnabled: boolean;
  /** Currently active nature soundscape (null = none) */
  natureSound: string | null;
  /** Whether transition chimes are enabled */
  chimesEnabled: boolean;
  /** Loading state for sounds */
  loadingStates: Record<string, SoundState>;
  /** Per-category volume levels (0-1) */
  categoryVolumes: CategoryVolumes;
  /** Breath sync intensity multiplier (0 = none, 1 = normal, 2 = exaggerated) */
  syncIntensity: number;
  /** Volume ramp time in seconds */
  rampTime: number;
}

/**
 * Audio context value exposed by useAudio hook
 */
export interface AudioContextValue {
  state: AudioState;
  /** Enable/disable audio (async - requires user interaction) */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Set master volume (0-1) */
  setMasterVolume: (volume: number) => void;
  /** Set nature soundscape (null to disable) */
  setNatureSound: (soundId: string | null) => void;
  /** Enable/disable ambient sounds */
  setAmbientEnabled: (enabled: boolean) => void;
  /** Enable/disable breath-sync sounds */
  setBreathEnabled: (enabled: boolean) => void;
  /** Enable/disable transition chimes */
  setChimesEnabled: (enabled: boolean) => void;
  /** Set volume for a specific category (0-1) */
  setCategoryVolume: (category: SoundCategory, volume: number) => void;
  /** Set breath sync intensity (0-2) */
  setSyncIntensity: (intensity: number) => void;
  /** Set volume ramp time in seconds */
  setRampTime: (time: number) => void;
}
