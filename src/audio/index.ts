/**
 * Audio system public API
 *
 * Usage:
 *   import { AudioProvider, useAudio } from './audio';
 *
 *   // In your app
 *   <AudioProvider>
 *     <YourScene />
 *   </AudioProvider>
 *
 *   // In components
 *   const { state, setEnabled, setNatureSound } = useAudio();
 *
 *   // Dev controls (Leva integration)
 *   import { AudioDevControls } from './audio';
 *   <AudioProvider>
 *     <AudioDevControls />
 *     <YourScene />
 *   </AudioProvider>
 */

// Provider and hooks
export { AudioProvider, useAudio, useAudioAvailable } from './AudioProvider';
// Breath sync utilities
export {
  type BreathSyncState,
  calculateBreathVolume,
  createBreathSyncState,
  detectPhaseChange,
  PHASE_VOLUME_PRESETS,
  type PhaseVolumePreset,
} from './breathSync';
// Mixer utilities
export { AudioMixer, dbToGain, gainToDb, type MixerConfig } from './mixer';
// Registry helpers
export {
  getNatureSoundIds,
  getSound,
  getSoundIds,
  getSoundsByCategory,
  isValidSoundId,
  SOUND_IDS,
  SOUNDS,
  type SoundId,
} from './registry';
// Types
export type {
  AudioContextValue,
  AudioState,
  BreathSyncConfig,
  CategoryVolumes,
  SoundCategory,
  SoundDefinition,
  SoundState,
} from './types';
// Dev controls (Leva integration)
export {
  AUDIO_DEV_DEFAULTS,
  AudioDevControls,
  type AudioDevControlsState,
  useAudioDevControls,
} from './useAudioDevControls';
