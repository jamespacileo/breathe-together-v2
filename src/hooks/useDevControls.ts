/**
 * Developer Controls Hook
 *
 * Provides Leva-based controls for fine-tuning visual parameters.
 * Only renders when DEV_MODE_ENABLED is true.
 *
 * Features:
 * - Save/Load presets to localStorage
 * - Reset to defaults
 * - Help text (hints) for all controls
 * - Color customization for scene elements
 *
 * These controls are for developers/artists to iterate on visual parameters.
 * User-facing controls remain in SimpleGaiaUI.
 */
import { button, folder, useControls } from 'leva';
import { useCallback, useEffect, useRef } from 'react';
import { DEV_MODE_ENABLED } from '../config/devMode';

/** localStorage key for saved dev presets */
const STORAGE_KEY = 'breathe-together-dev-presets';

/**
 * Tuning defaults - single source of truth for all configurable values
 */
export const TUNING_DEFAULTS = {
  // Particles (user-facing)
  harmony: 48,
  shardSize: 0.5,
  orbitRadius: 4.5,

  // Glass effect (dev-only)
  ior: 1.3,
  glassDepth: 0.3,

  // Atmosphere (user-facing density, dev-only appearance)
  atmosphereDensity: 100,
  atmosphereParticleSize: 0.08,
  atmosphereBaseOpacity: 0.1,
  atmosphereBreathingOpacity: 0.15,
  atmosphereColor: '#8c7b6c',

  // Depth of Field (dev-only)
  enableDepthOfField: true,
  focusDistance: 15,
  focalRange: 8,
  maxBlur: 3,

  // Environment (dev-only)
  showClouds: true,
  showStars: true,
  cloudOpacity: 0.4,
  cloudSpeed: 0.3,

  // Colors - Background
  bgColorTop: '#f5f0e8',
  bgColorHorizon: '#fcf0e0',

  // Colors - Lighting
  ambientLightColor: '#fff5eb',
  ambientLightIntensity: 0.5,
  keyLightColor: '#ffe4c4',
  keyLightIntensity: 0.8,

  // Colors - Globe
  globeRingColor: '#e8c4b8',
  globeRingOpacity: 0.15,
  globeAtmosphereTint: '#f8d0a8',

  // Debug (dev-only)
  showOrbitBounds: false,
  showPhaseMarkers: false,
  showTraitValues: false,
} as const;

/**
 * Preset configurations for user-facing controls
 */
export const PRESETS = {
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

export type PresetName = keyof typeof PRESETS;

/**
 * Dev controls state shape
 */
export interface DevControlsState {
  // Glass effect
  ior: number;
  glassDepth: number;

  // Atmosphere appearance
  atmosphereParticleSize: number;
  atmosphereBaseOpacity: number;
  atmosphereBreathingOpacity: number;
  atmosphereColor: string;

  // Depth of Field
  enableDepthOfField: boolean;
  focusDistance: number;
  focalRange: number;
  maxBlur: number;

  // Environment
  showClouds: boolean;
  showStars: boolean;
  cloudOpacity: number;
  cloudSpeed: number;

  // Colors - Background
  bgColorTop: string;
  bgColorHorizon: string;

  // Colors - Lighting
  ambientLightColor: string;
  ambientLightIntensity: number;
  keyLightColor: string;
  keyLightIntensity: number;

  // Colors - Globe
  globeRingColor: string;
  globeRingOpacity: number;
  globeAtmosphereTint: string;

  // Debug
  showOrbitBounds: boolean;
  showPhaseMarkers: boolean;
  showTraitValues: boolean;
}

/** Get default values for all dev controls */
function getDefaultDevControls(): DevControlsState {
  return {
    ior: TUNING_DEFAULTS.ior,
    glassDepth: TUNING_DEFAULTS.glassDepth,
    atmosphereParticleSize: TUNING_DEFAULTS.atmosphereParticleSize,
    atmosphereBaseOpacity: TUNING_DEFAULTS.atmosphereBaseOpacity,
    atmosphereBreathingOpacity: TUNING_DEFAULTS.atmosphereBreathingOpacity,
    atmosphereColor: TUNING_DEFAULTS.atmosphereColor,
    enableDepthOfField: TUNING_DEFAULTS.enableDepthOfField,
    focusDistance: TUNING_DEFAULTS.focusDistance,
    focalRange: TUNING_DEFAULTS.focalRange,
    maxBlur: TUNING_DEFAULTS.maxBlur,
    showClouds: TUNING_DEFAULTS.showClouds,
    showStars: TUNING_DEFAULTS.showStars,
    cloudOpacity: TUNING_DEFAULTS.cloudOpacity,
    cloudSpeed: TUNING_DEFAULTS.cloudSpeed,
    bgColorTop: TUNING_DEFAULTS.bgColorTop,
    bgColorHorizon: TUNING_DEFAULTS.bgColorHorizon,
    ambientLightColor: TUNING_DEFAULTS.ambientLightColor,
    ambientLightIntensity: TUNING_DEFAULTS.ambientLightIntensity,
    keyLightColor: TUNING_DEFAULTS.keyLightColor,
    keyLightIntensity: TUNING_DEFAULTS.keyLightIntensity,
    globeRingColor: TUNING_DEFAULTS.globeRingColor,
    globeRingOpacity: TUNING_DEFAULTS.globeRingOpacity,
    globeAtmosphereTint: TUNING_DEFAULTS.globeAtmosphereTint,
    showOrbitBounds: TUNING_DEFAULTS.showOrbitBounds,
    showPhaseMarkers: TUNING_DEFAULTS.showPhaseMarkers,
    showTraitValues: TUNING_DEFAULTS.showTraitValues,
  };
}

/** Load saved presets from localStorage */
function loadSavedPresets(): Record<string, Partial<DevControlsState>> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/** Save presets to localStorage */
function savePresetsToStorage(presets: Record<string, Partial<DevControlsState>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Failed to save dev presets to localStorage:', e);
  }
}

