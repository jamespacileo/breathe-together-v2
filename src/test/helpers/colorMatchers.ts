/**
 * Color Testing Utilities
 *
 * Helpers for testing color values, contrast ratios, and accessibility.
 */

import type * as THREE from 'three';
import { expect } from 'vitest';

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Calculate relative luminance (WCAG formula)
 */
export function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  const { r, g, b } = rgb;

  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get color temperature (warm vs cool)
 * Returns positive for warm colors, negative for cool colors
 */
export function getColorTemperature(color: string): number {
  const rgb = hexToRgb(color);
  // Simple heuristic: (R + Y) - (B + G)
  return rgb.r + rgb.g - rgb.b;
}

/**
 * Calculate color distance (Euclidean distance in RGB space)
 */
export function getColorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Assert that two colors match within tolerance
 */
export function expectColorMatch(
  actual: string | THREE.Color | number,
  expected: string,
  tolerance = 10,
): void {
  let actualHex: string;

  if (typeof actual === 'string') {
    actualHex = actual;
  } else if (typeof actual === 'number') {
    // Three.js numeric color (e.g., 0xff0000)
    actualHex = `#${actual.toString(16).padStart(6, '0')}`;
  } else {
    // THREE.Color object
    actualHex = `#${actual.getHexString()}`;
  }

  const distance = getColorDistance(actualHex, expected);
  expect(distance).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that color has sufficient contrast against background
 */
export function expectColorAccessibility(color: string, background: string, minContrast = 3): void {
  const contrast = getContrastRatio(color, background);
  expect(contrast).toBeGreaterThanOrEqual(minContrast);
}

/**
 * Assert that color is within a specific range
 */
export function expectColorInRange(color: string, minColor: string, maxColor: string): void {
  const rgb = hexToRgb(color);
  const minRgb = hexToRgb(minColor);
  const maxRgb = hexToRgb(maxColor);

  expect(rgb.r).toBeGreaterThanOrEqual(minRgb.r);
  expect(rgb.r).toBeLessThanOrEqual(maxRgb.r);
  expect(rgb.g).toBeGreaterThanOrEqual(minRgb.g);
  expect(rgb.g).toBeLessThanOrEqual(maxRgb.g);
  expect(rgb.b).toBeGreaterThanOrEqual(minRgb.b);
  expect(rgb.b).toBeLessThanOrEqual(maxRgb.b);
}

/**
 * Assert that a color palette has diverse colors
 */
export function expectColorDiversity(colors: string[], minDistance = 50): void {
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const distance = getColorDistance(colors[i], colors[j]);
      expect(distance).toBeGreaterThan(minDistance);
    }
  }
}

/**
 * Assert that colors follow a gradient (warm to cool or vice versa)
 */
export function expectColorGradient(
  colors: string[],
  direction: 'warm-to-cool' | 'cool-to-warm',
): void {
  const temperatures = colors.map(getColorTemperature);

  for (let i = 0; i < temperatures.length - 1; i++) {
    if (direction === 'warm-to-cool') {
      expect(temperatures[i]).toBeGreaterThan(temperatures[i + 1]);
    } else {
      expect(temperatures[i]).toBeLessThan(temperatures[i + 1]);
    }
  }
}
