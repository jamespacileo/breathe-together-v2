/**
 * Settings Store - User preferences and UI state
 *
 * Centralized store for all visual tuning parameters and UI settings.
 * Eliminates prop drilling throughout the component tree.
 * Persists user preferences to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/** Visual tuning parameters */
export interface VisualSettings {
  /** Number of particle shards in the swarm (24-96) */
  harmony: number;

  /** Index of refraction for frosted glass material (1.0-2.0) */
  ior: number;

  /** Glass depth/distortion intensity (0.0-1.0) */
  glassDepth: number;

  /** Base orbit radius for particle swarm (3.0-6.0) */
  orbitRadius: number;

  /** Maximum shard size (0.3-1.0) */
  shardSize: number;

  /** Atmospheric particle count (50-200) */
  atmosphereDensity: number;
}

/** UI modal visibility state */
export interface UIState {
  /** Show tuning controls modal */
  showTuneControls: boolean;

  /** Show settings modal */
  showSettings: boolean;
}

/** Store state */
interface SettingsState extends VisualSettings, UIState {}

/** Store actions */
interface SettingsActions {
  // Visual settings
  setHarmony: (value: number) => void;
  setIor: (value: number) => void;
  setGlassDepth: (value: number) => void;
  setOrbitRadius: (value: number) => void;
  setShardSize: (value: number) => void;
  setAtmosphereDensity: (value: number) => void;

  // UI state
  setShowTuneControls: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;

  // Bulk updates
  updateVisualSettings: (settings: Partial<VisualSettings>) => void;

  // Reset to defaults
  resetToDefaults: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

// ============================================================================
// Default Values
// ============================================================================

/** Default tuning values matching Monument Valley aesthetic */
export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  harmony: 48, // Normal density
  ior: 1.3, // Subtle refraction
  glassDepth: 0.3, // Medium glass depth
  orbitRadius: 4.5, // Balanced orbit
  shardSize: 0.5, // Medium shard size
  atmosphereDensity: 100, // Standard atmospheric density
};

const DEFAULT_UI_STATE: UIState = {
  showTuneControls: false,
  showSettings: false,
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_VISUAL_SETTINGS,
      ...DEFAULT_UI_STATE,

      // Visual settings actions
      setHarmony: (value) => set({ harmony: value }),
      setIor: (value) => set({ ior: value }),
      setGlassDepth: (value) => set({ glassDepth: value }),
      setOrbitRadius: (value) => set({ orbitRadius: value }),
      setShardSize: (value) => set({ shardSize: value }),
      setAtmosphereDensity: (value) => set({ atmosphereDensity: value }),

      // UI state actions
      setShowTuneControls: (value) => set({ showTuneControls: value }),
      setShowSettings: (value) => set({ showSettings: value }),

      // Bulk update
      updateVisualSettings: (settings) => set(settings),

      // Reset
      resetToDefaults: () =>
        set({
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_UI_STATE,
        }),
    }),
    {
      name: 'breathe-together-settings',
      // Only persist visual settings, not UI modal state
      partialize: (state) => ({
        harmony: state.harmony,
        ior: state.ior,
        glassDepth: state.glassDepth,
        orbitRadius: state.orbitRadius,
        shardSize: state.shardSize,
        atmosphereDensity: state.atmosphereDensity,
      }),
    },
  ),
);

// ============================================================================
// Convenience Exports
// ============================================================================

/** Get store state outside of React */
export const getSettingsState = () => useSettingsStore.getState();

/** Update settings imperatively (outside React) */
export const updateSettings = (settings: Partial<VisualSettings>) =>
  useSettingsStore.getState().updateVisualSettings(settings);

/** Reset to defaults imperatively */
export const resetSettings = () => useSettingsStore.getState().resetToDefaults();