/**
 * Hook for developer controls via Leva panel
 *
 * Returns dev control values that can be passed to entities.
 * When DEV_MODE_ENABLED is false, returns static defaults.
 */
export function useDevControls(): DevControlsState {
  // When dev mode is disabled, return static defaults
  if (!DEV_MODE_ENABLED) {
    return getDefaultDevControls();
  }

  // Track the set function for preset management
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional - Leva should only run in dev mode
  const setRef = useRef<((values: Partial<DevControlsState>) => void) | null>(null);

  // Leva controls - only created when dev mode is enabled
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional - Leva should only run in dev mode
  const [controls, set] = useControls(() => ({
    // ==========================================
    // PRESET MANAGEMENT
    // ==========================================
    Presets: folder(
      {
        'Save Current': button(() => {
          const name = prompt('Enter preset name:');
          if (name && setRef.current) {
            const presets = loadSavedPresets();
            // Save current control values (spread controls object, excluding functions)
            const currentValues = { ...controls } as Partial<DevControlsState>;
            presets[name] = currentValues;
            savePresetsToStorage(presets);
            alert(`Preset "${name}" saved!`);
          }
        }),
        'Load Preset': button(() => {
          const presets = loadSavedPresets();
          const names = Object.keys(presets);
          if (names.length === 0) {
            alert('No saved presets found.');
            return;
          }
          const name = prompt(`Available presets:\n${names.join('\n')}\n\nEnter name to load:`);
          if (name && presets[name] && setRef.current) {
            setRef.current(presets[name] as Partial<DevControlsState>);
          }
        }),
        'Delete Preset': button(() => {
          const presets = loadSavedPresets();
          const names = Object.keys(presets);
          if (names.length === 0) {
            alert('No saved presets found.');
            return;
          }
          const name = prompt(`Available presets:\n${names.join('\n')}\n\nEnter name to delete:`);
          if (name && presets[name]) {
            delete presets[name];
            savePresetsToStorage(presets);
            alert(`Preset "${name}" deleted.`);
          }
        }),
        'Reset to Defaults': button(() => {
          if (setRef.current) {
            setRef.current(getDefaultDevControls());
          }
        }),
        'Export All': button(() => {
          const presets = loadSavedPresets();
          const data = JSON.stringify(presets, null, 2);
          navigator.clipboard.writeText(data);
          alert('Presets copied to clipboard! Save to a JSON file.');
        }),
        Import: button(() => {
          const json = prompt('Paste exported JSON:');
          if (json) {
            try {
              const imported = JSON.parse(json);
              const existing = loadSavedPresets();
              savePresetsToStorage({ ...existing, ...imported });
              alert('Presets imported successfully!');
            } catch {
              alert('Invalid JSON format.');
            }
          }
        }),
      },
      { collapsed: false, order: -1 },
    ),

    // ==========================================
    // GLASS EFFECT
    // ==========================================
    'Glass Effect': folder(
      {
        ior: {
          value: TUNING_DEFAULTS.ior,
          min: 1.0,
          max: 2.5,
          step: 0.01,
          label: 'Refraction (IOR)',
          hint: 'Index of Refraction. Controls how much light bends through glass shards. 1.0 = no refraction (air), 1.5 = glass, 2.4 = diamond.',
        },
        glassDepth: {
          value: TUNING_DEFAULTS.glassDepth,
          min: 0.0,
          max: 1.0,
          step: 0.01,
          label: 'Glass Depth',
          hint: 'Controls backface normal blending. Higher = thicker glass appearance with more internal distortion.',
        },
      },
      { collapsed: false },
    ),

    // ==========================================
    // ATMOSPHERE
    // ==========================================
    Atmosphere: folder(
      {
        atmosphereColor: {
          value: TUNING_DEFAULTS.atmosphereColor,
          label: 'Particle Color',
          hint: 'Color of floating ambient particles. Warm grays work best with the Monument Valley palette.',
        },
        atmosphereParticleSize: {
          value: TUNING_DEFAULTS.atmosphereParticleSize,
          min: 0.01,
          max: 0.5,
          step: 0.01,
          label: 'Particle Size',
          hint: 'Size of individual atmospheric sparkle particles. Smaller = more subtle dust, larger = more visible orbs.',
        },
        atmosphereBaseOpacity: {
          value: TUNING_DEFAULTS.atmosphereBaseOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Base Opacity',
          hint: 'Minimum opacity of atmospheric particles during exhale phase.',
        },
        atmosphereBreathingOpacity: {
          value: TUNING_DEFAULTS.atmosphereBreathingOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Breathing Opacity',
          hint: 'Additional opacity added during inhale. Total = base + breathing during peak inhale.',
        },
      },
      { collapsed: true },
    ),

    // ==========================================
    // COLORS - BACKGROUND
    // ==========================================
    'Background Colors': folder(
      {
        bgColorTop: {
          value: TUNING_DEFAULTS.bgColorTop,
          label: 'Sky Top',
          hint: 'Color at the top of the background gradient. Affects overall scene warmth.',
        },
        bgColorHorizon: {
          value: TUNING_DEFAULTS.bgColorHorizon,
          label: 'Horizon',
          hint: 'Color at horizon level. Creates depth and grounds the scene.',
        },
      },
      { collapsed: true },
    ),

    // ==========================================
    // COLORS - LIGHTING
    // ==========================================
    Lighting: folder(
      {
        ambientLightColor: {
          value: TUNING_DEFAULTS.ambientLightColor,
          label: 'Ambient Color',
          hint: 'Color of uniform ambient light. Warm whites maintain Monument Valley feel.',
        },
        ambientLightIntensity: {
          value: TUNING_DEFAULTS.ambientLightIntensity,
          min: 0,
          max: 2,
          step: 0.1,
          label: 'Ambient Intensity',
          hint: 'Brightness of ambient light. Higher = flatter look, lower = more dramatic shadows.',
        },
        keyLightColor: {
          value: TUNING_DEFAULTS.keyLightColor,
          label: 'Key Light Color',
          hint: 'Main directional light color. Golden tones create warm, inviting atmosphere.',
        },
        keyLightIntensity: {
          value: TUNING_DEFAULTS.keyLightIntensity,
          min: 0,
          max: 3,
          step: 0.1,
          label: 'Key Light Intensity',
          hint: 'Brightness of main directional light. Primary source of highlights and shadows.',
        },
      },
      { collapsed: true },
    ),

    // ==========================================
    // COLORS - GLOBE
    // ==========================================
    'Globe Colors': folder(
      {
        globeRingColor: {
          value: TUNING_DEFAULTS.globeRingColor,
          label: 'Ring Color',
          hint: 'Color of the equatorial ring around the Earth globe. Rose gold complements the warm palette.',
        },
        globeRingOpacity: {
          value: TUNING_DEFAULTS.globeRingOpacity,
          min: 0,
          max: 0.5,
          step: 0.01,
          label: 'Ring Opacity',
          hint: 'Transparency of the ring. Lower values are more subtle and ethereal.',
        },
        globeAtmosphereTint: {
          value: TUNING_DEFAULTS.globeAtmosphereTint,
          label: 'Atmosphere Tint',
          hint: 'Color tint for the globe atmosphere halo. Affects the warm glow around the Earth.',
        },
      },
      { collapsed: true },
    ),

    // ==========================================
    // DEPTH OF FIELD
    // ==========================================
    'Depth of Field': folder(
      {
        enableDepthOfField: {
          value: TUNING_DEFAULTS.enableDepthOfField,
          label: 'Enable DoF',
          hint: 'Toggle depth of field blur effect. Adds cinematic focus to the scene.',
        },
        focusDistance: {
          value: TUNING_DEFAULTS.focusDistance,
          min: 5,
          max: 25,
          step: 0.5,
          label: 'Focus Distance',
          hint: 'Distance from camera where objects are sharpest. 15 = centered on globe.',
        },
        focalRange: {
          value: TUNING_DEFAULTS.focalRange,
          min: 1,
          max: 20,
          step: 0.5,
          label: 'Focal Range',
          hint: 'Depth of sharp focus area. Larger = more in focus, smaller = more blur.',
        },
        maxBlur: {
          value: TUNING_DEFAULTS.maxBlur,
          min: 0,
          max: 8,
          step: 0.5,
          label: 'Max Blur',
          hint: 'Maximum blur intensity for out-of-focus areas. Higher = dreamier bokeh.',
        },
      },
      { collapsed: true },
    ),

    // ==========================================
    // ENVIRONMENT
    // ==========================================
    Environment: folder(
      {
        showClouds: {
          value: TUNING_DEFAULTS.showClouds,
          label: 'Show Clouds',
          hint: 'Toggle soft cloud sprites in the background. Adds depth and atmosphere.',
        },
        showStars: {
          value: TUNING_DEFAULTS.showStars,
          label: 'Show Stars',
          hint: 'Toggle background star field. Visible mostly in darker scenes.',
        },
        cloudOpacity: {
          value: TUNING_DEFAULTS.cloudOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Cloud Opacity',
          hint: 'Transparency of background clouds. Lower = more subtle.',
        },
        cloudSpeed: {
          value: TUNING_DEFAULTS.cloudSpeed,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Cloud Speed',
          hint: 'Animation speed of drifting clouds. 0 = frozen, 1 = fast drift.',
        },
      },
      { collapsed: true },
    ),

    // ==========================================
    // DEBUG
    // ==========================================
    Debug: folder(
      {
        showOrbitBounds: {
          value: TUNING_DEFAULTS.showOrbitBounds,
          label: 'Orbit Bounds',
          hint: 'Show min/max orbit radius wireframes. Helps visualize particle breathing range.',
        },
        showPhaseMarkers: {
          value: TUNING_DEFAULTS.showPhaseMarkers,
          label: 'Phase Markers',
          hint: 'Show breathing phase transition markers on timeline.',
        },
        showTraitValues: {
          value: TUNING_DEFAULTS.showTraitValues,
          label: 'Trait Values',
          hint: 'Display real-time ECS trait values (breathPhase, orbitRadius, etc.).',
        },
      },
      { collapsed: true },
    ),
  }));

  // Store set function in ref for preset buttons
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    setRef.current = set;
  }, [set]);

  // Load last used settings on mount
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  const hasLoadedRef = useRef(false);
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const presets = loadSavedPresets();
      if (presets.__last__) {
        set(presets.__last__ as Partial<DevControlsState>);
      }
    }
  }, [set]);

  // Auto-save current settings as "__last__" on change
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  const saveLastSettings = useCallback(() => {
    const presets = loadSavedPresets();
    // Save current control values
    const currentValues = { ...controls } as Partial<DevControlsState>;
    presets.__last__ = currentValues;
    savePresetsToStorage(presets);
  }, [controls]);

  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    // Debounce saves
    const timeout = setTimeout(saveLastSettings, 500);
    return () => clearTimeout(timeout);
  }, [saveLastSettings]);

  return controls;
}
