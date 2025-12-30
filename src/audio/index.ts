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
  getNatureSoundIds,
  getSound,
  getSoundIds,
  getSoundsByCategory,
  SOUNDS,
} from './registry';

// Types
export type {
  AudioContextValue,
  AudioState,
  BreathSyncConfig,
  SoundCategory,
  SoundDefinition,
  SoundState,
} from './types';
