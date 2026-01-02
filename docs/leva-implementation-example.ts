/**
 * Leva Reorganization - Implementation Example
 *
 * This file shows how the new hierarchical structure would look in code.
 * Compare with current src/hooks/useDevControls.ts
 */

import { button, folder, useControls } from 'leva';

// Example of NEW structure (simplified for clarity)
const [controls, set] = useControls(() => ({
  // ==========================================
  // 1. PRESETS (unchanged)
  // ==========================================
  Presets: folder(
    {
      'Save Current': button(() => {
        // ... existing logic
      }),
      'Load Preset': button(() => {
        // ... existing logic
      }),
      'Reset to Defaults': button(() => {
        // ... existing logic
      }),
    },
    { collapsed: false, order: -1 }, // Top of panel, always visible
  ),

  // ==========================================
  // 2. VISUAL (NEW parent folder - consolidates 7 folders)
  // ==========================================
  Visual: folder(
    {
      // 2.1 Materials (not collapsed when Visual is expanded)
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
        { collapsed: false }, // Primary controls, keep visible
      ),

      // 2.2 Colors (collapsed sub-folder with nested groups)
      Colors: folder(
        {
          // Background sub-group
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

          // Globe sub-group
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

          // Lighting sub-group
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
    { collapsed: true, order: 0 }, // Collapsed by default to save space
  ),

  // ==========================================
  // 3. CAMERA (renamed from "Depth of Field")
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
        { collapsed: false }, // Only one sub-folder, so keep it expanded
      ),
    },
    { collapsed: true, order: 1 },
  ),

  // ==========================================
  // 4. INTERACTION (renamed from "Drag & Rotate")
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
            hint: 'Show breathing phase transition markers on timeline.\n\n**Shows:** Inhale/Hold/Exhale transition markers',
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

  // ==========================================
  // 6. AUDIO (unchanged, from useAudioDevControls)
  // ==========================================
  // Note: Audio folder is defined in useAudioDevControls.ts
  // and uses order: 100 to appear at bottom
}));

// Key Changes Summary:
//
// 1. CONSOLIDATED FOLDERS:
//    - "Background Colors" + "Globe Colors" + "Lighting" → "Visual > Colors > [Background/Globe/Lighting]"
//    - "Atmosphere" → "Visual > Atmosphere"
//    - "Environment" → "Visual > Environment"
//    - "Glass Effect" → "Visual > Materials"
//    - "Depth of Field" → "Camera > Depth of Field"
//    - "Drag & Rotate" → "Interaction > Drag & Rotate"
//    - "Debug" + "Performance Monitor" → "Debug > [Visualization/Performance]"
//
// 2. ENHANCED HELP TEXT:
//    - Added "When to adjust:" context for decision-making
//    - Added "Performance note:" where relevant
//    - Added "Interacts with:" for related controls
//    - Added "Typical range:" with visual landmarks
//    - Added "Tip:" for workflow guidance
//
// 3. COLLAPSED STATES:
//    - Top-level folders collapsed by default (except Presets)
//    - Primary sub-folders (Materials, Drag & Rotate) NOT collapsed when parent is expanded
//    - Secondary sub-folders (Colors, Atmosphere, etc.) collapsed for space savings
//
// 4. NAMING IMPROVEMENTS:
//    - "Performance Monitor" → "Debug > Performance" (clearer context)
//    - "Show FPS Monitor" → "Enable Monitor" (less redundant)
//    - "Depth of Field" (standalone) → "Camera > Depth of Field" (contextual grouping)
//
// 5. ORDER PROPERTY:
//    - Presets: -1 (top)
//    - Visual: 0
//    - Camera: 1
//    - Interaction: 2
//    - Debug: 3
//    - Audio: 100 (bottom, defined in useAudioDevControls)
