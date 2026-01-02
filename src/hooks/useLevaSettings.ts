/**
 * Leva Integration for Settings Store
 *
 * Connects Leva developer panel to the centralized settings store.
 * This creates a two-way binding: Leva controls update the store,
 * and store updates reflect in Leva.
 *
 * Benefits:
 * - Single source of truth (settings store)
 * - Developer UI (Leva) and user UI (SimpleGaiaUI) stay in sync
 * - Settings persist to localStorage automatically
 * - Clean separation between dev tools and production code
 */

import { button, folder, useControls } from 'leva';
import { useEffect, useRef } from 'react';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { useSettingsStore } from '../stores/settingsStore';

/** Preset configurations for quick testing */
export const VISUAL_PRESETS = {
  calm: {
    harmony: 24,
    shardSize: 0.35,
    orbitRadius: 5.5,
    atmosphereDensity: 50,
  },
  centered: {
    harmony: 48,
    shardSize: 0.5,
    orbitRadius: 4.5,
    atmosphereDensity: 100,
  },
  immersive: {
    harmony: 96,
    shardSize: 0.65,
    orbitRadius: 3.5,
    atmosphereDensity: 200,
  },
} as const;

export type PresetName = keyof typeof VISUAL_PRESETS;

/**
 * Hook that integrates Leva with settings store
 *
 * When DEV_MODE is enabled, shows Leva panel that controls the store.
 * When disabled, returns no-op to minimize bundle impact.
 */
export function useLevaSettings() {
  // Early return when dev mode is disabled
  if (!DEV_MODE_ENABLED) {
    return;
  }

  // Get store actions
  const {
    harmony,
    ior,
    glassDepth,
    orbitRadius,
    shardSize,
    atmosphereDensity,
    updateVisualSettings,
    resetToDefaults,
    // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional - Leva should only run in dev mode
  } = useSettingsStore();

  // Track the set function for syncing
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional - Leva should only run in dev mode
  // biome-ignore lint/suspicious/noExplicitAny: Leva's set function has complex generic types that are difficult to manually annotate
  const setRef = useRef<any>(null);

  // Leva controls - mirrors settings store structure
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional - Leva should only run in dev mode
  const [, set] = useControls(() => ({
    // ==========================================
    // PRESETS
    // ==========================================
    Presets: folder(
      {
        Calm: button(() => updateVisualSettings(VISUAL_PRESETS.calm)),
        Centered: button(() => updateVisualSettings(VISUAL_PRESETS.centered)),
        Immersive: button(() => updateVisualSettings(VISUAL_PRESETS.immersive)),
        Reset: button(resetToDefaults),
      },
      { collapsed: false, order: -1 },
    ),

    // ==========================================
    // USER-FACING SETTINGS
    // ==========================================
    'User Settings': folder(
      {
        harmony: {
          value: harmony,
          min: 24,
          max: 96,
          step: 12,
          label: 'Particle Count',
          hint: 'Number of glass shards orbiting the globe. More particles = denser, more immersive.',
          onChange: (v: number) => updateVisualSettings({ harmony: v }),
        },
        orbitRadius: {
          value: orbitRadius,
          min: 3.0,
          max: 6.0,
          step: 0.1,
          label: 'Orbit Radius',
          hint: 'How far particles orbit from center. Closer = intimate, farther = spacious.',
          onChange: (v: number) => updateVisualSettings({ orbitRadius: v }),
        },
        shardSize: {
          value: shardSize,
          min: 0.3,
          max: 1.0,
          step: 0.05,
          label: 'Shard Size',
          hint: 'Maximum size of glass shards. Larger = more prominent, smaller = more delicate.',
          onChange: (v: number) => updateVisualSettings({ shardSize: v }),
        },
        atmosphereDensity: {
          value: atmosphereDensity,
          min: 50,
          max: 200,
          step: 10,
          label: 'Atmosphere Density',
          hint: 'Number of ambient floating particles. Creates depth and atmosphere.',
          onChange: (v: number) => updateVisualSettings({ atmosphereDensity: v }),
        },
      },
      { collapsed: false },
    ),

    // ==========================================
    // DEVELOPER-ONLY SETTINGS
    // ==========================================
    'Glass Effect (Dev)': folder(
      {
        ior: {
          value: ior,
          min: 1.0,
          max: 2.5,
          step: 0.01,
          label: 'Refraction (IOR)',
          hint: 'Index of Refraction. 1.0 = no refraction, 1.5 = glass, 2.4 = diamond.',
          onChange: (v: number) => updateVisualSettings({ ior: v }),
        },
        glassDepth: {
          value: glassDepth,
          min: 0.0,
          max: 1.0,
          step: 0.01,
          label: 'Glass Depth',
          hint: 'Backface normal blending. Higher = thicker glass with more distortion.',
          onChange: (v: number) => updateVisualSettings({ glassDepth: v }),
        },
      },
      { collapsed: true },
    ),
  }));

  // Store set function in ref
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    setRef.current = set;
  }, [set]);

  // Sync Leva values when store changes externally
  // (e.g., user changes settings via UI)
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    if (setRef.current) {
      setRef.current({
        harmony,
        ior,
        glassDepth,
        orbitRadius,
        shardSize,
        atmosphereDensity,
      });
    }
  }, [harmony, ior, glassDepth, orbitRadius, shardSize, atmosphereDensity]);
}
