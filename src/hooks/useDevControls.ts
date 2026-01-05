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
  shardSize: 12.5, // Was 2.5 (multiplied by 5 to bake in baseShardSize scaling)
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
  showStars: false,
  showConstellations: true,
  showConstellationLines: true,
  showSun: true,
  cloudOpacity: 0.4,
  cloudSpeed: 0.3,
  constellationStarSize: 0.4,
  constellationLineOpacity: 0.25,
  sunSize: 8,
  sunIntensity: 1,

  // Celestial Gizmos (dev-only)
  showSunGizmo: false,
  showConstellationGizmos: false,

  // Colors - Background
  bgColorTop: '#f5f0e8',
  bgColorHorizon: '#fcf0e0',

  // Colors - Lighting
  ambientLightColor: '#fff5eb',
  ambientLightIntensity: 0.5,
  keyLightColor: '#ffe4c4',
  keyLightIntensity: 0.8,

  // HDRI Environment (dev-only)
  enableHDRI: true,
  hdriIntensity: 0.3,
  hdriBlur: 0.5,
  useHDRIBackground: false,

  // Rendering Pipeline Options (dev-only)
  usePostprocessingDoF: false, // Use @react-three/postprocessing instead of custom DoF
  useTransmissionGlobe: false, // Use MeshTransmissionMaterial for globe
  useTSLMaterials: false, // Use TSL-based materials for shards

  // Postprocessing settings (when usePostprocessingDoF is true)
  ppFocalLength: 0.02,
  ppBokehScale: 3,
  enableBloom: true,
  bloomIntensity: 0.3,
  bloomThreshold: 0.9,
  enableVignette: false,
  vignetteDarkness: 0.3,

  // Transmission Globe settings (when useTransmissionGlobe is true)
  globeTransmission: 0.9,
  globeRoughness: 0.2,
  globeIor: 1.2,
  globeThickness: 0.5,
  globeChromaticAberration: 0.03,

  // Colors - Globe
  globeRingColor: '#e8c4b8',
  globeRingOpacity: 0.15,
  globeAtmosphereTint: '#f8d0a8',

  // Stage Mode (dev-only) - minimal studio view
  stageMode: false,
  showGridFloor: true,
  gridSize: 30,
  gridDivisions: 6,
  gridColor: '#e0e0e0',

  // Debug (dev-only)
  showOrbitBounds: false,
  showPhaseMarkers: false,
  showTraitValues: false,

  // Shape Gizmos (dev-only)
  showGlobeCentroid: false,
  showGlobeBounds: false,
  showCountryCentroids: false,
  showSwarmCentroid: false,
  showSwarmBounds: false,
  showShardCentroids: false,
  showShardWireframes: false,
  showShardConnections: false,
  maxShardGizmos: 50,
  showGizmoAxes: true,
  showGizmoLabels: false,

  // Globe Gizmos (dev-only) - astronomical positioning helpers
  showGlobePoles: false,
  showGlobeEquator: false,
  showGlobeOrbitPlane: false,
  showGlobeTerminator: false,
  showGlobeAxialTilt: false,

  // User tracking (dev-only)
  highlightCurrentUser: false,
  highlightStyle: 'wireframe' as 'wireframe' | 'glow' | 'scale',

  // Performance monitoring (dev-only)
  showPerfMonitor: false,
  perfPosition: 'top-left' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  perfMinimal: false,
  perfShowGraph: true,
  perfLogsPerSecond: 10,
  perfAntialias: true,
  perfOverClock: false,
  perfDeepAnalyze: false,
  perfMatrixUpdate: false,

  // Drag & Rotate (dev-only) - iOS-style momentum scrolling
  dragSpeed: 1.8,
  dragDamping: 0.12,
  dragMomentum: 1.0,
  dragTimeConstant: 0.325,
  dragVelocityMultiplier: 0.15,
  dragMinVelocity: 50,
} as const;

/**
 * Preset configurations for user-facing controls
 */
