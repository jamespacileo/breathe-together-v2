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
 */

// Provider and hooks
export { AudioProvider, useAudio, useAudioAvailable } from './AudioProvider';

// Registry helpers
export {
  SOUNDS,
  getSoundsByCategory,
  getSoundIds,
  getNatureSoundIds,
  getSound,
} from './registry';

// Types
export type {
  AudioState,
  AudioContextValue,
  SoundCategory,
  SoundDefinition,
  SoundState,
  BreathSyncConfig,
} from './types';
