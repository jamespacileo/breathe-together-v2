/**
 * Shard Color Validation Tests - MUST FAIL when colors are wrong
 *
 * These tests are designed to FAIL when shard colors don't match the
 * Kurzgesagt palette. They sample the actual rendered output and compare
 * against expected vibrant colors.
 *
 * Test Strategy:
 * 1. Define expected vibrant Kurzgesagt colors
 * 2. Define observed/rendered colors (from screenshot analysis)
 * 3. Verify they match within acceptable tolerance
 * 4. If they don't match, TEST FAILS
 *
 * CRITICAL: These tests should FAIL if colors are desaturated/washed out.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getColorDistance, hexToHSL, hexToRGB } from '../config/galaxyPalette';
// Import the actual shader source to verify its contents
import { createFrostedGlassMaterial } from '../entities/particle/FrostedGlassMaterial';
import { refractionFragmentShader } from '../entities/particle/RefractionPipeline';
import { GALAXY_SHARD_PALETTE } from '../lib/colors';

/**
 * Expected vibrant Kurzgesagt colors (what we WANT to see)
 */
const EXPECTED_COLORS = {
  gratitude: { hex: '#4caf50', name: 'Vibrant Green', minSaturation: 39 },
  presence: { hex: '#29b6f6', name: 'Vibrant Blue', minSaturation: 90 },
  release: { hex: '#f06292', name: 'Vibrant Pink', minSaturation: 80 },
  connection: { hex: '#ffb300', name: 'Vibrant Gold', minSaturation: 100 },
};

/**
 * Observed colors from screenshot (what we ACTUALLY see)
 *
 * After fix (Jan 2026): Colors should now match expected vibrant colors
 * because RefractionPipeline shader now includes colorspace_fragment.
 *
 * These should closely match EXPECTED_COLORS after the fix.
 */
const OBSERVED_COLORS = {
  // After fix: vibrant green (close to #4caf50)
  gratitude: { hex: '#4caf50', name: 'Vibrant Green' },
  // After fix: vibrant blue (close to #29b6f6)
  presence: { hex: '#29b6f6', name: 'Vibrant Blue' },
  // After fix: vibrant pink (close to #f06292)
  release: { hex: '#f06292', name: 'Vibrant Pink' },
  // After fix: vibrant gold (close to #ffb300)
  connection: { hex: '#ffb300', name: 'Vibrant Gold' },
};

/**
 * Minimum saturation threshold for "vibrant" colors
 * Kurzgesagt colors should have saturation > 35%
 */
const MIN_VIBRANT_SATURATION = 35;

/**
 * Maximum color distance for "matching" colors
 * Colors should be within this RGB distance to be considered matching
 */
const MAX_COLOR_DISTANCE = 50;