export const PRESETS = {
  calm: {
    harmony: 24,
    shardSize: 9.0, // Was 1.8 (× 5)
    orbitRadius: 5.5,
    atmosphereDensity: 50,
  },
  centered: {
    harmony: 48,
    shardSize: 12.5, // Was 2.5 (× 5)
    orbitRadius: 4.5,
    atmosphereDensity: 100,
  },
  immersive: {
    harmony: 96,
    shardSize: 16.0, // Was 3.2 (× 5)
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
  showConstellations: boolean;
  showConstellationLines: boolean;
  showSun: boolean;
  cloudOpacity: number;
  cloudSpeed: number;
  constellationStarSize: number;
  constellationLineOpacity: number;
  sunSize: number;
  sunIntensity: number;

  // Celestial Gizmos
  showSunGizmo: boolean;
  showConstellationGizmos: boolean;

  // Colors - Background
  bgColorTop: string;
  bgColorHorizon: string;

  // Colors - Lighting
  ambientLightColor: string;
  ambientLightIntensity: number;
  keyLightColor: string;
  keyLightIntensity: number;

  // HDRI Environment
  enableHDRI: boolean;
  hdriIntensity: number;
  hdriBlur: number;
  useHDRIBackground: boolean;

  // Rendering Pipeline Options
  usePostprocessingDoF: boolean;
  useTransmissionGlobe: boolean;
  useTSLMaterials: boolean;

  // Postprocessing settings
  ppFocalLength: number;
  ppBokehScale: number;
  enableBloom: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  enableVignette: boolean;
  vignetteDarkness: number;

  // Transmission Globe settings
  globeTransmission: number;
  globeRoughness: number;
  globeIor: number;
  globeThickness: number;
  globeChromaticAberration: number;

  // Colors - Globe
  globeRingColor: string;
  globeRingOpacity: number;
  globeAtmosphereTint: string;

  // Stage Mode
  stageMode: boolean;
  showGridFloor: boolean;
  gridSize: number;
  gridDivisions: number;
  gridColor: string;

  // Debug
  showOrbitBounds: boolean;
  showPhaseMarkers: boolean;
  showTraitValues: boolean;

  // Shape Gizmos
  showGlobeCentroid: boolean;
  showGlobeBounds: boolean;
  showCountryCentroids: boolean;
  showSwarmCentroid: boolean;
  showSwarmBounds: boolean;
  showShardCentroids: boolean;
  showShardWireframes: boolean;
  showShardConnections: boolean;
  maxShardGizmos: number;
  showGizmoAxes: boolean;
  showGizmoLabels: boolean;

  // Globe Gizmos (astronomical positioning)
  showGlobePoles: boolean;
  showGlobeEquator: boolean;
  showGlobeOrbitPlane: boolean;
  showGlobeTerminator: boolean;
  showGlobeAxialTilt: boolean;

  // User tracking
  highlightCurrentUser: boolean;
  highlightStyle: 'wireframe' | 'glow' | 'scale';

  // Performance monitoring
  showPerfMonitor: boolean;
  perfPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  perfMinimal: boolean;
  perfShowGraph: boolean;
  perfLogsPerSecond: number;
  perfAntialias: boolean;
  perfOverClock: boolean;
  perfDeepAnalyze: boolean;
  perfMatrixUpdate: boolean;

  // Drag & Rotate
  dragSpeed: number;
  dragDamping: number;
  dragMomentum: number;
  dragTimeConstant: number;
  dragVelocityMultiplier: number;
  dragMinVelocity: number;
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
    showConstellations: TUNING_DEFAULTS.showConstellations,
    showConstellationLines: TUNING_DEFAULTS.showConstellationLines,
    showSun: TUNING_DEFAULTS.showSun,
    cloudOpacity: TUNING_DEFAULTS.cloudOpacity,
    cloudSpeed: TUNING_DEFAULTS.cloudSpeed,
    constellationStarSize: TUNING_DEFAULTS.constellationStarSize,
    constellationLineOpacity: TUNING_DEFAULTS.constellationLineOpacity,
    sunSize: TUNING_DEFAULTS.sunSize,
    sunIntensity: TUNING_DEFAULTS.sunIntensity,
    showSunGizmo: TUNING_DEFAULTS.showSunGizmo,
    showConstellationGizmos: TUNING_DEFAULTS.showConstellationGizmos,
    bgColorTop: TUNING_DEFAULTS.bgColorTop,
    bgColorHorizon: TUNING_DEFAULTS.bgColorHorizon,
    ambientLightColor: TUNING_DEFAULTS.ambientLightColor,
    ambientLightIntensity: TUNING_DEFAULTS.ambientLightIntensity,
    keyLightColor: TUNING_DEFAULTS.keyLightColor,
    keyLightIntensity: TUNING_DEFAULTS.keyLightIntensity,
    enableHDRI: TUNING_DEFAULTS.enableHDRI,
    hdriIntensity: TUNING_DEFAULTS.hdriIntensity,
    hdriBlur: TUNING_DEFAULTS.hdriBlur,
    useHDRIBackground: TUNING_DEFAULTS.useHDRIBackground,
    usePostprocessingDoF: TUNING_DEFAULTS.usePostprocessingDoF,
    useTransmissionGlobe: TUNING_DEFAULTS.useTransmissionGlobe,
    useTSLMaterials: TUNING_DEFAULTS.useTSLMaterials,
    ppFocalLength: TUNING_DEFAULTS.ppFocalLength,
    ppBokehScale: TUNING_DEFAULTS.ppBokehScale,
    enableBloom: TUNING_DEFAULTS.enableBloom,
    bloomIntensity: TUNING_DEFAULTS.bloomIntensity,
    bloomThreshold: TUNING_DEFAULTS.bloomThreshold,
    enableVignette: TUNING_DEFAULTS.enableVignette,
    vignetteDarkness: TUNING_DEFAULTS.vignetteDarkness,
    globeTransmission: TUNING_DEFAULTS.globeTransmission,
    globeRoughness: TUNING_DEFAULTS.globeRoughness,
    globeIor: TUNING_DEFAULTS.globeIor,
    globeThickness: TUNING_DEFAULTS.globeThickness,
    globeChromaticAberration: TUNING_DEFAULTS.globeChromaticAberration,
    globeRingColor: TUNING_DEFAULTS.globeRingColor,
    globeRingOpacity: TUNING_DEFAULTS.globeRingOpacity,
    globeAtmosphereTint: TUNING_DEFAULTS.globeAtmosphereTint,
    stageMode: TUNING_DEFAULTS.stageMode,
    showGridFloor: TUNING_DEFAULTS.showGridFloor,
    gridSize: TUNING_DEFAULTS.gridSize,
    gridDivisions: TUNING_DEFAULTS.gridDivisions,
    gridColor: TUNING_DEFAULTS.gridColor,
    showOrbitBounds: TUNING_DEFAULTS.showOrbitBounds,
    showPhaseMarkers: TUNING_DEFAULTS.showPhaseMarkers,
    showTraitValues: TUNING_DEFAULTS.showTraitValues,
    showGlobeCentroid: TUNING_DEFAULTS.showGlobeCentroid,
    showGlobeBounds: TUNING_DEFAULTS.showGlobeBounds,
    showCountryCentroids: TUNING_DEFAULTS.showCountryCentroids,
    showSwarmCentroid: TUNING_DEFAULTS.showSwarmCentroid,
    showSwarmBounds: TUNING_DEFAULTS.showSwarmBounds,
    showShardCentroids: TUNING_DEFAULTS.showShardCentroids,
    showShardWireframes: TUNING_DEFAULTS.showShardWireframes,
    showShardConnections: TUNING_DEFAULTS.showShardConnections,
    maxShardGizmos: TUNING_DEFAULTS.maxShardGizmos,
    showGizmoAxes: TUNING_DEFAULTS.showGizmoAxes,
    showGizmoLabels: TUNING_DEFAULTS.showGizmoLabels,
    showGlobePoles: TUNING_DEFAULTS.showGlobePoles,
    showGlobeEquator: TUNING_DEFAULTS.showGlobeEquator,
    showGlobeOrbitPlane: TUNING_DEFAULTS.showGlobeOrbitPlane,
    showGlobeTerminator: TUNING_DEFAULTS.showGlobeTerminator,
    showGlobeAxialTilt: TUNING_DEFAULTS.showGlobeAxialTilt,
    highlightCurrentUser: TUNING_DEFAULTS.highlightCurrentUser,
    highlightStyle: TUNING_DEFAULTS.highlightStyle,
    showPerfMonitor: TUNING_DEFAULTS.showPerfMonitor,
    perfPosition: TUNING_DEFAULTS.perfPosition,
    perfMinimal: TUNING_DEFAULTS.perfMinimal,
    perfShowGraph: TUNING_DEFAULTS.perfShowGraph,
    perfLogsPerSecond: TUNING_DEFAULTS.perfLogsPerSecond,
    perfAntialias: TUNING_DEFAULTS.perfAntialias,
    perfOverClock: TUNING_DEFAULTS.perfOverClock,
    perfDeepAnalyze: TUNING_DEFAULTS.perfDeepAnalyze,
    perfMatrixUpdate: TUNING_DEFAULTS.perfMatrixUpdate,
    dragSpeed: TUNING_DEFAULTS.dragSpeed,
    dragDamping: TUNING_DEFAULTS.dragDamping,
    dragMomentum: TUNING_DEFAULTS.dragMomentum,
    dragTimeConstant: TUNING_DEFAULTS.dragTimeConstant,
    dragVelocityMultiplier: TUNING_DEFAULTS.dragVelocityMultiplier,
    dragMinVelocity: TUNING_DEFAULTS.dragMinVelocity,
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
    // 1. PRESETS (unchanged)
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
    // 2. VISUAL (consolidates 7 folders)
    // ==========================================
    Visual: folder(
      {
        // 2.1 Materials
        Materials: folder(
          {
            ior: {
              value: TUNING_DEFAULTS.ior,
              min: 1.0,
              max: 2.5,
              step: 0.01,
              label: 'Refraction (IOR)',
              hint: 'Index of Refraction. Controls how much light bends through glass shards. 1.0 = air, 1.5 = glass, 2.4 = diamond.\n\n**When to adjust:** Increase for stronger distortion (2.0+), decrease for subtle frosting (1.1-1.3)',
            },
            glassDepth: {
              value: TUNING_DEFAULTS.glassDepth,
              min: 0.0,
              max: 1.0,
              step: 0.01,
              label: 'Glass Depth',
              hint: 'Simulates glass thickness. **0.0** = paper-thin (minimal distortion), **0.5** = medium glass (balanced), **1.0** = thick crystal (strong backface effects)',
            },
          },
          { collapsed: false },
        ),

        // 2.2 Colors
        Colors: folder(
          {
            // Background
            Background: folder(
              {
                bgColorTop: {
                  value: TUNING_DEFAULTS.bgColorTop,
                  label: 'Sky Top',
                  hint: 'Color at top of gradient.\n\n**Adjust for:** Time of day mood (cooler blues for dawn, warmer creams for noon)',
                },
                bgColorHorizon: {
                  value: TUNING_DEFAULTS.bgColorHorizon,
                  label: 'Horizon',
                  hint: 'Color at horizon.\n\n**Adjust for:** Depth contrast (darker for dramatic, lighter for ethereal)',
                },
              },
              { collapsed: true },
            ),

            // Globe
            Globe: folder(
              {
                globeRingColor: {
                  value: TUNING_DEFAULTS.globeRingColor,
                  label: 'Ring Color',
                  hint: 'Equatorial ring color.\n\n**Typical:** Rose gold (#e8c4b8) complements Monument Valley palette',
                },
                globeRingOpacity: {
                  value: TUNING_DEFAULTS.globeRingOpacity,
                  min: 0,
                  max: 0.5,
                  step: 0.01,
                  label: 'Ring Opacity',
                  hint: 'Ring transparency. **0.05** = barely visible, **0.15** = subtle (default), **0.3+** = prominent',
                },
                globeAtmosphereTint: {
                  value: TUNING_DEFAULTS.globeAtmosphereTint,
                  label: 'Atmosphere Tint',
                  hint: 'Atmosphere halo tint.\n\n**Affects:** Warmth of glow around Earth',
                },
              },
              { collapsed: true },
            ),

            // Lighting
            Lighting: folder(
              {
                ambientLightColor: {
                  value: TUNING_DEFAULTS.ambientLightColor,
                  label: 'Ambient Color',
                  hint: 'Color of uniform ambient light. Warm whites maintain Monument Valley feel.\n\n**Interacts with:** Globe ring color, atmosphere tint (keep within same temperature)',
                },
                ambientLightIntensity: {
                  value: TUNING_DEFAULTS.ambientLightIntensity,
                  min: 0,
                  max: 2,
                  step: 0.1,
                  label: 'Ambient Intensity',
                  hint: 'Brightness of ambient light. Higher = flatter look, lower = more dramatic shadows.\n\n**Performance:** No impact; computed per-fragment',
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
                  hint: 'Brightness of main directional light. Primary source of highlights and shadows.\n\n**Typical range:** Soft (0.5) → Balanced (0.8) → Dramatic (1.5+)',
                },
              },
              { collapsed: true },
            ),
          },
          { collapsed: true },
        ),

        // 2.3 Atmosphere
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
              hint: 'Size of individual atmospheric sparkle particles. Smaller = more subtle dust, larger = more visible orbs.\n\n**Performance note:** Larger particles = more fill rate cost on mobile',
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
              hint: 'Additional opacity added during inhale. Total = base + breathing during peak inhale.\n\n**Interacts with:** Base opacity (sum cannot exceed 1.0)',
            },
          },
          { collapsed: true },
        ),

        // 2.4 Environment
        Environment: folder(
          {
            showClouds: {
              value: TUNING_DEFAULTS.showClouds,
              label: 'Show Clouds',
              hint: 'Toggle soft cloud sprites in the background. Adds depth and atmosphere.',
            },
            showStars: {
              value: TUNING_DEFAULTS.showStars,
              label: 'Random Stars',
              hint: 'Toggle random decorative star field (drei Stars). Disabled by default when constellations are enabled.',
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
            // HDRI Environment Lighting
            HDRI: folder(
              {
                enableHDRI: {
                  value: TUNING_DEFAULTS.enableHDRI,
                  label: 'Enable HDRI',
                  hint: 'Toggle HDRI environment lighting.\n\nUses Belfast Sunset HDRI from Poly Haven for warm, pastel reflections on PBR materials.\n\n**Performance:** Minimal impact; HDRI is only 1k resolution',
                },
                hdriIntensity: {
                  value: TUNING_DEFAULTS.hdriIntensity,
                  min: 0,
                  max: 1,
                  step: 0.05,
                  label: 'HDRI Intensity',
                  hint: 'How strongly the HDRI affects scene lighting and reflections.\n\n**Typical range:** Subtle (0.1-0.2) → Balanced (0.3) → Strong (0.5+)',
                },
                hdriBlur: {
                  value: TUNING_DEFAULTS.hdriBlur,
                  min: 0,
                  max: 1,
                  step: 0.1,
                  label: 'HDRI Blur',
                  hint: 'Blur amount for HDRI background (when used as background).\n\n0 = sharp HDRI, 1 = fully blurred.\n\n**Only applies when:** Use HDRI Background is enabled',
                },
                useHDRIBackground: {
                  value: TUNING_DEFAULTS.useHDRIBackground,
                  label: 'Use HDRI Background',
                  hint: 'Replace gradient background with HDRI skybox.\n\n**Trade-off:** More realistic but loses custom Monument Valley gradient',
                },
              },
              { collapsed: true },
            ),
          },
          { collapsed: true },
        ),

        // 2.5 Celestial - Constellations and Sun
        Celestial: folder(
          {
            showConstellations: {
              value: TUNING_DEFAULTS.showConstellations,
              label: 'Constellations',
              hint: 'Toggle real constellation stars with connecting lines. Positions based on actual astronomical data synchronized to UTC time.',
            },
            showConstellationLines: {
              value: TUNING_DEFAULTS.showConstellationLines,
              label: 'Show Lines',
              hint: 'Toggle constellation connecting lines between stars.\n\n**Style:** Soft dashed lines in warm gold color.',
            },
            constellationStarSize: {
              value: TUNING_DEFAULTS.constellationStarSize,
              min: 0.1,
              max: 1.5,
              step: 0.05,
              label: 'Star Size',
              hint: 'Size multiplier for constellation stars. Brighter stars (lower magnitude) are automatically larger.',
            },
            constellationLineOpacity: {
              value: TUNING_DEFAULTS.constellationLineOpacity,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Line Opacity',
              hint: 'Opacity of constellation connecting lines.\n\n**Recommendation:** 0.15-0.3 for subtle ethereal look.',
            },
            showSun: {
              value: TUNING_DEFAULTS.showSun,
              label: 'Stylized Sun',
              hint: 'Toggle stylized sun positioned based on real astronomical calculations. Features breathing-synchronized pulsing.',
            },
            sunSize: {
              value: TUNING_DEFAULTS.sunSize,
              min: 2,
              max: 20,
              step: 0.5,
              label: 'Sun Size',
              hint: 'Size of the sun disc and corona.\n\n**Typical range:** Small (4) → Medium (8) → Large (15)',
            },
            sunIntensity: {
              value: TUNING_DEFAULTS.sunIntensity,
              min: 0.2,
              max: 2,
              step: 0.1,
              label: 'Sun Intensity',
              hint: 'Overall brightness/opacity of the sun. Higher values create more prominent glow.',
            },
          },
          { collapsed: false },
        ),
      },
      { collapsed: true, order: 0 },
    ),

    // ==========================================
    // 3. RENDERING PIPELINE
    // ==========================================
    'Rendering Pipeline': folder(
      {
        'Pipeline Options': folder(
          {
            usePostprocessingDoF: {
              value: TUNING_DEFAULTS.usePostprocessingDoF,
              label: 'Use Postprocessing DoF',
              hint: 'Use @react-three/postprocessing DepthOfField instead of custom RefractionPipeline DoF.\n\n**Pros:** Better bokeh, Bloom support, easier to extend\n**Cons:** Slightly different visual style',
            },
            useTransmissionGlobe: {
              value: TUNING_DEFAULTS.useTransmissionGlobe,
              label: 'Transmission Globe',
              hint: 'Use MeshTransmissionMaterial for globe instead of custom shader.\n\n**Pros:** Physical glass refraction, built-in roughness\n**Cons:** Heavier on GPU, may conflict with instanced rendering',
            },
            useTSLMaterials: {
              value: TUNING_DEFAULTS.useTSLMaterials,
              label: 'TSL Materials',
              hint: 'Use TSL (Three.js Shading Language) materials for shards.\n\n**Pros:** WebGPU ready, node-based shaders\n**Cons:** Experimental, requires WebGPU for full benefits',
            },
          },
          { collapsed: false },
        ),
        Postprocessing: folder(
          {
            ppFocalLength: {
              value: TUNING_DEFAULTS.ppFocalLength,
              min: 0.01,
              max: 0.1,
              step: 0.005,
              label: 'Focal Length',
              hint: 'Camera focal length - affects bokeh intensity.\n\nLower = more blur, higher = sharper',
              render: (get) => get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF'),
            },
            ppBokehScale: {
              value: TUNING_DEFAULTS.ppBokehScale,
              min: 0,
              max: 10,
              step: 0.5,
              label: 'Bokeh Scale',
              hint: 'Size of out-of-focus blur circles.\n\n**Typical:** 2-4 for subtle, 5+ for dreamy',
              render: (get) => get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF'),
            },
            enableBloom: {
              value: TUNING_DEFAULTS.enableBloom,
              label: 'Enable Bloom',
              hint: 'Add glow to bright highlights.\n\n**Best with:** Glass materials, sparkles',
              render: (get) => get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF'),
            },
            bloomIntensity: {
              value: TUNING_DEFAULTS.bloomIntensity,
              min: 0,
              max: 2,
              step: 0.1,
              label: 'Bloom Intensity',
              hint: 'Strength of the bloom glow effect.',
              render: (get) =>
                get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF') &&
                get('Rendering Pipeline.Postprocessing.enableBloom'),
            },
            bloomThreshold: {
              value: TUNING_DEFAULTS.bloomThreshold,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Bloom Threshold',
              hint: 'Brightness threshold for bloom. Lower = more areas glow.',
              render: (get) =>
                get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF') &&
                get('Rendering Pipeline.Postprocessing.enableBloom'),
            },
            enableVignette: {
              value: TUNING_DEFAULTS.enableVignette,
              label: 'Enable Vignette',
              hint: 'Darken screen edges for cinematic look.',
              render: (get) => get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF'),
            },
            vignetteDarkness: {
              value: TUNING_DEFAULTS.vignetteDarkness,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Vignette Darkness',
              hint: 'How dark the edges become.',
              render: (get) =>
                get('Rendering Pipeline.Pipeline Options.usePostprocessingDoF') &&
                get('Rendering Pipeline.Postprocessing.enableVignette'),
            },
          },
          { collapsed: true },
        ),
        'Transmission Globe': folder(
          {
            globeTransmission: {
              value: TUNING_DEFAULTS.globeTransmission,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Transmission',
              hint: 'Glass transparency. 0 = opaque, 1 = fully transparent.',
              render: (get) => get('Rendering Pipeline.Pipeline Options.useTransmissionGlobe'),
            },
            globeRoughness: {
              value: TUNING_DEFAULTS.globeRoughness,
              min: 0,
              max: 1,
              step: 0.05,
              label: 'Roughness',
              hint: 'Surface roughness. 0 = mirror, 1 = frosted.',
              render: (get) => get('Rendering Pipeline.Pipeline Options.useTransmissionGlobe'),
            },
            globeIor: {
              value: TUNING_DEFAULTS.globeIor,
              min: 1,
              max: 2.5,
              step: 0.1,
              label: 'IOR',
              hint: 'Index of refraction. 1 = air, 1.5 = glass, 2.4 = diamond.',
              render: (get) => get('Rendering Pipeline.Pipeline Options.useTransmissionGlobe'),
            },
            globeThickness: {
              value: TUNING_DEFAULTS.globeThickness,
              min: 0,
              max: 5,
              step: 0.1,
              label: 'Thickness',
              hint: 'Simulated glass thickness for internal distortion.',
              render: (get) => get('Rendering Pipeline.Pipeline Options.useTransmissionGlobe'),
            },
            globeChromaticAberration: {
              value: TUNING_DEFAULTS.globeChromaticAberration,
              min: 0,
              max: 0.2,
              step: 0.01,
              label: 'Chromatic Aberration',
              hint: 'Rainbow color split at edges. Subtle = 0.02, visible = 0.05+.',
              render: (get) => get('Rendering Pipeline.Pipeline Options.useTransmissionGlobe'),
            },
          },
          { collapsed: true },
        ),
      },
      { collapsed: false, order: 1 },
    ),

    // ==========================================
    // 4. CAMERA
    // ==========================================
    Camera: folder(
      {
        'Depth of Field': folder(
          {
            enableDepthOfField: {
              value: TUNING_DEFAULTS.enableDepthOfField,
              label: 'Enable DoF',
              hint: 'Toggle depth of field blur effect. Adds cinematic focus to the scene.\n\n**Performance cost:** ~2-3ms on mid-range GPUs',
            },
            focusDistance: {
              value: TUNING_DEFAULTS.focusDistance,
              min: 5,
              max: 25,
              step: 0.5,
              label: 'Focus Distance',
              hint: 'Distance from camera where objects are sharpest. 15 = centered on globe.\n\n**Tip:** Use showOrbitBounds (Debug > Visualization) to visualize focus plane',
            },
            focalRange: {
              value: TUNING_DEFAULTS.focalRange,
              min: 1,
              max: 20,
              step: 0.5,
              label: 'Focal Range',
              hint: 'Depth of sharp focus area. Larger = more in focus, smaller = more blur.\n\n**Scene context:** 8 = balanced for breathing meditation, 15+ = everything in focus',
            },
            maxBlur: {
              value: TUNING_DEFAULTS.maxBlur,
              min: 0,
              max: 8,
              step: 0.5,
              label: 'Max Blur',
              hint: 'Maximum blur intensity for out-of-focus areas. Higher = dreamier bokeh.\n\n**Interacts with:** Focal range (lower range = more blur visible)',
            },
          },
          { collapsed: false },
        ),
      },
      { collapsed: true, order: 2 },
    ),

    // ==========================================
    // 5. INTERACTION
    // ==========================================
    Interaction: folder(
      {
        'Drag & Rotate': folder(
          {
            dragSpeed: {
              value: TUNING_DEFAULTS.dragSpeed,
              min: 0.5,
              max: 4.0,
              step: 0.1,
              label: 'Drag Speed',
              hint: 'Rotation speed multiplier when dragging. Higher = faster rotation response to mouse/touch movement.',
            },
            dragDamping: {
              value: TUNING_DEFAULTS.dragDamping,
              min: 0.01,
              max: 0.5,
              step: 0.01,
              label: 'Damping',
              hint: 'Controls how quickly rotation settles. Lower = snappier stop, higher = smoother deceleration.\n\n**Recommendation:** Lower for responsive feel (0.08-0.12), higher for smooth cinematic (0.2-0.3)',
            },
            dragMomentum: {
              value: TUNING_DEFAULTS.dragMomentum,
              min: 0,
              max: 3.0,
              step: 0.1,
              label: 'Momentum',
              hint: 'iOS-style momentum multiplier. 0 = no coast after release, 1 = natural, 2+ = more spin.',
            },
            dragTimeConstant: {
              value: TUNING_DEFAULTS.dragTimeConstant,
              min: 0.1,
              max: 1.0,
              step: 0.025,
              label: 'Deceleration Time',
              hint: 'Time constant for momentum decay (seconds). Higher = longer coast.\n\n**iOS baseline:** 0.325s. Match for native app feel',
            },
            dragVelocityMultiplier: {
              value: TUNING_DEFAULTS.dragVelocityMultiplier,
              min: 0.05,
              max: 0.5,
              step: 0.01,
              label: 'Velocity Scale',
              hint: 'Converts gesture velocity to rotation. Higher = more momentum from same flick speed.',
            },
            dragMinVelocity: {
              value: TUNING_DEFAULTS.dragMinVelocity,
              min: 0,
              max: 200,
              step: 10,
              label: 'Min Velocity',
              hint: 'Minimum flick speed (px/s) to trigger momentum. Prevents micro-drifts on slow releases.\n\n**Typical:** 50px/s prevents accidental drift, 100px/s requires deliberate flick',
            },
          },
          { collapsed: false },
        ),
      },
      { collapsed: true, order: 3 },
    ),

    // ==========================================
    // 6. STAGE MODE (minimal studio view)
    // ==========================================
    'Stage Mode': folder(
      {
        stageMode: {
          value: TUNING_DEFAULTS.stageMode,
          label: 'Enable Stage Mode',
          hint: 'Toggle minimal studio view with warm white background, sparse grid, and soft radial shadow.\n\n**Use case:** Debug positioning in a clean, elegant environment',
        },
        showGridFloor: {
          value: TUNING_DEFAULTS.showGridFloor,
          label: 'Show Floor',
          hint: 'Show studio floor with sparse grid, axis crosshair, and soft shadow.\n\n**Features:** Radial shadow + sparse reference lines + X/Z axes',
          render: (get) => get('Stage Mode.stageMode'),
        },
        gridSize: {
          value: TUNING_DEFAULTS.gridSize,
          min: 15,
          max: 60,
          step: 5,
          label: 'Floor Size',
          hint: 'Total size of the floor in world units.',
          render: (get) => get('Stage Mode.stageMode') && get('Stage Mode.showGridFloor'),
        },
        gridDivisions: {
          value: TUNING_DEFAULTS.gridDivisions,
          min: 4,
          max: 12,
          step: 2,
          label: 'Grid Lines',
          hint: 'Number of reference lines (sparse). 4-6 is minimal, 8-12 for more precision.',
          render: (get) => get('Stage Mode.stageMode') && get('Stage Mode.showGridFloor'),
        },
        gridColor: {
          value: TUNING_DEFAULTS.gridColor,
          label: 'Grid Color',
          hint: 'Color of reference lines. Very light colors (#e0e0e0) blend elegantly.',
          render: (get) => get('Stage Mode.stageMode') && get('Stage Mode.showGridFloor'),
        },
      },
      { collapsed: false, order: 4 },
    ),

    // ==========================================
    // 7. DEBUG (consolidates Debug + Performance Monitor)
    // ==========================================
    Debug: folder(
      {
        // 6.1 Visualization
        Visualization: folder(
          {
            showOrbitBounds: {
              value: TUNING_DEFAULTS.showOrbitBounds,
              label: 'Orbit Bounds',
              hint: 'Show min/max orbit radius wireframes.\n\n**Use case:** Verify particle breathing range matches orbitRadius setting',
            },
            showPhaseMarkers: {
              value: TUNING_DEFAULTS.showPhaseMarkers,
              label: 'Phase Markers',
              hint: 'Show breathing phase transition markers.\n\n**Shows:** Inhale/Hold/Exhale transition markers on timeline',
            },
            showTraitValues: {
              value: TUNING_DEFAULTS.showTraitValues,
              label: 'Trait Values',
              hint: 'Display real-time ECS trait values.\n\n**Displays:** breathPhase, orbitRadius, sphereScale',
            },
          },
          { collapsed: true },
        ),

        // 5.2 Shape Gizmos
        Gizmos: folder(
          {
            'Enable All': button(() => {
              if (setRef.current) {
                setRef.current({
                  showGlobeCentroid: true,
                  showGlobeBounds: true,
                  showCountryCentroids: true,
                  showSwarmCentroid: true,
                  showSwarmBounds: true,
                  showShardCentroids: true,
                  showShardWireframes: true,
                  showShardConnections: true,
                  showSunGizmo: true,
                  showConstellationGizmos: true,
                  showGlobePoles: true,
                  showGlobeEquator: true,
                  showGlobeOrbitPlane: true,
                  showGlobeTerminator: true,
                  showGlobeAxialTilt: true,
                });
              }
            }),
            'Disable All': button(() => {
              if (setRef.current) {
                setRef.current({
                  showGlobeCentroid: false,
                  showGlobeBounds: false,
                  showCountryCentroids: false,
                  showSwarmCentroid: false,
                  showSwarmBounds: false,
                  showShardCentroids: false,
                  showShardWireframes: false,
                  showShardConnections: false,
                  showSunGizmo: false,
                  showConstellationGizmos: false,
                  showGlobePoles: false,
                  showGlobeEquator: false,
                  showGlobeOrbitPlane: false,
                  showGlobeTerminator: false,
                  showGlobeAxialTilt: false,
                });
              }
            }),
            showGlobeCentroid: {
              value: TUNING_DEFAULTS.showGlobeCentroid,
              label: 'Globe Centroid',
              hint: 'Show globe center point with XYZ axes.\n\n**Use case:** Anchor effects or UI elements to globe center',
            },
            showGlobeBounds: {
              value: TUNING_DEFAULTS.showGlobeBounds,
              label: 'Globe Bounds',
              hint: 'Show globe bounding sphere wireframes (core + atmosphere).\n\n**Use case:** Verify collision bounds and atmosphere layers',
            },
            showCountryCentroids: {
              value: TUNING_DEFAULTS.showCountryCentroids,
              label: 'Country Centroids',
              hint: 'Show centroid markers for all countries on the globe surface.\n\n**Use case:** Verify lat/lng coordinate mapping for GeoMarkers',
            },
            showSwarmCentroid: {
              value: TUNING_DEFAULTS.showSwarmCentroid,
              label: 'Swarm Centroid',
              hint: 'Show particle swarm center point.\n\n**Use case:** Anchor particle-related effects to swarm center',
            },
            showSwarmBounds: {
              value: TUNING_DEFAULTS.showSwarmBounds,
              label: 'Swarm Bounds',
              hint: 'Show particle orbit range (min/max/current radius).\n\n**Shows:** Green (min orbit at inhale), Orange (max at exhale), Yellow (current)',
            },
            showShardCentroids: {
              value: TUNING_DEFAULTS.showShardCentroids,
              label: 'Shard Centroids',
              hint: 'Show centroid markers for individual particle shards.\n\n**Use case:** Debug shard positioning and Fibonacci distribution',
            },
            showShardWireframes: {
              value: TUNING_DEFAULTS.showShardWireframes,
              label: 'Shard Wireframes',
              hint: 'Show wireframe icosahedrons at each shard position.\n\n**Use case:** Visualize shard geometry and overlap',
            },
            showShardConnections: {
              value: TUNING_DEFAULTS.showShardConnections,
              label: 'Shard Connections',
              hint: 'Draw lines connecting adjacent shard centroids.\n\n**Use case:** Visualize Fibonacci sphere topology',
            },
            maxShardGizmos: {
              value: TUNING_DEFAULTS.maxShardGizmos,
              min: 1,
              max: 200,
              step: 1,
              label: 'Max Shards',
              hint: 'Maximum number of shard gizmos to render.\n\n**Performance:** Lower values for better FPS when debugging',
            },
            showGizmoAxes: {
              value: TUNING_DEFAULTS.showGizmoAxes,
              label: 'Show Axes',
              hint: 'Display XYZ coordinate axes on centroids.\n\n**Colors:** X=Red, Y=Green, Z=Blue',
            },
            showGizmoLabels: {
              value: TUNING_DEFAULTS.showGizmoLabels,
              label: 'Show Labels',
              hint: 'Display coordinate and radius labels on gizmos.\n\n**Use case:** Precise debugging of positions and bounds',
            },
            showSunGizmo: {
              value: TUNING_DEFAULTS.showSunGizmo,
              label: 'Sun Gizmo',
              hint: 'Show debug gizmo for sun position and size.\n\n**Shows:** Wireframe sphere, axes helper, distance ring',
            },
            showConstellationGizmos: {
              value: TUNING_DEFAULTS.showConstellationGizmos,
              label: 'Constellation Gizmos',
              hint: 'Show debug gizmos for constellation stars.\n\n**Shows:** Celestial sphere wireframe, equatorial plane, pole markers',
            },
            // Globe Positioning sub-folder
            'Globe Positioning': folder(
              {
                showGlobePoles: {
                  value: TUNING_DEFAULTS.showGlobePoles,
                  label: 'North/South Poles',
                  hint: 'Show pole markers (N/S) on the globe.\n\n**Use case:** Verify Earth orientation matches real-world positioning',
                },
                showGlobeEquator: {
                  value: TUNING_DEFAULTS.showGlobeEquator,
                  label: 'Equator Ring',
                  hint: "Show equatorial plane ring around the globe.\n\n**Use case:** Visualize Earth's equatorial plane for geographical reference",
                },
                showGlobeOrbitPlane: {
                  value: TUNING_DEFAULTS.showGlobeOrbitPlane,
                  label: 'Orbit Plane',
                  hint: 'Show simplified Earth-Sun orbit visualization.\n\n**Note:** This is a pedagogical simplification - shows relative sun direction, not actual orbital mechanics',
                },
                showGlobeTerminator: {
                  value: TUNING_DEFAULTS.showGlobeTerminator,
                  label: 'Day/Night Terminator',
                  hint: 'Show the line between day and night based on real sun position.\n\n**Updates live:** Reflects actual UTC time',
                },
                showGlobeAxialTilt: {
                  value: TUNING_DEFAULTS.showGlobeAxialTilt,
                  label: 'Axial Tilt (23.4°)',
                  hint: "Show Earth's axial tilt indicator.\n\n**Shows:** Reference vertical line vs actual tilted axis",
                },
              },
              { collapsed: true },
            ),
          },
          { collapsed: true },
        ),

        // 5.4 User Tracking
        'User Tracking': folder(
          {
            highlightCurrentUser: {
              value: TUNING_DEFAULTS.highlightCurrentUser,
              label: 'Highlight My Shard',
              hint: "Show a visual indicator on the current user's particle shard.\n\n**Use case:** Verify your shard position is correctly tracked in the Fibonacci distribution",
            },
            highlightStyle: {
              value: TUNING_DEFAULTS.highlightStyle,
              options: ['wireframe', 'glow', 'scale'],
              label: 'Highlight Style',
              hint: '**wireframe** = white icosahedron outline around shard\n**glow** = pulsing white halo sphere + dim wireframe\n**scale** = 30% larger wireframe outline',
            },
          },
          { collapsed: true },
        ),

        // 5.3 Performance
        Performance: folder(
          {
            showPerfMonitor: {
              value: TUNING_DEFAULTS.showPerfMonitor,
              label: 'Enable Monitor',
              hint: 'Toggle r3f-perf overlay showing FPS, memory, and GPU stats.',
            },
            perfPosition: {
              value: TUNING_DEFAULTS.perfPosition,
              options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
              label: 'Position',
              hint: 'Corner position of the performance monitor overlay.',
            },
            perfMinimal: {
              value: TUNING_DEFAULTS.perfMinimal,
              label: 'Minimal Mode',
              hint: 'Show only FPS number without graphs or detailed stats.\n\n**Use when:** Recording videos or reducing visual clutter',
            },
            perfShowGraph: {
              value: TUNING_DEFAULTS.perfShowGraph,
              label: 'Show Graph',
              hint: 'Display FPS history graph. Useful for spotting frame drops over time.\n\n**Tip:** Graphs show 60-frame history; useful for spotting stutter patterns',
            },
            perfLogsPerSecond: {
              value: TUNING_DEFAULTS.perfLogsPerSecond,
              min: 1,
              max: 60,
              step: 1,
              label: 'Log Rate',
              hint: 'How often to sample stats per second.\n\n**Trade-off:** Higher sampling = more accurate stats but more overhead',
            },
            perfAntialias: {
              value: TUNING_DEFAULTS.perfAntialias,
              label: 'Antialias',
              hint: 'Apply antialiasing to the monitor text. Disable for sharper pixels.\n\nVisual preference only; no impact on measurements',
            },
            perfOverClock: {
              value: TUNING_DEFAULTS.perfOverClock,
              label: 'Overclock',
              hint: 'Run monitoring at higher frequency for more precise measurements.\n\n**Warning:** May add measurement overhead on low-end devices',
            },
            perfDeepAnalyze: {
              value: TUNING_DEFAULTS.perfDeepAnalyze,
              label: 'Deep Analyze',
              hint: 'Enable detailed GPU analysis. May impact performance slightly.\n\n**Shows:** GPU timing, draw calls, shader compilation time',
            },
            perfMatrixUpdate: {
              value: TUNING_DEFAULTS.perfMatrixUpdate,
              label: 'Matrix Updates',
              hint: 'Show matrix update count (how many objects moved this frame).\n\n**Normal range:** 300-500 for this scene (breathing + particles)',
            },
          },
          { collapsed: true },
        ),
      },
      { collapsed: true, order: 5 },
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

  // Ref to capture current controls for auto-save without dependency recreation
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Auto-save current settings as "__last__" on change
  // Uses controlsRef to avoid callback recreation on every controls change
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  const saveLastSettings = useCallback(() => {
    const presets = loadSavedPresets();
    // Read from ref to get current values without dependency
    const currentValues = { ...controlsRef.current } as Partial<DevControlsState>;
    presets.__last__ = currentValues;
    savePresetsToStorage(presets);
  }, []);

  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  // biome-ignore lint/correctness/useExhaustiveDependencies: controls dependency is intentional - triggers effect when any control changes to debounce-save settings
  useEffect(() => {
    // Debounce saves - triggers when controls change but callback is stable
    const timeout = setTimeout(saveLastSettings, 500);
    return () => clearTimeout(timeout);
  }, [controls, saveLastSettings]);

  // Cast needed because Leva's options return string, but we know it's one of our union values
  return controls as unknown as DevControlsState;
}
