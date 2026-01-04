import { create } from 'zustand';
import { PRESETS, type PresetName, TUNING_DEFAULTS } from '../hooks/useDevControls';

interface BreathingLevelState {
  // User-facing controls
  harmony: number;
  orbitRadius: number;
  shardSize: number;
  atmosphereDensity: number;

  // Feature flags
  /** When true, inspirational text shows on 3D ribbon instead of HTML overlay */
  ribbonInspirationalMode: boolean;

  // UI state
  showTuneControls: boolean;
  showSettings: boolean;

  // Actions
  setHarmony: (value: number) => void;
  setOrbitRadius: (value: number) => void;
  setShardSize: (value: number) => void;
  setAtmosphereDensity: (value: number) => void;
  setRibbonInspirationalMode: (value: boolean) => void;
  setShowTuneControls: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  applyPreset: (presetName: PresetName) => void;
}

/**
 * Zustand store for BreathingLevel state.
 * Shared between 3D scene (BreathingLevel) and HTML UI (BreathingLevelUI).
 */
export const useBreathingLevelStore = create<BreathingLevelState>((set, get) => ({
  // Initial values from defaults
  harmony: PRESETS.centered.harmony,
  orbitRadius: TUNING_DEFAULTS.orbitRadius,
  shardSize: TUNING_DEFAULTS.shardSize,
  atmosphereDensity: TUNING_DEFAULTS.atmosphereDensity,

  // Feature flags - ribbon mode enabled by default
  ribbonInspirationalMode: true,

  // UI state
  showTuneControls: false,
  showSettings: false,

  // Actions
  setHarmony: (value) => set({ harmony: value }),
  setOrbitRadius: (value) => set({ orbitRadius: value }),
  setShardSize: (value) => set({ shardSize: value }),
  setAtmosphereDensity: (value) => set({ atmosphereDensity: value }),
  setRibbonInspirationalMode: (value) => set({ ribbonInspirationalMode: value }),
  setShowTuneControls: (value) => set({ showTuneControls: value }),
  setShowSettings: (value) => set({ showSettings: value }),

  // Animated preset application
  // Optimized: Updates every 2 frames to reduce re-renders while maintaining smooth animation
  applyPreset: (presetName) => {
    const preset = PRESETS[presetName];
    const state = get();

    // Store starting values
    const startValues = {
      harmony: state.harmony,
      shardSize: state.shardSize,
      orbitRadius: state.orbitRadius,
      atmosphereDensity: state.atmosphereDensity,
    };
    const startTime = performance.now();
    const duration = 300; // ms
    let frameCount = 0;

    let animationId: number;

    const animate = (now: number) => {
      frameCount++;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Only update every 2 frames to reduce state updates (30fps instead of 60fps)
      // Final frame always updates to ensure we hit target values exactly
      const shouldUpdate = frameCount % 2 === 0 || progress >= 1;

      if (shouldUpdate) {
        // Ease out cubic for smooth deceleration
        const eased = 1 - (1 - progress) ** 3;

        // Interpolate all values in a single set() call
        set({
          harmony: Math.round(startValues.harmony + (preset.harmony - startValues.harmony) * eased),
          shardSize: startValues.shardSize + (preset.shardSize - startValues.shardSize) * eased,
          orbitRadius:
            startValues.orbitRadius + (preset.orbitRadius - startValues.orbitRadius) * eased,
          atmosphereDensity: Math.round(
            startValues.atmosphereDensity +
              (preset.atmosphereDensity - startValues.atmosphereDensity) * eased,
          ),
        });
      }

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    // Return cleanup function (though Zustand doesn't use it directly)
    return () => cancelAnimationFrame(animationId);
  },
}));
