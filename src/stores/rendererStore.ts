import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * GPU Power Preference options
 * - 'default': Let browser decide (usually integrated GPU)
 * - 'high-performance': Request discrete GPU (better performance, more power)
 * - 'low-power': Request integrated GPU (saves battery, less performance)
 *
 * Note: This is a hint to the browser - actual behavior depends on hardware/OS.
 * On systems with only one GPU, all options behave the same.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_the_powerpreference_context_creation_hint
 */
export type PowerPreference = 'default' | 'high-performance' | 'low-power';

interface RendererState {
  /**
   * WebGL context power preference hint.
   * Changing this requires Canvas remount (handled via key prop in app.tsx).
   */
  powerPreference: PowerPreference;

  /**
   * Counter that increments when renderer settings change.
   * Used as Canvas key to force remount.
   */
  rendererVersion: number;

  // Actions
  setPowerPreference: (value: PowerPreference) => void;
}

/**
 * Zustand store for renderer/GPU settings.
 *
 * Persisted to localStorage so settings survive page reloads.
 * Changes to powerPreference increment rendererVersion, which triggers
 * Canvas remount in app.tsx.
 */
export const useRendererStore = create<RendererState>()(
  persist(
    (set) => ({
      powerPreference: 'default',
      rendererVersion: 0,

      setPowerPreference: (value) =>
        set((state) => ({
          powerPreference: value,
          // Increment version to trigger Canvas remount
          rendererVersion: state.rendererVersion + 1,
        })),
    }),
    {
      name: 'breathe-together-renderer',
      // Only persist powerPreference, not the version counter
      partialize: (state) => ({ powerPreference: state.powerPreference }),
    },
  ),
);
