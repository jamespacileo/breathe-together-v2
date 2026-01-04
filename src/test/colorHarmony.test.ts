/**
 * Color Harmony Tests for Cosmic Palette
 *
 * Validates that scene colors maintain visual harmony and accessibility.
 * Tests luminance, saturation, and contrast ratios against defined bounds.
 *
 * Color science basis:
 * - Luminance (WCAG): Perceived brightness, 0-1 scale
 * - Saturation (HSL): Color intensity, 0-1 scale
 * - Contrast ratio: WCAG 2.1 formula for accessibility
 *
 * Run with: npm run test
 */

import { describe, expect, it } from 'vitest';
import {
  CONSTELLATION_LINES,
  CONTRAST_REQUIREMENTS,
  GLOBE,
  LIGHTING,
  LUMINANCE_BOUNDS,
  NEBULA,
  SATURATION_BOUNDS,
  SHARDS,
  SPACE_BACKGROUND,
  STARS,
  SUN,
} from '../config/cosmicPalette';

// ============================================================================
// COLOR UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse hex color to RGB components (0-1 range)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

/**
 * Calculate relative luminance using WCAG 2.1 formula
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where R, G, B are linearized (gamma-corrected)
 */
function calculateLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  // Linearize RGB values (sRGB to linear)
  const linearize = (c: number): number => {
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const rLin = linearize(r);
  const gLin = linearize(g);
  const bLin = linearize(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Convert RGB to HSL and return saturation (0-1)
 */
function calculateSaturation(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return 0; // Achromatic (grayscale)
  }

  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2
 */
function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateLuminance(hex1);
  const l2 = calculateLuminance(hex2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate color difference (Delta E approximation using luminance and saturation)
 * This is a simplified perceptual color difference metric
 */
function calculateColorDifference(hex1: string, hex2: string): number {
  const l1 = calculateLuminance(hex1);
  const l2 = calculateLuminance(hex2);
  const s1 = calculateSaturation(hex1);
  const s2 = calculateSaturation(hex2);

  // Simple Euclidean distance in L*S space (weighted)
  const lumDiff = Math.abs(l1 - l2);
  const satDiff = Math.abs(s1 - s2);

  return Math.sqrt(lumDiff * lumDiff + satDiff * satDiff * 0.5);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Color Utility Functions', () => {
  it('should parse hex colors correctly', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
  });

  it('should calculate luminance correctly', () => {
    // White should have luminance ~1
    expect(calculateLuminance('#ffffff')).toBeCloseTo(1, 2);

    // Black should have luminance ~0
    expect(calculateLuminance('#000000')).toBeCloseTo(0, 2);

    // Mid-gray should have luminance ~0.2 (because of gamma)
    const midGray = calculateLuminance('#808080');
    expect(midGray).toBeGreaterThan(0.1);
    expect(midGray).toBeLessThan(0.3);
  });

  it('should calculate saturation correctly', () => {
    // Pure red is fully saturated
    expect(calculateSaturation('#ff0000')).toBeCloseTo(1, 2);

    // Grayscale has no saturation
    expect(calculateSaturation('#808080')).toBeCloseTo(0, 2);
    expect(calculateSaturation('#ffffff')).toBeCloseTo(0, 2);
    expect(calculateSaturation('#000000')).toBeCloseTo(0, 2);

    // Desaturated colors have lower saturation
    const desaturated = calculateSaturation('#c0a0a0');
    expect(desaturated).toBeLessThan(0.5);
  });

  it('should calculate contrast ratio correctly', () => {
    // Black and white should have maximum contrast (21:1)
    expect(calculateContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);

    // Same color has 1:1 contrast
    expect(calculateContrastRatio('#808080', '#808080')).toBeCloseTo(1, 2);

    // WCAG AA requires 4.5:1 for normal text
    const aaContrast = calculateContrastRatio('#595959', '#ffffff');
    expect(aaContrast).toBeGreaterThan(4.5);
  });
});

describe('Space Background Colors', () => {
  it('should have very low luminance (dark space)', () => {
    const bounds = LUMINANCE_BOUNDS.background;

    for (const [name, hex] of Object.entries(SPACE_BACKGROUND)) {
      const luminance = calculateLuminance(hex);
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be <= ${bounds.max}`,
      ).toBeLessThanOrEqual(bounds.max);
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });

  it('should have low saturation (subtle color)', () => {
    const bounds = SATURATION_BOUNDS.background;

    for (const [name, hex] of Object.entries(SPACE_BACKGROUND)) {
      const saturation = calculateSaturation(hex);
      expect(
        saturation,
        `${name} (${hex}) saturation ${saturation.toFixed(4)} should be <= ${bounds.max}`,
      ).toBeLessThanOrEqual(bounds.max);
    }
  });
});

describe('Nebula Colors', () => {
  it('should have dark but visible luminance', () => {
    const bounds = LUMINANCE_BOUNDS.nebula;

    for (const [name, hex] of Object.entries(NEBULA)) {
      const luminance = calculateLuminance(hex);
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be within [${bounds.min}, ${bounds.max}]`,
      ).toBeLessThanOrEqual(bounds.max);
      expect(
        luminance,
        `${name} (${hex}) luminance should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });

  it('should have moderate saturation', () => {
    const bounds = SATURATION_BOUNDS.nebula;

    for (const [name, hex] of Object.entries(NEBULA)) {
      const saturation = calculateSaturation(hex);
      expect(
        saturation,
        `${name} (${hex}) saturation ${saturation.toFixed(4)} should be within [${bounds.min}, ${bounds.max}]`,
      ).toBeLessThanOrEqual(bounds.max);
      expect(
        saturation,
        `${name} (${hex}) saturation should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });
});

describe('Star Colors', () => {
  it('should have high luminance (bright)', () => {
    const bounds = LUMINANCE_BOUNDS.stars;

    for (const [name, hex] of Object.entries(STARS)) {
      const luminance = calculateLuminance(hex);
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });

  it('should have low saturation (mostly white)', () => {
    const bounds = SATURATION_BOUNDS.stars;

    for (const [name, hex] of Object.entries(STARS)) {
      const saturation = calculateSaturation(hex);
      expect(
        saturation,
        `${name} (${hex}) saturation ${saturation.toFixed(4)} should be <= ${bounds.max}`,
      ).toBeLessThanOrEqual(bounds.max);
    }
  });
});

describe('Sun Colors', () => {
  it('should have very high luminance (extremely bright)', () => {
    const bounds = LUMINANCE_BOUNDS.sun;

    // Core should be brightest
    const coreLuminance = calculateLuminance(SUN.core);
    expect(
      coreLuminance,
      `Sun core luminance ${coreLuminance.toFixed(4)} should be >= ${bounds.min}`,
    ).toBeGreaterThanOrEqual(bounds.min);

    // Flare should also be bright
    const flareLuminance = calculateLuminance(SUN.flare);
    expect(
      flareLuminance,
      `Sun flare luminance ${flareLuminance.toFixed(4)} should be >= ${bounds.min}`,
    ).toBeGreaterThanOrEqual(bounds.min);
  });
});

describe('Shard Colors', () => {
  it('should have sufficient luminance (visible against dark background)', () => {
    const bounds = LUMINANCE_BOUNDS.shards;

    for (const [name, hex] of Object.entries(SHARDS)) {
      const luminance = calculateLuminance(hex);
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });

  it('should have high saturation (vibrant mood colors)', () => {
    const bounds = SATURATION_BOUNDS.shards;

    for (const [name, hex] of Object.entries(SHARDS)) {
      const saturation = calculateSaturation(hex);
      expect(
        saturation,
        `${name} (${hex}) saturation ${saturation.toFixed(4)} should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });
});

describe('Constellation Line Colors', () => {
  it('should have medium luminance (visible but subtle)', () => {
    const bounds = LUMINANCE_BOUNDS.constellationLines;

    for (const [name, hex] of Object.entries(CONSTELLATION_LINES)) {
      const luminance = calculateLuminance(hex);
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be within [${bounds.min}, ${bounds.max}]`,
      ).toBeLessThanOrEqual(bounds.max);
      expect(
        luminance,
        `${name} (${hex}) luminance should be >= ${bounds.min}`,
      ).toBeGreaterThanOrEqual(bounds.min);
    }
  });
});

describe('Contrast Ratio Requirements', () => {
  it('stars should have sufficient contrast against background', () => {
    const required = CONTRAST_REQUIREMENTS.starsVsBackground;

    for (const [starName, starHex] of Object.entries(STARS)) {
      for (const [bgName, bgHex] of Object.entries(SPACE_BACKGROUND)) {
        const ratio = calculateContrastRatio(starHex, bgHex);
        expect(
          ratio,
          `${starName} vs ${bgName}: contrast ratio ${ratio.toFixed(2)} should be >= ${required}`,
        ).toBeGreaterThanOrEqual(required);
      }
    }
  });

  it('constellation lines should be visible against background', () => {
    const required = CONTRAST_REQUIREMENTS.linesVsBackground;

    for (const [lineName, lineHex] of Object.entries(CONSTELLATION_LINES)) {
      // Test against darkest background
      const ratio = calculateContrastRatio(lineHex, SPACE_BACKGROUND.voidBlack);
      expect(
        ratio,
        `${lineName} vs voidBlack: contrast ratio ${ratio.toFixed(2)} should be >= ${required}`,
      ).toBeGreaterThanOrEqual(required);
    }
  });

  it('sun should have maximum contrast against background', () => {
    const required = CONTRAST_REQUIREMENTS.sunVsBackground;

    const ratio = calculateContrastRatio(SUN.core, SPACE_BACKGROUND.voidBlack);
    expect(
      ratio,
      `Sun core vs voidBlack: contrast ratio ${ratio.toFixed(2)} should be >= ${required}`,
    ).toBeGreaterThanOrEqual(required);
  });
});

describe('Globe Colors', () => {
  it('should have appropriate luminance for cosmic scene', () => {
    const bounds = LUMINANCE_BOUNDS.globe;

    for (const [name, hex] of Object.entries(GLOBE)) {
      const luminance = calculateLuminance(hex);
      // Allow atmosphere and city lights to be brighter
      const adjustedMax = name === 'cityLights' || name === 'atmosphere' ? 0.7 : bounds.max;
      expect(
        luminance,
        `${name} (${hex}) luminance ${luminance.toFixed(4)} should be <= ${adjustedMax}`,
      ).toBeLessThanOrEqual(adjustedMax);
    }
  });
});

describe('Palette Consistency', () => {
  it('should have visually distinct shard colors', () => {
    const shardColors = Object.values(SHARDS);
    const minDifference = 0.02; // Minimum perceptual difference (lower threshold for similar hue colors)

    for (let i = 0; i < shardColors.length; i++) {
      for (let j = i + 1; j < shardColors.length; j++) {
        const diff = calculateColorDifference(shardColors[i], shardColors[j]);
        expect(
          diff,
          `Shard colors ${shardColors[i]} and ${shardColors[j]} should be distinct (diff: ${diff.toFixed(4)})`,
        ).toBeGreaterThanOrEqual(minDifference);
      }
    }
  });

  it('should have consistent background color progression', () => {
    // Background colors should get progressively darker or stay similar
    const bgColors = [
      SPACE_BACKGROUND.spaceBlue,
      SPACE_BACKGROUND.deepSpace,
      SPACE_BACKGROUND.darkMatter,
      SPACE_BACKGROUND.voidBlack,
    ];

    for (let i = 0; i < bgColors.length - 1; i++) {
      const l1 = calculateLuminance(bgColors[i]);
      const l2 = calculateLuminance(bgColors[i + 1]);
      expect(
        l1,
        `Background should get darker: ${bgColors[i]} (${l1.toFixed(4)}) >= ${bgColors[i + 1]} (${l2.toFixed(4)})`,
      ).toBeGreaterThanOrEqual(l2);
    }
  });

  it('lighting colors should have appropriate warmth/coolness', () => {
    // Sun key light should be warmer (higher red than blue)
    const { r: sunR, b: sunB } = hexToRgb(LIGHTING.sunKey);
    expect(sunR, 'Sun key light should be warm (red > blue)').toBeGreaterThan(sunB);

    // Rim light should be cooler (higher blue than red)
    const { r: rimR, b: rimB } = hexToRgb(LIGHTING.rim);
    expect(rimB, 'Rim light should be cool (blue > red)').toBeGreaterThan(rimR);
  });
});

describe('Accessibility Summary', () => {
  it('should print palette accessibility report', () => {
    console.log('\n📊 Cosmic Palette Accessibility Report\n');
    console.log('='.repeat(60));

    // Background luminance
    console.log('\n🌌 Background Colors (target: L < 0.08)');
    for (const [name, hex] of Object.entries(SPACE_BACKGROUND)) {
      const l = calculateLuminance(hex);
      const status = l <= 0.08 ? '✅' : '❌';
      console.log(`  ${status} ${name.padEnd(15)} ${hex}  L=${l.toFixed(4)}`);
    }

    // Star visibility
    console.log('\n⭐ Star Colors (target: L > 0.7)');
    for (const [name, hex] of Object.entries(STARS)) {
      const l = calculateLuminance(hex);
      const status = l >= 0.7 ? '✅' : '❌';
      console.log(`  ${status} ${name.padEnd(15)} ${hex}  L=${l.toFixed(4)}`);
    }

    // Contrast ratios
    console.log('\n📐 Key Contrast Ratios (WCAG 2.1)');
    const starVsBg = calculateContrastRatio(STARS.white, SPACE_BACKGROUND.voidBlack);
    const lineVsBg = calculateContrastRatio(
      CONSTELLATION_LINES.default,
      SPACE_BACKGROUND.voidBlack,
    );
    const sunVsBg = calculateContrastRatio(SUN.core, SPACE_BACKGROUND.voidBlack);

    console.log(
      `  Stars vs Background:  ${starVsBg.toFixed(1)}:1 (target: 7:1) ${starVsBg >= 7 ? '✅' : '❌'}`,
    );
    console.log(
      `  Lines vs Background:  ${lineVsBg.toFixed(1)}:1 (target: 3:1) ${lineVsBg >= 3 ? '✅' : '❌'}`,
    );
    console.log(
      `  Sun vs Background:    ${sunVsBg.toFixed(1)}:1 (target: 10:1) ${sunVsBg >= 10 ? '✅' : '❌'}`,
    );

    console.log('\n' + '='.repeat(60));

    // This test always passes - it's for reporting
    expect(true).toBe(true);
  });
});
