/**
 * AudioProvider - React context for audio state management
 *
 * Wraps the audio engine and provides hooks for components to control audio.
 * Integrates with the ECS system via useFrame.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AudioEngine } from './AudioEngine';
import { audioSystem } from './audioSystem';
import type { AudioContextValue, AudioState } from './types';

// Default state
const defaultState: AudioState = {
  enabled: false,
  ready: false,
  masterVolume: 0.7,
  ambientEnabled: true,
  breathEnabled: true,
  natureSound: null,
  chimesEnabled: false,
  loadingStates: {},
};

// Create context
const AudioContext = createContext<AudioContextValue | null>(null);

// Log prefix
const LOG_PREFIX = '[Audio]';

/**
 * Audio provider component
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const world = useWorld();
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioState>(defaultState);

  // Handle visibility change (pause when tab hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!engineRef.current) return;

      if (document.hidden) {
        engineRef.current.suspend();
      } else {
        engineRef.current.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Enable/disable audio
  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        // Initialize engine if not already
        if (!engineRef.current) {
          console.log(LOG_PREFIX, 'Initializing audio engine...');

          const engine = new AudioEngine({
            enabled: true,
            masterVolume: state.masterVolume,
            ambientEnabled: state.ambientEnabled,
            breathEnabled: state.breathEnabled,
            natureSound: state.natureSound,
            chimesEnabled: state.chimesEnabled,
          });

          const loadingStates = await engine.init();
          engineRef.current = engine;

          // Start ambient sounds
          engine.startAmbient();

          // Start nature sound if set
          if (state.natureSound) {
            engine.setNatureSound(state.natureSound);
          }

          setState((s) => ({
            ...s,
            enabled: true,
            ready: true,
            loadingStates: Object.fromEntries(loadingStates),
          }));
        } else {
          // Resume existing engine
          engineRef.current.resume();
          engineRef.current.startAmbient();
          setState((s) => ({ ...s, enabled: true }));
        }
      } else {
        // Disable audio
        if (engineRef.current) {
          engineRef.current.stopAll();
        }
        setState((s) => ({ ...s, enabled: false }));
      }
    },
    [
      state.masterVolume,
      state.ambientEnabled,
      state.breathEnabled,
      state.natureSound,
      state.chimesEnabled,
    ],
  );

  // Set master volume
  const setMasterVolume = useCallback((volume: number) => {
    engineRef.current?.setMasterVolume(volume);
    setState((s) => ({ ...s, masterVolume: volume }));
  }, []);

  // Set nature soundscape
  const setNatureSound = useCallback((soundId: string | null) => {
    engineRef.current?.setNatureSound(soundId);
    engineRef.current?.updateState({ natureSound: soundId });
    setState((s) => ({ ...s, natureSound: soundId }));
  }, []);

  // Set ambient enabled
  const setAmbientEnabled = useCallback((enabled: boolean) => {
    if (enabled) {
      engineRef.current?.startAmbient();
    } else {
      engineRef.current?.stopAmbient();
    }
    engineRef.current?.updateState({ ambientEnabled: enabled });
    setState((s) => ({ ...s, ambientEnabled: enabled }));
  }, []);

  // Set breath enabled
  const setBreathEnabled = useCallback((enabled: boolean) => {
    engineRef.current?.updateState({ breathEnabled: enabled });
    setState((s) => ({ ...s, breathEnabled: enabled }));
  }, []);

  // Set chimes enabled
  const setChimesEnabled = useCallback((enabled: boolean) => {
    engineRef.current?.updateState({ chimesEnabled: enabled });
    setState((s) => ({ ...s, chimesEnabled: enabled }));
  }, []);

  // Run audio system every frame (only when enabled)
  useFrame((_, delta) => {
    if (state.enabled && engineRef.current) {
      audioSystem(world, delta, engineRef.current);
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const value: AudioContextValue = {
    state,
    setEnabled,
    setMasterVolume,
    setNatureSound,
    setAmbientEnabled,
    setBreathEnabled,
    setChimesEnabled,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

/**
 * Hook to access audio context
 */
export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return ctx;
}

/**
 * Hook to check if audio is available (inside provider)
 */
export function useAudioAvailable(): boolean {
  const ctx = useContext(AudioContext);
  return ctx !== null;
}
