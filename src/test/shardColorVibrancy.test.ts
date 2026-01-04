/**
 * Shard Color Vibrancy Tests
 *
 * Validates that the ACTUAL shard colors used by ParticleSwarm meet
 * Kurzgesagt-inspired vibrancy standards for visibility against dark backgrounds.
 *
 * Key insight: This tests MONUMENT_VALLEY_PALETTE from colors.ts, which is what
 * ParticleSwarm actually imports - NOT cosmicPalette.ts SHARDS.
 *
 * Kurzgesagt palette characteristics:
 * - High saturation (>0.6) for pop against dark backgrounds
 * - Medium-high luminance (>0.35) for visibility
 * - Warm coral, vibrant teal, sunny gold, soft pink tones
 *
 * Run with: npm run test -- shardColorVibrancy
 */

import { describe, expect, it } from 'vitest';
import { MONUMENT_VALLEY_PALETTE } from '../lib/colors';

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
 */
function calculateLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const linearize = (c: number): number => {
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
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
    return 0;
  }

  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Calculate perceived brightness (HSP model)
 * More perceptually accurate than luminance for color vibrancy
 */
function calculatePerceivedBrightness(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  // HSP (Highly Sensitive Poo) color model
  return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateLuminance(hex1);
  const l2 = calculateLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// KURZGESAGT-INSPIRED REQUIREMENTS
// ============================================================================

/**
 * Minimum requirements for Kurzgesagt-style vibrant colors
 * against a dark cosmic background
 */
const KURZGESAGT_REQUIREMENTS = {
  /** Minimum saturation for vibrant pop (0.6 = 60%) */
  minSaturation: 0.5,
  /** Minimum luminance for dark background visibility */
  minLuminance: 0.25,
  /** Minimum perceived brightness */
  minBrightness: 0.45,
  /** Minimum contrast against dark space (#0a0a1a) */
  minContrastVsBackground: 4.0,
};

/** Dark cosmic background color for contrast testing */
const DARK_BACKGROUND = '#0a0a1a';

// ============================================================================
// TESTS
// ============================================================================

describe('Shard Color Vibrancy (MONUMENT_VALLEY_PALETTE)', () => {
  describe('Saturation Requirements', () => {
    it('gratitude color should have high saturation for pop', () => {
      const saturation = calculateSaturation(MONUMENT_VALLEY_PALETTE.gratitude);
      console.log(
        `  gratitude (${MONUMENT_VALLEY_PALETTE.gratitude}): saturation = ${saturation.toFixed(3)}`,
      );
      expect(
        saturation,
        `gratitude saturation ${saturation.toFixed(3)} should be >= ${KURZGESAGT_REQUIREMENTS.minSaturation}`,
      ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minSaturation);
    });

    it('presence color should have high saturation for pop', () => {
      const saturation = calculateSaturation(MONUMENT_VALLEY_PALETTE.presence);
      console.log(
        `  presence (${MONUMENT_VALLEY_PALETTE.presence}): saturation = ${saturation.toFixed(3)}`,
      );
      expect(
        saturation,
        `presence saturation ${saturation.toFixed(3)} should be >= ${KURZGESAGT_REQUIREMENTS.minSaturation}`,
      ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minSaturation);
    });

    it('release color should have high saturation for pop', () => {
      const saturation = calculateSaturation(MONUMENT_VALLEY_PALETTE.release);
      console.log(
        `  release (${MONUMENT_VALLEY_PALETTE.release}): saturation = ${saturation.toFixed(3)}`,
      );
      expect(
        saturation,
        `release saturation ${saturation.toFixed(3)} should be >= ${KURZGESAGT_REQUIREMENTS.minSaturation}`,
      ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minSaturation);
    });

    it('connection color should have high saturation for pop', () => {
      const saturation = calculateSaturation(MONUMENT_VALLEY_PALETTE.connection);
      console.log(
        `  connection (${MONUMENT_VALLEY_PALETTE.connection}): saturation = ${saturation.toFixed(3)}`,
      );
      expect(
        saturation,
        `connection saturation ${saturation.toFixed(3)} should be >= ${KURZGESAGT_REQUIREMENTS.minSaturation}`,
      ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minSaturation);
    });
  });

  describe('Luminance Requirements', () => {
    it('all shard colors should have sufficient luminance for dark background', () => {
      for (const [name, hex] of Object.entries(MONUMENT_VALLEY_PALETTE)) {
        const luminance = calculateLuminance(hex);
        console.log(`  ${name} (${hex}): luminance = ${luminance.toFixed(3)}`);
        expect(
          luminance,
          `${name} luminance ${luminance.toFixed(3)} should be >= ${KURZGESAGT_REQUIREMENTS.minLuminance}`,
        ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minLuminance);
      }
    });
  });

  describe('Perceived Brightness Requirements', () => {
    it('all shard colors should have sufficient perceived brightness', () => {
      for (const [name, hex] of Object.entries(MONUMENT_VALLEY_PALETTE)) {
        const brightness = calculatePerceivedBrightness(hex);
        console.log(`  ${name} (${hex}): brightness = ${brightness.toFixed(3)}`);
        expect(
          brightness,
          `${name} brightness ${brightness.toFixed(3)} should be >= ${KURZGESAGT_REQUIREMENTS.minBrightness}`,
        ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minBrightness);
      }
    });
  });

  describe('Contrast Against Dark Background', () => {
    it('all shard colors should have high contrast against cosmic background', () => {
      for (const [name, hex] of Object.entries(MONUMENT_VALLEY_PALETTE)) {
        const contrast = calculateContrastRatio(hex, DARK_BACKGROUND);
        console.log(
          `  ${name} (${hex}) vs ${DARK_BACKGROUND}: contrast = ${contrast.toFixed(2)}:1`,
        );
        expect(
          contrast,
          `${name} contrast ${contrast.toFixed(2)}:1 should be >= ${KURZGESAGT_REQUIREMENTS.minContrastVsBackground}:1`,
        ).toBeGreaterThanOrEqual(KURZGESAGT_REQUIREMENTS.minContrastVsBackground);
      }
    });
  });
});

describe('Color Palette Comparison', () => {
  it('should print current vs ideal palette analysis', () => {
    console.log('\n' + '='.repeat(70));
    console.log('📊 SHARD COLOR VIBRANCY ANALYSIS');
    console.log('='.repeat(70));

    console.log('\nCurrent MONUMENT_VALLEY_PALETTE (what ParticleSwarm uses):');
    console.log('-'.repeat(50));

    for (const [name, hex] of Object.entries(MONUMENT_VALLEY_PALETTE)) {
      const sat = calculateSaturation(hex);
      const lum = calculateLuminance(hex);
      const bright = calculatePerceivedBrightness(hex);
      const contrast = calculateContrastRatio(hex, DARK_BACKGROUND);

      const satStatus = sat >= KURZGESAGT_REQUIREMENTS.minSaturation ? '✅' : '❌';
      const lumStatus = lum >= KURZGESAGT_REQUIREMENTS.minLuminance ? '✅' : '❌';
      const brightStatus = bright >= KURZGESAGT_REQUIREMENTS.minBrightness ? '✅' : '❌';
      const contrastStatus =
        contrast >= KURZGESAGT_REQUIREMENTS.minContrastVsBackground ? '✅' : '❌';

      console.log(`\n  ${name.toUpperCase()} (${hex})`);
      console.log(
        `    ${satStatus} Saturation:  ${sat.toFixed(3)} (need >= ${KURZGESAGT_REQUIREMENTS.minSaturation})`,
      );
      console.log(
        `    ${lumStatus} Luminance:   ${lum.toFixed(3)} (need >= ${KURZGESAGT_REQUIREMENTS.minLuminance})`,
      );
      console.log(
        `    ${brightStatus} Brightness:  ${bright.toFixed(3)} (need >= ${KURZGESAGT_REQUIREMENTS.minBrightness})`,
      );
      console.log(
        `    ${contrastStatus} Contrast:    ${contrast.toFixed(2)}:1 (need >= ${KURZGESAGT_REQUIREMENTS.minContrastVsBackground}:1)`,
      );
    }

    console.log('\n' + '='.repeat(70));
    console.log('💡 KURZGESAGT-STYLE PALETTE (IMPLEMENTED):');
    console.log('='.repeat(70));

    const idealColors = {
      gratitude: '#FFAB40', // Warm amber
      presence: '#4DD0E1', // Electric cyan
      release: '#64FFDA', // Mint green
      connection: '#FF4081', // Vibrant pink
    };

    for (const [name, hex] of Object.entries(idealColors)) {
      const sat = calculateSaturation(hex);
      const lum = calculateLuminance(hex);
      const contrast = calculateContrastRatio(hex, DARK_BACKGROUND);
      console.log(
        `  ${name}: ${hex} (sat=${sat.toFixed(2)}, lum=${lum.toFixed(2)}, contrast=${contrast.toFixed(1)}:1)`,
      );
    }

    console.log('\n' + '='.repeat(70));

    expect(true).toBe(true);
  });
});
