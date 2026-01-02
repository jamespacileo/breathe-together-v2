/**
 * Developer Controls Hook
 *
 * Provides Leva-based controls for fine-tuning visual parameters.
 * Only renders when DEV_MODE_ENABLED is true.
 *
 * These controls are for developers/artists to iterate on visual parameters.
 * User-facing controls remain in SimpleGaiaUI.
 */
import { folder, useControls } from 'leva';
import { DEV_MODE_ENABLED } from '../config/devMode';

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

  // Debug
  showOrbitBounds: boolean;
  showPhaseMarkers: boolean;
  showTraitValues: boolean;
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
    return {
      ior: TUNING_DEFAULTS.ior,
      glassDepth: TUNING_DEFAULTS.glassDepth,
      atmosphereParticleSize: TUNING_DEFAULTS.atmosphereParticleSize,
      atmosphereBaseOpacity: TUNING_DEFAULTS.atmosphereBaseOpacity,
      atmosphereBreathingOpacity: TUNING_DEFAULTS.atmosphereBreathingOpacity,
      enableDepthOfField: TUNING_DEFAULTS.enableDepthOfField,
      focusDistance: TUNING_DEFAULTS.focusDistance,
      focalRange: TUNING_DEFAULTS.focalRange,
      maxBlur: TUNING_DEFAULTS.maxBlur,
      showClouds: TUNING_DEFAULTS.showClouds,
      showStars: TUNING_DEFAULTS.showStars,
      cloudOpacity: TUNING_DEFAULTS.cloudOpacity,
      cloudSpeed: TUNING_DEFAULTS.cloudSpeed,
      showOrbitBounds: TUNING_DEFAULTS.showOrbitBounds,
      showPhaseMarkers: TUNING_DEFAULTS.showPhaseMarkers,
      showTraitValues: TUNING_DEFAULTS.showTraitValues,
    };
  }

  // Leva controls - only created when dev mode is enabled
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional - Leva should only run in dev mode
  const controls = useControls({
    'Glass Effect': folder(
      {
        ior: {
          value: TUNING_DEFAULTS.ior,
          min: 1.0,
          max: 2.5,
          step: 0.01,
          label: 'Refraction (IOR)',
        },
        glassDepth: {
          value: TUNING_DEFAULTS.glassDepth,
          min: 0.0,
          max: 1.0,
          step: 0.01,
          label: 'Glass Depth',
        },
      },
      { collapsed: false },
    ),

    Atmosphere: folder(
      {
        atmosphereParticleSize: {
          value: TUNING_DEFAULTS.atmosphereParticleSize,
          min: 0.01,
          max: 0.5,
          step: 0.01,
          label: 'Particle Size',
        },
        atmosphereBaseOpacity: {
          value: TUNING_DEFAULTS.atmosphereBaseOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Base Opacity',
        },
        atmosphereBreathingOpacity: {
          value: TUNING_DEFAULTS.atmosphereBreathingOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Breathing Opacity',
        },
      },
      { collapsed: true },
    ),

    'Depth of Field': folder(
      {
        enableDepthOfField: {
          value: TUNING_DEFAULTS.enableDepthOfField,
          label: 'Enable DoF',
        },
        focusDistance: {
          value: TUNING_DEFAULTS.focusDistance,
          min: 5,
          max: 25,
          step: 0.5,
          label: 'Focus Distance',
        },
        focalRange: {
          value: TUNING_DEFAULTS.focalRange,
          min: 1,
          max: 20,
          step: 0.5,
          label: 'Focal Range',
        },
        maxBlur: {
          value: TUNING_DEFAULTS.maxBlur,
          min: 0,
          max: 8,
          step: 0.5,
          label: 'Max Blur',
        },
      },
      { collapsed: true },
    ),

    Environment: folder(
      {
        showClouds: {
          value: TUNING_DEFAULTS.showClouds,
          label: 'Show Clouds',
        },
        showStars: {
          value: TUNING_DEFAULTS.showStars,
          label: 'Show Stars',
        },
        cloudOpacity: {
          value: TUNING_DEFAULTS.cloudOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Cloud Opacity',
        },
        cloudSpeed: {
          value: TUNING_DEFAULTS.cloudSpeed,
          min: 0,
          max: 1,
          step: 0.05,
          label: 'Cloud Speed',
        },
      },
      { collapsed: true },
    ),

    Debug: folder(
      {
        showOrbitBounds: {
          value: TUNING_DEFAULTS.showOrbitBounds,
          label: 'Orbit Bounds',
        },
        showPhaseMarkers: {
          value: TUNING_DEFAULTS.showPhaseMarkers,
          label: 'Phase Markers',
        },
        showTraitValues: {
          value: TUNING_DEFAULTS.showTraitValues,
          label: 'Trait Values',
        },
      },
      { collapsed: true },
    ),

    // Performance folder - disabled until scene optimization is complete
    // Will include: particleDetail, shadowQuality, postProcessing toggle
    // TODO: Implement proper performance presets based on device capabilities
    // Performance: folder({
    //   lightMode: { value: false, label: 'Light Mode (Mobile)' },
    //   particleDetail: { value: 1.0, min: 0.25, max: 1.0, step: 0.25, label: 'Particle Detail' },
    //   shadowQuality: { value: 'medium', options: ['off', 'low', 'medium', 'high'], label: 'Shadows' },
    //   postProcessing: { value: true, label: 'Post Processing' },
    // }, { collapsed: true }),
  });

  return controls;
}
