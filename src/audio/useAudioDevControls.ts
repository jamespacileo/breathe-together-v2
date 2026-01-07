/**
 * Audio Dev Controls - Leva integration for audio parameter tuning
 *
 * Provides a Leva folder with controls for:
 * - Master volume
 * - Category toggles (ambient, breath, chimes)
 * - Per-category volumes
 * - Nature soundscape selection
 * - Breath sync parameters
 * - Debug options
 *
 * Only active when DEV_MODE_ENABLED is true.
 */

import { button, folder, useControls } from 'leva';
import { createElement, type ReactElement, useCallback, useEffect, useRef } from 'react';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { useAudio, useAudioAvailable } from './AudioProvider';
import { getNatureSoundIds } from './registry';

/**
 * Audio dev controls state shape (for presets)
 */
export interface AudioDevControlsState {
  masterVolume: number;
  ambientEnabled: boolean;
  breathEnabled: boolean;
  chimesEnabled: boolean;
  natureSound: string;
  ambientVolume: number;
  breathVolume: number;
  natureVolume: number;
  chimesVolume: number;
  syncIntensity: number;
  rampTime: number;
}

/**
 * Default values for audio dev controls
 */
export const AUDIO_DEV_DEFAULTS: AudioDevControlsState = {
  masterVolume: 0.7,
  ambientEnabled: true,
  breathEnabled: true,
  chimesEnabled: false,
  natureSound: 'none',
  ambientVolume: 0.5,
  breathVolume: 0.6,
  natureVolume: 0.5,
  chimesVolume: 0.4,
  syncIntensity: 1.0,
  rampTime: 0.1,
};

/**
 * Hook for audio dev controls via Leva panel
 *
 * Integrates with the AudioProvider to control audio parameters.
 * Only renders when DEV_MODE_ENABLED is true.
 */
