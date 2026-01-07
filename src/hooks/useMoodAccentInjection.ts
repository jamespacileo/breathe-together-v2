import { useEffect } from 'react';
import type { MoodId } from '../constants';
import { getMoodAccentColor, getMoodAccentGlow } from '../lib/colors';

/**
 * Inject mood-based accent colors into CSS custom properties
 *
 * Updates `--color-accent` and `--color-accent-glow` CSS variables on the root element
 * when the mood changes, enabling dynamic theme updates across all UI components.
 *
 * **Usage:** Call this hook at the app root level (e.g., BreathingLevel component)
 *
 * **Architecture:**
 * - Mood state comes from `usePresence` hook (already has localStorage persistence)
 * - This hook injects values into CSS variables
 * - All UI components read from CSS variables (no prop drilling needed)
 *
 * **Performance:**
 * - CSS variable updates are instant (<50ms)
 * - No layout thrashing
 * - Minimal React re-renders (only when mood changes)
 *
 * @param mood - Current mood selection (null defaults to presence teal)
 *
 * @example
 * ```tsx
 * function BreathingLevel() {
 *   const { mood } = usePresence();
 *   useMoodAccentInjection(mood); // Inject accent colors
 *   return <Canvas>...</Canvas>;
 * }
 * ```
 */
export function useMoodAccentInjection(mood: MoodId | null) {
  useEffect(() => {
    // SSR safety check
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const accentColor = getMoodAccentColor(mood);
    const accentGlow = getMoodAccentGlow(mood);

    // Inject CSS variables into root element
    root.style.setProperty('--color-accent', accentColor);
    root.style.setProperty('--color-accent-glow', accentGlow);

    // Calculate lighter variant for hover states
    // Simple approach: use the base color (more advanced: increase lightness by 10%)
    const lightAccent = accentColor;
    root.style.setProperty('--color-accent-light', lightAccent);

    // Performance note: CSS variable updates are instant and don't trigger layout
    // All dependent styles update automatically via CSS cascade
  }, [mood]);
}