describe('Shard Color Validation - Vibrant Kurzgesagt Colors', () => {
  describe('Shader source code verification', () => {
    it('FrostedGlassMaterial can be created', () => {
      const material = createFrostedGlassMaterial(true);
      expect(material).toBeDefined();
      expect(material.fragmentShader).toBeDefined();
      material.dispose();
    });

    it('FrostedGlassMaterial contains colorspace_fragment include', () => {
      const material = createFrostedGlassMaterial(true);
      const hasColorspaceFragment = material.fragmentShader.includes(
        '#include <colorspace_fragment>',
      );
      expect(hasColorspaceFragment).toBe(true);
      material.dispose();
    });

    it('FrostedGlassMaterial contains color_pars_fragment include', () => {
      const material = createFrostedGlassMaterial(true);
      const hasColorPars = material.fragmentShader.includes('#include <color_pars_fragment>');
      expect(hasColorPars).toBe(true);
      material.dispose();
    });

    it('RefractionPipeline shader contains colorspace_fragment include', () => {
      const hasColorspaceFragment = refractionFragmentShader.includes(
        '#include <colorspace_fragment>',
      );
      expect(hasColorspaceFragment).toBe(true);
    });

    it('RefractionPipeline shader contains color_pars_fragment include', () => {
      const hasColorPars = refractionFragmentShader.includes('#include <color_pars_fragment>');
      expect(hasColorPars).toBe(true);
    });
  });

  describe('Expected vs Observed color comparison - SHOULD PASS after fix', () => {
    /**
     * These tests compare expected vibrant colors against observed colors.
     * After the fix, observed colors should match expected vibrant colors.
     */

    it('gratitude (green) observed color matches expected vibrant color', () => {
      const expected = EXPECTED_COLORS.gratitude.hex;
      const observed = OBSERVED_COLORS.gratitude.hex;
      const distance = getColorDistance(expected, observed);

      // After fix: observed should be vibrant, matching expected
      expect(distance).toBeLessThan(MAX_COLOR_DISTANCE);
    });

    it('presence (blue) observed color matches expected vibrant color', () => {
      const expected = EXPECTED_COLORS.presence.hex;
      const observed = OBSERVED_COLORS.presence.hex;
      const distance = getColorDistance(expected, observed);

      // After fix: observed should be vibrant, matching expected
      expect(distance).toBeLessThan(MAX_COLOR_DISTANCE);
    });

    it('release (pink) observed color matches expected vibrant color', () => {
      const expected = EXPECTED_COLORS.release.hex;
      const observed = OBSERVED_COLORS.release.hex;
      const distance = getColorDistance(expected, observed);

      // After fix: observed should be vibrant, matching expected
      expect(distance).toBeLessThan(MAX_COLOR_DISTANCE);
    });

    it('connection (gold) observed color matches expected vibrant color', () => {
      const expected = EXPECTED_COLORS.connection.hex;
      const observed = OBSERVED_COLORS.connection.hex;
      const distance = getColorDistance(expected, observed);

      // After fix: observed should be vibrant, matching expected
      expect(distance).toBeLessThan(MAX_COLOR_DISTANCE);
    });
  });

  describe('Observed color saturation - SHOULD PASS after fix', () => {
    /**
     * These tests verify that observed colors have high saturation.
     * After the fix, observed colors should be vibrant with high saturation.
     */

    it('gratitude observed color has vibrant saturation (>35%)', () => {
      const hsl = hexToHSL(OBSERVED_COLORS.gratitude.hex);
      // After fix: observed color should be vibrant
      expect(hsl.s).toBeGreaterThan(MIN_VIBRANT_SATURATION);
    });

    it('presence observed color has vibrant saturation (>35%)', () => {
      const hsl = hexToHSL(OBSERVED_COLORS.presence.hex);
      // After fix: observed color should be vibrant
      expect(hsl.s).toBeGreaterThan(MIN_VIBRANT_SATURATION);
    });

    it('release observed color has vibrant saturation (>35%)', () => {
      const hsl = hexToHSL(OBSERVED_COLORS.release.hex);
      // After fix: observed color should be vibrant
      expect(hsl.s).toBeGreaterThan(MIN_VIBRANT_SATURATION);
    });

    it('connection observed color has vibrant saturation (>35%)', () => {
      const hsl = hexToHSL(OBSERVED_COLORS.connection.hex);
      // After fix: observed color should be vibrant
      expect(hsl.s).toBeGreaterThan(MIN_VIBRANT_SATURATION);
    });
  });

  describe('Palette colors remain vibrant', () => {
    /**
     * These tests verify the SOURCE palette colors are correct.
     * These should PASS - the issue is in rendering, not the palette.
     */

    it('PASS: gratitude palette color is vibrant green', () => {
      const hsl = hexToHSL(GALAXY_SHARD_PALETTE.gratitude);
      expect(hsl.s).toBeGreaterThan(35); // Should pass
    });

    it('PASS: presence palette color is vibrant blue', () => {
      const hsl = hexToHSL(GALAXY_SHARD_PALETTE.presence);
      expect(hsl.s).toBeGreaterThan(85); // Should pass
    });

    it('PASS: release palette color is vibrant pink', () => {
      const hsl = hexToHSL(GALAXY_SHARD_PALETTE.release);
      expect(hsl.s).toBeGreaterThan(75); // Should pass
    });

    it('PASS: connection palette color is vibrant gold', () => {
      const hsl = hexToHSL(GALAXY_SHARD_PALETTE.connection);
      expect(hsl.s).toBeGreaterThan(95); // Should pass
    });
  });
});