function useAudioDevControlsEnabled(): void {
  const audio = useAudio();

  // Track set function for programmatic updates
  // biome-ignore lint/suspicious/noExplicitAny: Leva's set function type is complex and varies based on schema
  const setRef = useRef<((values: Record<string, any>) => void) | null>(null);

  // Build nature sound options
  const natureSoundOptions = ['none', ...getNatureSoundIds()];

  // Leva controls
  const [, set] = useControls(() => ({
    Audio: folder(
      {
        // ==========================================
        // MASTER CONTROLS
        // ==========================================
        masterVolume: {
          value: audio.state.masterVolume,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Master Volume',
          hint: 'Global volume for all audio layers.',
          onChange: (v: number) => audio.setMasterVolume(v),
        },

        // ==========================================
        // CATEGORY TOGGLES
        // ==========================================
        Categories: folder(
          {
            ambientEnabled: {
              value: audio.state.ambientEnabled,
              label: 'Ambient Drones',
              hint: 'Continuous background pads. Foundation layer that plays constantly.',
              onChange: (v: boolean) => audio.setAmbientEnabled(v),
            },
            breathEnabled: {
              value: audio.state.breathEnabled,
              label: 'Breath Tones',
              hint: 'Phase-triggered sounds that follow breathing cycle.',
              onChange: (v: boolean) => audio.setBreathEnabled(v),
            },
            chimesEnabled: {
              value: audio.state.chimesEnabled,
              label: 'Transition Chimes',
              hint: 'Short bells at phase boundaries (inhale/exhale start).',
              onChange: (v: boolean) => audio.setChimesEnabled(v),
            },
            natureSound: {
              value: audio.state.natureSound || 'none',
              options: natureSoundOptions,
              label: 'Nature Soundscape',
              hint: 'Background nature layer. Only one active at a time.',
              onChange: (v: string) => audio.setNatureSound(v === 'none' ? null : v),
            },
          },
          { collapsed: false },
        ),

        // ==========================================
        // PER-LAYER VOLUMES
        // ==========================================
        'Layer Volumes': folder(
          {
            ambientVolume: {
              value: audio.state.categoryVolumes.ambient,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Ambient',
              hint: 'Relative volume of ambient drones. -12dB baseline in mix.',
              onChange: (v: number) => audio.setCategoryVolume('ambient', v),
            },
            breathVolume: {
              value: audio.state.categoryVolumes.breath,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Breath',
              hint: 'Relative volume of breath tones. -6dB baseline in mix.',
              onChange: (v: number) => audio.setCategoryVolume('breath', v),
            },
            natureVolume: {
              value: audio.state.categoryVolumes.nature,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Nature',
              hint: 'Relative volume of nature soundscape. -15dB baseline in mix.',
              onChange: (v: number) => audio.setCategoryVolume('nature', v),
            },
            chimesVolume: {
              value: audio.state.categoryVolumes.chimes,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Chimes',
              hint: 'Relative volume of transition chimes. -9dB baseline in mix.',
              onChange: (v: number) => audio.setCategoryVolume('chimes', v),
            },
          },
          { collapsed: true },
        ),

        // ==========================================
        // BREATH SYNC PARAMETERS
        // ==========================================
        'Breath Sync': folder(
          {
            syncIntensity: {
              value: audio.state.syncIntensity,
              min: 0,
              max: 2,
              step: 0.1,
              label: 'Sync Intensity',
              hint: 'How much volume changes with breath. 0 = constant, 1 = normal, 2 = dramatic.',
              onChange: (v: number) => audio.setSyncIntensity(v),
            },
            rampTime: {
              value: audio.state.rampTime,
              min: 0.01,
              max: 0.5,
              step: 0.01,
              label: 'Ramp Time (s)',
              hint: 'Smoothing for volume transitions. Lower = more responsive, higher = smoother.',
              onChange: (v: number) => audio.setRampTime(v),
            },
          },
          { collapsed: true },
        ),

        // ==========================================
        // ACTIONS
        // ==========================================
        Actions: folder(
          {
            'Enable Audio': button(
              () => {
                void audio.setEnabled(true);
              },
              { disabled: audio.state.enabled },
            ),
            'Disable Audio': button(
              () => {
                void audio.setEnabled(false);
              },
              { disabled: !audio.state.enabled },
            ),
            'Reset to Defaults': button(() => {
              if (setRef.current) {
                setRef.current(AUDIO_DEV_DEFAULTS);
              }
              // Apply defaults to audio context
              audio.setMasterVolume(AUDIO_DEV_DEFAULTS.masterVolume);
              audio.setAmbientEnabled(AUDIO_DEV_DEFAULTS.ambientEnabled);
              audio.setBreathEnabled(AUDIO_DEV_DEFAULTS.breathEnabled);
              audio.setChimesEnabled(AUDIO_DEV_DEFAULTS.chimesEnabled);
              audio.setNatureSound(
                AUDIO_DEV_DEFAULTS.natureSound === 'none' ? null : AUDIO_DEV_DEFAULTS.natureSound,
              );
              audio.setCategoryVolume('ambient', AUDIO_DEV_DEFAULTS.ambientVolume);
              audio.setCategoryVolume('breath', AUDIO_DEV_DEFAULTS.breathVolume);
              audio.setCategoryVolume('nature', AUDIO_DEV_DEFAULTS.natureVolume);
              audio.setCategoryVolume('chimes', AUDIO_DEV_DEFAULTS.chimesVolume);
              audio.setSyncIntensity(AUDIO_DEV_DEFAULTS.syncIntensity);
              audio.setRampTime(AUDIO_DEV_DEFAULTS.rampTime);
            }),
          },
          { collapsed: true },
        ),

        // ==========================================
        // DEBUG INFO
        // ==========================================
        Debug: folder(
          {
            'Log State': button(() => {
              console.log('[Audio Dev] Current state:', audio.state);
            }),
            'Log Loading States': button(() => {
              const states = audio.state.loadingStates;
              const loaded = Object.values(states).filter((s) => s.loaded).length;
              const total = Object.keys(states).length;
              console.log(`[Audio Dev] Loaded: ${loaded}/${total}`);
              console.table(states);
            }),
          },
          { collapsed: true },
        ),
      },
      { collapsed: true, order: 100 },
    ),
  }));

  // Store set function in ref
  useEffect(() => {
    setRef.current = set;
  }, [set]);

  // Sync Leva controls when audio state changes externally
  const syncControls = useCallback(() => {
    if (setRef.current) {
      setRef.current({
        masterVolume: audio.state.masterVolume,
        ambientEnabled: audio.state.ambientEnabled,
        breathEnabled: audio.state.breathEnabled,
        chimesEnabled: audio.state.chimesEnabled,
        natureSound: audio.state.natureSound || 'none',
        ambientVolume: audio.state.categoryVolumes.ambient,
        breathVolume: audio.state.categoryVolumes.breath,
        natureVolume: audio.state.categoryVolumes.nature,
        chimesVolume: audio.state.categoryVolumes.chimes,
        syncIntensity: audio.state.syncIntensity,
        rampTime: audio.state.rampTime,
      });
    }
  }, [audio.state]);

  // Sync on mount and when audio state changes
  useEffect(() => {
    syncControls();
  }, [syncControls]);
}

/**
 * Hook for audio dev controls via Leva panel.
 *
 * Note: this is only safe to call from a component that is mounted
 * conditionally (see `AudioDevControls` below). Do not add early returns
 * above hook calls in this function.
 */
export function useAudioDevControls(): void {
  useAudioDevControlsEnabled();
}

/**
 * Standalone component that activates audio dev controls.
 *
 * Use this in your scene to enable audio Leva controls:
 *
 * ```tsx
 * <AudioProvider>
 *   <AudioDevControls />
 *   <YourScene />
 * </AudioProvider>
 * ```
 */
export function AudioDevControls(): ReactElement | null {
  const isAudioAvailable = useAudioAvailable();
  if (!DEV_MODE_ENABLED || !isAudioAvailable) return null;
  return createElement(AudioDevControlsInner);
}

function AudioDevControlsInner(): null {
  useAudioDevControlsEnabled();
  return null;
}
