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
import type { AudioContextValue, AudioState, CategoryVolumes, SoundCategory } from './types';

// Default category volumes
const DEFAULT_CATEGORY_VOLUMES: CategoryVolumes = {
  ambient: 0.5,
  breath: 0.6,
  nature: 0.5,
  chimes: 0.4,
  ui: 0.3,
};

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
  categoryVolumes: DEFAULT_CATEGORY_VOLUMES,
  syncIntensity: 1.0,
  rampTime: 0.1,
};

// Create context (exported for direct useContext access when needed)
export const AudioContext = createContext<AudioContextValue | null>(null);

// Log prefix
const LOG_PREFIX = '[Audio]';

/**
 * Audio provider component
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const world = useWorld();
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioState>(defaultState);

  // Ref to capture current state for use in callbacks without creating dependencies
  // This prevents setEnabled from recreating on every state change
  const stateRef = useRef(state);
  stateRef.current = state;

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
  // Uses stateRef to read current state at call time without dependency recreation
  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Initialize engine if not already
      if (!engineRef.current) {
        console.log(LOG_PREFIX, 'Initializing audio engine...');

        // Read current state from ref to avoid stale closure
        const currentState = stateRef.current;
        const engine = new AudioEngine({
          masterVolume: currentState.masterVolume,
          ambientEnabled: currentState.ambientEnabled,
          breathEnabled: currentState.breathEnabled,
          natureSound: currentState.natureSound,
          chimesEnabled: currentState.chimesEnabled,
          syncIntensity: currentState.syncIntensity,
          rampTime: currentState.rampTime,
          categoryVolumes: currentState.categoryVolumes,
        });

        const loadingStates = await engine.init();
        engineRef.current = engine;

        // Start ambient sounds
        engine.startAmbient();

        // Start nature sound if set
        if (currentState.natureSound) {
          engine.setNatureSound(currentState.natureSound);
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
  }, []);

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

  // Set category volume
  const setCategoryVolume = useCallback((category: SoundCategory, volume: number) => {
    engineRef.current?.setCategoryVolume(category, volume);
    setState((s) => ({
      ...s,
      categoryVolumes: { ...s.categoryVolumes, [category]: volume },
    }));
  }, []);

  // Set sync intensity
  const setSyncIntensity = useCallback((intensity: number) => {
    engineRef.current?.setSyncIntensity(intensity);
    setState((s) => ({ ...s, syncIntensity: intensity }));
  }, []);

  // Set ramp time
  const setRampTime = useCallback((time: number) => {
    engineRef.current?.setRampTime(time);
    setState((s) => ({ ...s, rampTime: time }));
  }, []);

  // Run audio system every frame (only when enabled)
  // Uses stateRef to avoid recreating callback on state changes
  useFrame((_, delta) => {
    if (stateRef.current.enabled && engineRef.current) {
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
    setCategoryVolume,
    setSyncIntensity,
    setRampTime,
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
