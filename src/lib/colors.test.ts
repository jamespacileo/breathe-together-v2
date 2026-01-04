/**
 * Color Palette Validation Tests
 *
 * Validates the Cosmic Nebula palette for:
 * - Sufficient contrast against dark space background
 * - Color differentiation between moods (Delta E)
 * - Appropriate luminance values for visibility and calmness
 * - Hue, saturation, and lightness within expected ranges
 *
 * Based on research of calming cosmic palettes suitable for meditation apps.
 */

import { describe, expect, it } from 'vitest';
import { COSMIC_NEBULA_PALETTE } from './colors';

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to HSL
 * Returns { h: [0-360], s: [0-100], l: [0-100] }
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Calculate relative luminance (WCAG formula)
 * Returns value between 0 (black) and 1 (white)
 */
function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * Returns value between 1 (no contrast) and 21 (max contrast)
 */
function getContrastRatio(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number },
): number {
  const lum1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate Delta E (CIE76) - perceptual color difference
 * Returns value where:
 * - < 1.0: Not perceptible by human eyes
 * - 1-2: Perceptible through close observation
 * - 2-10: Perceptible at a glance
 * - 10-49: More similar than opposite
 * - 100: Colors are exact opposite
 */
function calculateDeltaE(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number },
): number {
  // Simple Euclidean distance in RGB space (CIE76 approximation)
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Dark space background for contrast testing
const DARK_SPACE_BG = hexToRgb('#0a0a14'); // From galaxy background

describe('Cosmic Nebula Palette Validation', () => {
  describe('Individual Color Properties', () => {
    it('gratitude (warm amber) should have appropriate hue, saturation, and lightness', () => {
      const rgb = hexToRgb(COSMIC_NEBULA_PALETTE.gratitude);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

      // Warm amber should have orange/yellow hue (20-50°)
      expect(hsl.h).toBeGreaterThanOrEqual(15);
      expect(hsl.h).toBeLessThanOrEqual(55);

      // Should be fairly saturated (40-80%) for visibility
      expect(hsl.s).toBeGreaterThanOrEqual(40);
      expect(hsl.s).toBeLessThanOrEqual(80);

      // Medium-light to light (50-80%) for visibility against dark background
      expect(hsl.l).toBeGreaterThanOrEqual(50);
      expect(hsl.l).toBeLessThanOrEqual(80);
    });

    it('presence (cosmic teal) should have appropriate hue, saturation, and lightness', () => {
      const rgb = hexToRgb(COSMIC_NEBULA_PALETTE.presence);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

      // Teal/cyan should have cyan-blue hue (160-200°)
      expect(hsl.h).toBeGreaterThanOrEqual(160);
      expect(hsl.h).toBeLessThanOrEqual(200);

      // Should be saturated (50-90%) for cosmic feel
      expect(hsl.s).toBeGreaterThanOrEqual(50);
      expect(hsl.s).toBeLessThanOrEqual(90);

      // Medium-light to light (55-80%) for visibility against dark background
      expect(hsl.l).toBeGreaterThanOrEqual(55);
      expect(hsl.l).toBeLessThanOrEqual(80);
    });

    it('release (stellar blue) should have appropriate hue, saturation, and lightness', () => {
      const rgb = hexToRgb(COSMIC_NEBULA_PALETTE.release);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

      // Blue hue (200-240°)
      expect(hsl.h).toBeGreaterThanOrEqual(200);
      expect(hsl.h).toBeLessThanOrEqual(240);

      // Moderate saturation (40-70%) for calming
      expect(hsl.s).toBeGreaterThanOrEqual(40);
      expect(hsl.s).toBeLessThanOrEqual(70);

      // Medium to medium-light (50-75%) for soft appearance
      expect(hsl.l).toBeGreaterThanOrEqual(50);
      expect(hsl.l).toBeLessThanOrEqual(75);
    });

    it('connection (nebula pink) should have appropriate hue, saturation, and lightness', () => {
      const rgb = hexToRgb(COSMIC_NEBULA_PALETTE.connection);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

      // Pink/magenta hue (300-350°)
      expect(hsl.h).toBeGreaterThanOrEqual(300);
      expect(hsl.h).toBeLessThanOrEqual(360);

      // Moderate saturation (40-70%) for soft appearance
      expect(hsl.s).toBeGreaterThanOrEqual(40);
      expect(hsl.s).toBeLessThanOrEqual(70);

      // Medium-light to light (55-80%) for visibility
      expect(hsl.l).toBeGreaterThanOrEqual(55);
      expect(hsl.l).toBeLessThanOrEqual(80);
    });
  });

  describe('Contrast Against Dark Space Background', () => {
    it('all mood colors should have sufficient contrast (>= 3:1) against dark space', () => {
      // WCAG recommends 3:1 for large text, 4.5:1 for normal text
      // For meditation, we want visible but not harsh, so 3:1+ is good
      const moods = Object.entries(COSMIC_NEBULA_PALETTE);

      for (const [mood, hex] of moods) {
        const rgb = hexToRgb(hex);
        const contrast = getContrastRatio(rgb, DARK_SPACE_BG);

        expect(
          contrast,
          `${mood} should have >3:1 contrast against dark space`,
        ).toBeGreaterThanOrEqual(3);
      }
    });

    it('mood colors should not be too bright (contrast < 15:1) for calming effect', () => {
      // Too high contrast can be jarring for meditation
      // IMMUNE-inspired palette is brighter for visibility but still under 15:1 for calm aesthetic
      const moods = Object.entries(COSMIC_NEBULA_PALETTE);

      for (const [mood, hex] of moods) {
        const rgb = hexToRgb(hex);
        const contrast = getContrastRatio(rgb, DARK_SPACE_BG);

        expect(contrast, `${mood} should have <15:1 contrast to avoid harshness`).toBeLessThan(15);
      }
    });
  });

  describe('Color Differentiation (Delta E)', () => {
    it('mood colors should be distinguishable from each other (Delta E >= 50)', () => {
      // Delta E > 50 means colors are clearly different at a glance
      // Important for users to differentiate moods visually
      const colors = [
        { name: 'gratitude', rgb: hexToRgb(COSMIC_NEBULA_PALETTE.gratitude) },
        { name: 'presence', rgb: hexToRgb(COSMIC_NEBULA_PALETTE.presence) },
        { name: 'release', rgb: hexToRgb(COSMIC_NEBULA_PALETTE.release) },
        { name: 'connection', rgb: hexToRgb(COSMIC_NEBULA_PALETTE.connection) },
      ];

      // Compare each pair
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const deltaE = calculateDeltaE(colors[i].rgb, colors[j].rgb);
          expect(
            deltaE,
            `${colors[i].name} and ${colors[j].name} should be distinguishable (Delta E >= 50)`,
          ).toBeGreaterThanOrEqual(50);
        }
      }
    });
  });

  describe('Luminance Values', () => {
    it('all mood colors should have moderate luminance (0.15-0.70) for visibility and calmness', () => {
      // Luminance range:
      // 0.0-0.10: Too dark, poor visibility against dark background
      // 0.15-0.70: Good range for calming yet visible colors (IMMUNE-inspired brighter palette)
      // 0.70-1.0: Too bright, can be jarring for meditation
      const moods = Object.entries(COSMIC_NEBULA_PALETTE);

      for (const [mood, hex] of moods) {
        const rgb = hexToRgb(hex);
        const luminance = calculateLuminance(rgb.r, rgb.g, rgb.b);

        expect(
          luminance,
          `${mood} should have luminance between 0.15 and 0.70`,
        ).toBeGreaterThanOrEqual(0.15);
        expect(
          luminance,
          `${mood} should have luminance between 0.15 and 0.70`,
        ).toBeLessThanOrEqual(0.7);
      }
    });
  });

  describe('Palette Consistency', () => {
    it('should export exactly 4 mood colors', () => {
      expect(Object.keys(COSMIC_NEBULA_PALETTE)).toHaveLength(4);
    });

    it('all colors should be valid hex codes', () => {
      for (const hex of Object.values(COSMIC_NEBULA_PALETTE)) {
        expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(() => hexToRgb(hex)).not.toThrow();
      }
    });

    it('gratitude color should be different from Monument Valley palette (updated for cosmic theme)', () => {
      // Ensure we actually changed the colors for the cosmic theme
      expect(COSMIC_NEBULA_PALETTE.gratitude).not.toBe('#ffbe0b'); // Old Monument Valley gold
    });
  });
});
