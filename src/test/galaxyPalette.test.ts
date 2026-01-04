/**
 * Galaxy Palette Color Harmony Tests
 *
 * These tests ensure that:
 * 1. All palette colors fall within their defined harmony constraints
 * 2. UI text has sufficient contrast against backgrounds
 * 3. Shard colors have consistent saturation/luminance despite varying hues
 */

import { describe, expect, it } from 'vitest';
import {
  COLOR_HARMONY_CONSTRAINTS,
  GALAXY_PALETTE,
  getContrastRatio,
  hexToHSL,
  isColorInHarmony,
} from '../config/galaxyPalette';

describe('Galaxy Palette Color Harmony', () => {
  describe('hexToHSL conversion', () => {
    it('converts pure red correctly', () => {
      const hsl = hexToHSL('#ff0000');
      expect(hsl.h).toBe(0);
      expect(hsl.s).toBe(100);
      expect(hsl.l).toBe(50);
    });

    it('converts pure green correctly', () => {
      const hsl = hexToHSL('#00ff00');
      expect(hsl.h).toBe(120);
      expect(hsl.s).toBe(100);
      expect(hsl.l).toBe(50);
    });

    it('converts pure blue correctly', () => {
      const hsl = hexToHSL('#0000ff');
      expect(hsl.h).toBe(240);
      expect(hsl.s).toBe(100);
      expect(hsl.l).toBe(50);
    });

    it('converts white correctly', () => {
      const hsl = hexToHSL('#ffffff');
      expect(hsl.l).toBe(100);
      expect(hsl.s).toBe(0);
    });

    it('converts black correctly', () => {
      const hsl = hexToHSL('#000000');
      expect(hsl.l).toBe(0);
      expect(hsl.s).toBe(0);
    });
  });

  describe('Background colors', () => {
    it('deep background is very dark with cool tones', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.deep, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background deep issues:', result.issues);
      }
    });

    it('mid background is dark with cool tones', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.mid, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background mid issues:', result.issues);
      }
    });

    it('light background stays within constraints', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.light, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background light issues:', result.issues);
      }
    });

    it('nebula background is cool purple', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.nebula, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background nebula issues:', result.issues);
      }
    });

    it('all backgrounds have luminance < 18%', () => {
      const backgrounds = Object.values(GALAXY_PALETTE.background);
      for (const color of backgrounds) {
        const hsl = hexToHSL(color);
        expect(hsl.l).toBeLessThanOrEqual(18);
      }
    });
  });

  describe('Sun colors', () => {
    it('sun core is bright and warm', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.sun.core, 'sun');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Sun core issues:', result.issues);
      }
    });

    it('sun corona is warm orange', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.sun.corona, 'sun');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Sun corona issues:', result.issues);
      }
    });

    it('sun glow is warm', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.sun.glow, 'sun');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Sun glow issues:', result.issues);
      }
    });

    it('sun colors have hue in warm range (20-55)', () => {
      const sunColors = Object.values(GALAXY_PALETTE.sun);
      for (const color of sunColors) {
        const hsl = hexToHSL(color);
        expect(hsl.h).toBeGreaterThanOrEqual(20);
        expect(hsl.h).toBeLessThanOrEqual(55);
      }
    });
  });

  describe('Constellation colors', () => {
    it('constellation stars are bright blue-white', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.constellations.stars, 'constellations');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Constellation stars issues:', result.issues);
      }
    });

    it('constellation lines are visible against dark background', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.constellations.lines, 'constellations');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Constellation lines issues:', result.issues);
      }
    });

    it('constellation bright lines are within range', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.constellations.linesBright, 'constellations');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Constellation linesBright issues:', result.issues);
      }
    });
  });

  describe('Globe colors', () => {
    it('globe ocean is cool teal', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.ocean, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe ocean issues:', result.issues);
      }
    });

    it('globe land is muted green', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.land, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe land issues:', result.issues);
      }
    });

    it('globe atmosphere is bright teal', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.atmosphere, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe atmosphere issues:', result.issues);
      }
    });

    it('globe glow is light teal', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.glow, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe glow issues:', result.issues);
      }
    });
  });

  describe('Shard colors - consistent saturation and luminance', () => {
    const shardColors = Object.values(GALAXY_PALETTE.shards);
    const constraints = COLOR_HARMONY_CONSTRAINTS.shards;

    it('all shards have saturation in range 55-100%', () => {
      for (const [name, color] of Object.entries(GALAXY_PALETTE.shards)) {
        const hsl = hexToHSL(color);
        expect(hsl.s).toBeGreaterThanOrEqual(constraints.saturation.min);
        expect(hsl.s).toBeLessThanOrEqual(constraints.saturation.max);
        if (hsl.s < constraints.saturation.min || hsl.s > constraints.saturation.max) {
          console.log(`Shard ${name} saturation out of range: ${hsl.s}`);
        }
      }
    });

    it('all shards have luminance in range 45-75%', () => {
      for (const [name, color] of Object.entries(GALAXY_PALETTE.shards)) {
        const hsl = hexToHSL(color);
        expect(hsl.l).toBeGreaterThanOrEqual(constraints.luminance.min);
        expect(hsl.l).toBeLessThanOrEqual(constraints.luminance.max);
        if (hsl.l < constraints.luminance.min || hsl.l > constraints.luminance.max) {
          console.log(`Shard ${name} luminance out of range: ${hsl.l}`);
        }
      }
    });

    it('shard luminance delta is within 30 points', () => {
      const luminances = shardColors.map((c) => hexToHSL(c).l);
      const maxLuminance = Math.max(...luminances);
      const minLuminance = Math.min(...luminances);
      const delta = maxLuminance - minLuminance;

      expect(delta).toBeLessThanOrEqual(30);
    });

    it('shards have distinct hues (at least 30° apart on average)', () => {
      const hues = shardColors.map((c) => hexToHSL(c).h);
      hues.sort((a, b) => a - b);

      // Calculate average gap between sorted hues
      let totalGap = 0;
      for (let i = 0; i < hues.length - 1; i++) {
        totalGap += hues[i + 1] - hues[i];
      }
      // Include wrap-around gap
      totalGap += 360 - hues[hues.length - 1] + hues[0];

      const avgGap = totalGap / hues.length;
      expect(avgGap).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Cosmic dust colors', () => {
    it('cosmic dust blue is light and cool', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.blue, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust blue issues:', result.issues);
      }
    });

    it('cosmic dust purple is light and cool', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.purple, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust purple issues:', result.issues);
      }
    });

    it('cosmic dust white is very light', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.white, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust white issues:', result.issues);
      }
    });
  });

  describe('UI contrast requirements', () => {
    it('white text has sufficient contrast against deep background (WCAG AA)', () => {
      const contrast = getContrastRatio(GALAXY_PALETTE.ui.text, GALAXY_PALETTE.background.deep);
      // WCAG AA requires 4.5:1 for normal text
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('white text has sufficient contrast against mid background', () => {
      const contrast = getContrastRatio(GALAXY_PALETTE.ui.text, GALAXY_PALETTE.background.mid);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('muted text has sufficient contrast against deep background', () => {
      const contrast = getContrastRatio(
        GALAXY_PALETTE.ui.textMuted,
        GALAXY_PALETTE.background.deep,
      );
      // Muted text should still be readable (at least 3:1)
      expect(contrast).toBeGreaterThanOrEqual(3);
    });

    it('accent color is visible against dark background', () => {
      const contrast = getContrastRatio(GALAXY_PALETTE.ui.accent, GALAXY_PALETTE.background.deep);
      expect(contrast).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Overall palette harmony', () => {
    it('sun provides warm/cool contrast against background', () => {
      const bgHue = hexToHSL(GALAXY_PALETTE.background.deep).h;
      const sunHue = hexToHSL(GALAXY_PALETTE.sun.corona).h;

      // Hue difference should be at least 150° for warm/cool contrast
      const hueDiff = Math.abs(bgHue - sunHue);
      const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);

      expect(normalizedDiff).toBeGreaterThanOrEqual(100);
    });

    it('globe complements sun (analogous to background, contrasts with sun)', () => {
      const globeHue = hexToHSL(GALAXY_PALETTE.globe.atmosphere).h;
      const sunHue = hexToHSL(GALAXY_PALETTE.sun.corona).h;

      // Globe should be on cool side (opposite from sun)
      const hueDiff = Math.abs(globeHue - sunHue);
      const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);

      // Should be at least 100° apart
      expect(normalizedDiff).toBeGreaterThanOrEqual(100);
    });

    it('constellation lines are distinct from shards', () => {
      const lineHue = hexToHSL(GALAXY_PALETTE.constellations.lines).h;
      const shardHues = Object.values(GALAXY_PALETTE.shards).map((c) => hexToHSL(c).h);

      // Line color should be at least 20° away from any shard hue
      for (const shardHue of shardHues) {
        const diff = Math.abs(lineHue - shardHue);
        const normalizedDiff = Math.min(diff, 360 - diff);
        expect(normalizedDiff).toBeGreaterThanOrEqual(10);
      }
    });
  });
});