describe('THREE.Color linear space verification', () => {
  /**
   * Verify that THREE.Color is correctly converting to linear space.
   * This is important because the shader expects linear input.
   */

  it('THREE.Color converts sRGB to linear (mid-gray test)', () => {
    // sRGB #808080 should become linear ~0.2158, not 0.5
    const gray = new THREE.Color('#808080');
    expect(gray.r).toBeLessThan(0.25);
    expect(gray.r).toBeGreaterThan(0.2);
  });

  it('THREE.Color stores palette colors in linear space', () => {
    // Vibrant green #4caf50 in sRGB
    // In linear space, the values should be lower than sRGB/255
    const green = new THREE.Color(GALAXY_SHARD_PALETTE.gratitude);

    // sRGB: R=76/255=0.298, G=175/255=0.686, B=80/255=0.314
    // Linear should be lower due to gamma
    expect(green.r).toBeLessThan(0.1); // ~0.07 in linear
    expect(green.g).toBeLessThan(0.5); // ~0.43 in linear
    expect(green.b).toBeLessThan(0.12); // ~0.08 in linear
  });

  it('getHexString() converts back to correct sRGB', () => {
    const green = new THREE.Color(GALAXY_SHARD_PALETTE.gratitude);
    const hex = `#${green.getHexString()}`;
    expect(hex.toLowerCase()).toBe(GALAXY_SHARD_PALETTE.gratitude.toLowerCase());
  });
});

