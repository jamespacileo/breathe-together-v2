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
import { type PowerPreference, useRendererStore } from '../stores/rendererStore';

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
              label: 'Show Stars',
              hint: 'Toggle background star field.\n\n**Visibility:** Most noticeable with darker backgrounds (bgColorTop < #e0e0e0)',
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
      },
      { collapsed: true, order: 0 },
    ),

    // ==========================================
    // 3. CAMERA
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
      { collapsed: true, order: 1 },
    ),

    // ==========================================
    // 4. INTERACTION
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
      { collapsed: true, order: 2 },
    ),

    // ==========================================
    // 5. DEBUG (consolidates Debug + Performance Monitor)
    // ==========================================
    Debug: folder(
      {
        // 5.1 Visualization
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

        // 5.2 Performance
        Performance: folder(
          {
            // GPU preference control - syncs with Zustand store
            gpuPreference: {
              value: useRendererStore.getState().powerPreference,
              options: {
                'Default (let browser decide)': 'default',
                'High Performance (discrete GPU)': 'high-performance',
                'Low Power (integrated GPU)': 'low-power',
              } as Record<string, PowerPreference>,
              label: 'GPU Mode',
              hint: 'WebGL power preference hint. "High Performance" requests the discrete GPU (better for complex scenes). "Low Power" uses integrated GPU (saves battery). Changing this will briefly reload the 3D scene.\n\n**Note:** Actual behavior depends on hardware. On single-GPU systems, all options behave the same.',
              onChange: (value: PowerPreference) => {
                // Only update if value actually changed (prevents remount loop on init)
                const current = useRendererStore.getState().powerPreference;
                if (value !== current) {
                  useRendererStore.getState().setPowerPreference(value);
                }
              },
            },
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
      { collapsed: true, order: 3 },
    ),
  }));

  // Store set function in ref for preset buttons
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    setRef.current = set;
  }, [set]);

  // Sync GPU preference from Zustand store after hydration
  // (Leva initializes before Zustand hydrates from localStorage)
  // biome-ignore lint/correctness/useHookAtTopLevel: Conditional hook is intentional
  useEffect(() => {
    // Check if already hydrated
    if (useRendererStore.persist.hasHydrated()) {
      const storedValue = useRendererStore.getState().powerPreference;
      // Type assertion needed: gpuPreference uses onChange so it's not in Leva's inferred type
      (set as (v: { gpuPreference: PowerPreference }) => void)({ gpuPreference: storedValue });
    }

    // Also register callback for when hydration completes
    const unsubscribe = useRendererStore.persist.onFinishHydration(() => {
      const storedValue = useRendererStore.getState().powerPreference;
      (set as (v: { gpuPreference: PowerPreference }) => void)({ gpuPreference: storedValue });
    });

    return unsubscribe;
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