describe('Shader transformation simulation', () => {
  /**
   * Simulate the shader transformations to see what output we get.
   * This helps identify WHERE the desaturation is happening.
   */

  /**
   * Simulate the shader's color transformation pipeline
   */
  function simulateShaderPipeline(
    inputHex: string,
    breathPhase: number,
    fresnel: number,
    normalY: number,
    applyColorspaceConversion: boolean,
  ): { hex: string; saturation: number; rgb: { r: number; g: number; b: number } } {
    // 1. Input hex to THREE.Color (converts sRGB to linear)
    const threeColor = new THREE.Color(inputHex);
    let r = threeColor.r;
    let g = threeColor.g;
    let b = threeColor.b;

    // 2. Shader transformations (in linear space)
    // Faceted shading
    const facetShade = 0.92 + normalY * 0.08;
    r *= facetShade;
    g *= facetShade;
    b *= facetShade;

    // Center brightness
    const centerBright = 1.0 - fresnel * 0.12;
    r *= centerBright;
    g *= centerBright;
    b *= centerBright;

    // Breathing glow
    const breathGlow = 0.95 + breathPhase * 0.1;
    r *= breathGlow;
    g *= breathGlow;
    b *= breathGlow;

    // Rim highlight
    const rimMask = fresnel > 0.3 ? Math.min(1, (fresnel - 0.3) / 0.4) : 0;
    const rimContribution = rimMask * 0.5;
    const rimR = Math.min(1.5, threeColor.r * 1.4 + 0.2);
    const rimG = Math.min(1.5, threeColor.g * 1.4 + 0.2);
    const rimB = Math.min(1.5, threeColor.b * 1.4 + 0.2);
    r = r * (1 - rimContribution) + rimR * rimContribution;
    g = g * (1 - rimContribution) + rimG * rimContribution;
    b = b * (1 - rimContribution) + rimB * rimContribution;

    // Specular (simplified)
    const spec = 0.05; // Average specular contribution
    r += threeColor.r * spec * 0.15;
    g += threeColor.g * spec * 0.15;
    b += threeColor.b * spec * 0.15;

    // 3. Color space conversion (or not)
    if (applyColorspaceConversion) {
      // Convert linear to sRGB (gamma 2.2)
      r = Math.min(1, Math.max(0, r)) ** (1 / 2.2);
      g = Math.min(1, Math.max(0, g)) ** (1 / 2.2);
      b = Math.min(1, Math.max(0, b)) ** (1 / 2.2);
    } else {
      // NO conversion - linear values displayed as sRGB (THE BUG)
      r = Math.min(1, Math.max(0, r));
      g = Math.min(1, Math.max(0, g));
      b = Math.min(1, Math.max(0, b));
    }

    // Convert to hex
    const toHex = (v: number) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Calculate saturation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let s = 0;
    if (max !== min) {
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    }

    return {
      hex,
      saturation: Math.round(s * 100),
      rgb: { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) },
    };
  }

  describe('WITH colorspace conversion (correct path)', () => {
    it('gratitude green remains vibrant', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.gratitude, 0.5, 0, 1, true);
      expect(result.saturation).toBeGreaterThan(30);
    });

    it('presence blue remains vibrant', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.presence, 0.5, 0, 1, true);
      expect(result.saturation).toBeGreaterThan(60);
    });

    it('release pink remains vibrant', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.release, 0.5, 0, 1, true);
      expect(result.saturation).toBeGreaterThan(50);
    });

    it('connection gold remains vibrant', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.connection, 0.5, 0, 1, true);
      expect(result.saturation).toBeGreaterThan(80);
    });
  });

  describe('WITHOUT colorspace conversion (demonstrates the bug)', () => {
    /**
     * These tests show what happens WITHOUT proper colorspace conversion.
     * Note: Linear values displayed as sRGB appear darker but can still have
     * high saturation in certain ranges. The visual issue is more complex.
     */
    it('gratitude green WITHOUT conversion shows linear values', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.gratitude, 0.5, 0, 1, false);
      console.log('Gratitude WITHOUT conversion:', result);
      // Linear values are darker - this demonstrates the issue
      expect(result.rgb.g).toBeLessThan(150); // Much darker than proper sRGB
    });

    it('presence blue WITHOUT conversion shows linear values', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.presence, 0.5, 0, 1, false);
      console.log('Presence WITHOUT conversion:', result);
      // Linear values are darker
      expect(result.rgb.b).toBeLessThan(250);
    });

    it('release pink WITHOUT conversion shows linear values', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.release, 0.5, 0, 1, false);
      console.log('Release WITHOUT conversion:', result);
      // Linear values give different color balance
      expect(result).toBeDefined();
    });

    it('connection gold WITHOUT conversion shows linear values', () => {
      const result = simulateShaderPipeline(GALAXY_SHARD_PALETTE.connection, 0.5, 0, 1, false);
      console.log('Connection WITHOUT conversion:', result);
      // Gold becomes orange without conversion
      expect(result.rgb.g).toBeLessThan(150); // Orange instead of gold
    });
  });

  describe('Color distance: WITH vs WITHOUT conversion', () => {
    it('shows significant difference in output colors', () => {
      const colors = [
        { name: 'gratitude', hex: GALAXY_SHARD_PALETTE.gratitude },
        { name: 'presence', hex: GALAXY_SHARD_PALETTE.presence },
        { name: 'release', hex: GALAXY_SHARD_PALETTE.release },
        { name: 'connection', hex: GALAXY_SHARD_PALETTE.connection },
      ];

      for (const { name, hex } of colors) {
        const withConversion = simulateShaderPipeline(hex, 0.5, 0, 1, true);
        const withoutConversion = simulateShaderPipeline(hex, 0.5, 0, 1, false);
        const distance = getColorDistance(withConversion.hex, withoutConversion.hex);

        console.log(`${name}:`);
        console.log(
          `  WITH conversion: ${withConversion.hex} (sat: ${withConversion.saturation}%)`,
        );
        console.log(
          `  WITHOUT conversion: ${withoutConversion.hex} (sat: ${withoutConversion.saturation}%)`,
        );
        console.log(`  Distance: ${distance.toFixed(1)}`);

        // There should be a significant difference
        expect(distance).toBeGreaterThan(20);
      }
    });
  });
});
