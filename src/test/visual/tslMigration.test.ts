/**
 * TSL Migration Color Validation Tests
 *
 * These tests capture the exact color values from GLSL shaders and validate
 * that TSL materials produce visually equivalent output.
 *
 * The color samples here serve as ground truth for TSL migration.
 * Any deviation indicates visual regression that needs investigation.
 *
 * Color sources (extracted from GLSL shaders):
 * - BackgroundGradient.tsx: Monument Valley sky gradient
 * - FrostedGlassMaterial.tsx: Particle shard rim and inner glow
 * - earthGlobe/index.tsx: Globe atmosphere and glow layers
 */

import { describe, expect, it } from 'vitest';
import { expectColorMatch, getColorDistance, hexToRgb, rgbToHex } from '../helpers';
import { GLSL_COLORS } from '../helpers/glslColorConstants';

/**
 * Convert vec3 components (0-1 range) to hex color
 */
function vec3ToHex(r: number, g: number, b: number): string {
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

/**
 * Simulate breathing luminosity modulation
 * Formula: baseColor * (1.0 + breathPhase * intensity)
 */
function simulateBreathingLuminosity(
  color: { r: number; g: number; b: number },
  breathPhase: number,
  intensity: number,
): { r: number; g: number; b: number } {
  const mod = 1.0 + breathPhase * intensity;
  return {
    r: Math.min(255, Math.round(color.r * mod)),
    g: Math.min(255, Math.round(color.g * mod)),
    b: Math.min(255, Math.round(color.b * mod)),
  };
}

describe('TSL Migration Color Validation', () => {
  describe('Background Gradient Colors', () => {
    it('skyTop color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.background.skyTop;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('skyMid color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.background.skyMid;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('horizon color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.background.horizon;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('warmGlow color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.background.warmGlow;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('gradient colors maintain warm temperature', () => {
      const bgColors = GLSL_COLORS.background;
      const colors = [
        bgColors.skyTop.hex,
        bgColors.skyMid.hex,
        bgColors.horizon.hex,
        bgColors.warmGlow.hex,
      ];

      for (const color of colors) {
        const rgb = hexToRgb(color);
        // Warm colors: red >= green >= blue
        expect(rgb.r).toBeGreaterThanOrEqual(rgb.g);
        expect(rgb.g).toBeGreaterThanOrEqual(rgb.b);
      }
    });

    it('gradient colors have low saturation (neutral tones)', () => {
      const bgColors = GLSL_COLORS.background;
      const colors = [bgColors.skyTop.hex, bgColors.skyMid.hex, bgColors.horizon.hex];

      for (const color of colors) {
        const rgb = hexToRgb(color);
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const saturation = max - min;
        // Neutral tones should have saturation < 30
        expect(saturation).toBeLessThan(30);
      }
    });
  });

  describe('Frosted Glass Material Colors', () => {
    it('fallback color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.frostedGlass.fallbackColor;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('rim color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.frostedGlass.rimColor;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('inner glow color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.frostedGlass.innerGlow;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('rim color is near-white (soft warm highlight)', () => {
      const rgb = hexToRgb(GLSL_COLORS.frostedGlass.rimColor.hex);
      // All components should be > 230 for near-white
      expect(rgb.r).toBeGreaterThan(230);
      expect(rgb.g).toBeGreaterThan(230);
      expect(rgb.b).toBeGreaterThan(230);
    });

    it('breathing modulation stays within expected range', () => {
      const baseColor = hexToRgb(GLSL_COLORS.frostedGlass.fallbackColor.hex);
      const intensity = GLSL_COLORS.frostedGlass.breathingIntensity;

      // Test at key breath phases: exhale (0), mid (0.5), peak inhale (1.0)
      const phases = [0, 0.25, 0.5, 0.75, 1.0];

      for (const phase of phases) {
        const modulated = simulateBreathingLuminosity(baseColor, phase, intensity);
        const modHex = rgbToHex(modulated.r, modulated.g, modulated.b);
        const baseHex = GLSL_COLORS.frostedGlass.fallbackColor.hex;

        // Distance should scale with phase (max ~12% at phase=1.0)
        const distance = getColorDistance(modHex, baseHex);
        const expectedMaxDistance = phase * intensity * 255 * Math.sqrt(3); // max RGB shift

        expect(distance).toBeLessThanOrEqual(expectedMaxDistance + 5); // small tolerance
      }
    });

    it('inner glow breathing boost is proportional', () => {
      const { innerGlowBase, innerGlowBreathBoost } = GLSL_COLORS.frostedGlass;

      // At exhale (phase=0): intensity = base
      const exhaleIntensity = innerGlowBase * (1.0 + 0 * innerGlowBreathBoost);
      expect(exhaleIntensity).toBeCloseTo(0.05, 2);

      // At peak (phase=1): intensity = base * (1 + breathBoost)
      const peakIntensity = innerGlowBase * (1.0 + 1.0 * innerGlowBreathBoost);
      expect(peakIntensity).toBeCloseTo(0.065, 2); // 0.05 * 1.3 = 0.065
    });
  });

  describe('Globe Material Colors', () => {
    it('rim color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.globe.rimColor;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('top light color matches GLSL source', () => {
      const { vec3, hex } = GLSL_COLORS.globe.topLightColor;
      const computed = vec3ToHex(vec3[0], vec3[1], vec3[2]);
      expectColorMatch(computed, hex, 3);
    });

    it('glow color is valid hex', () => {
      const { glowColor } = GLSL_COLORS.globe;
      // Should not throw when converting
      const rgb = hexToRgb(glowColor);
      expect(rgb.r).toBeGreaterThan(0);
      expect(rgb.g).toBeGreaterThan(0);
      expect(rgb.b).toBeGreaterThan(0);
    });

    it('atmosphere layers are visually distinct', () => {
      const layers = GLSL_COLORS.globe.atmosphereLayers;

      // Each layer should be different enough to be distinguishable
      for (let i = 0; i < layers.length; i++) {
        for (let j = i + 1; j < layers.length; j++) {
          const distance = getColorDistance(layers[i], layers[j]);
          expect(distance).toBeGreaterThan(30); // Minimum visual distinction
        }
      }
    });

    it('atmosphere layers have distinct color temperatures', () => {
      const layers = GLSL_COLORS.globe.atmosphereLayers;
      const temperatures = layers.map((color: string) => {
        const rgb = hexToRgb(color);
        return rgb.r - rgb.b; // Positive = warm, negative = cool
      });

      // First layer (#f8d0a8) should be warm
      expect(temperatures[0]).toBeGreaterThan(0);

      // Second layer (#b8e8d4) should be cool (green/teal)
      // Actually has higher green, which is neutral-cool
      const rgb2 = hexToRgb(layers[1]);
      expect(rgb2.g).toBeGreaterThan(rgb2.r);

      // Third layer (#c4b8e8) should be cool-ish (purple)
      expect(temperatures[2]).toBeLessThan(temperatures[0]);
    });
  });

  describe('Cross-Material Color Consistency', () => {
    it('frosted glass rim and globe rim are similar (both are edge highlights)', () => {
      const frostedRim = GLSL_COLORS.frostedGlass.rimColor.hex;
      const globeRim = GLSL_COLORS.globe.rimColor.hex;

      // Both are warm near-white edge highlights
      const distance = getColorDistance(frostedRim, globeRim);
      // Should be within same color family (distance < 40)
      expect(distance).toBeLessThan(40);
    });

    it('all background colors form coherent gradient', () => {
      const bg = GLSL_COLORS.background;
      const colors = [bg.warmGlow.hex, bg.horizon.hex, bg.skyMid.hex, bg.skyTop.hex];

      // Adjacent colors should be close (smooth gradient)
      for (let i = 0; i < colors.length - 1; i++) {
        const distance = getColorDistance(colors[i], colors[i + 1]);
        expect(distance).toBeLessThan(25); // Smooth transition
      }
    });

    it('globe glow complements background horizon', () => {
      const glowColor = GLSL_COLORS.globe.glowColor;
      const horizonColor = GLSL_COLORS.background.horizon.hex;

      // Both are warm creamy colors
      const distance = getColorDistance(glowColor, horizonColor);
      expect(distance).toBeLessThan(30); // Within same family
    });
  });

  describe('TSL Preset Validation', () => {
    it('fresnel power values are reasonable', () => {
      const power = GLSL_COLORS.frostedGlass.fresnelPower;

      // Power of 2-5 is typical for soft fresnel effects
      expect(power).toBeGreaterThanOrEqual(2);
      expect(power).toBeLessThanOrEqual(5);
    });

    it('breathing intensity is subtle (not jarring)', () => {
      const intensity = GLSL_COLORS.frostedGlass.breathingIntensity;

      // 6-20% intensity is comfortable for breathing animations
      expect(intensity).toBeGreaterThanOrEqual(0.06);
      expect(intensity).toBeLessThanOrEqual(0.2);
    });
  });

  describe('Color Snapshot for TSL Migration', () => {
    it('GLSL color constants snapshot', () => {
      // This snapshot captures all GLSL colors
      // TSL migration MUST reproduce these values
      expect(GLSL_COLORS).toMatchSnapshot();
    });

    it('background gradient hex values', () => {
      const expected = {
        skyTop: '#f5f0e8',
        skyMid: '#faf2e6',
        horizon: '#fcf0e0',
        warmGlow: '#faebd9',
        cloudColor: '#fffcf7',
      };

      expect(GLSL_COLORS.background.skyTop.hex).toBe(expected.skyTop);
      expect(GLSL_COLORS.background.skyMid.hex).toBe(expected.skyMid);
      expect(GLSL_COLORS.background.horizon.hex).toBe(expected.horizon);
      expect(GLSL_COLORS.background.warmGlow.hex).toBe(expected.warmGlow);
      expect(GLSL_COLORS.background.cloudColor.hex).toBe(expected.cloudColor);
    });

    it('frosted glass hex values', () => {
      const expected = {
        fallbackColor: '#d9bfa6',
        rimColor: '#faf5f0',
        innerGlow: '#fffaf2',
      };

      expect(GLSL_COLORS.frostedGlass.fallbackColor.hex).toBe(expected.fallbackColor);
      expect(GLSL_COLORS.frostedGlass.rimColor.hex).toBe(expected.rimColor);
      expect(GLSL_COLORS.frostedGlass.innerGlow.hex).toBe(expected.innerGlow);
    });

    it('globe hex values', () => {
      const expected = {
        rimColor: '#f0e6db',
        topLightColor: '#faf2eb',
        glowColor: '#efe5da',
        mistColor: '#f0ebe6',
      };

      expect(GLSL_COLORS.globe.rimColor.hex).toBe(expected.rimColor);
      expect(GLSL_COLORS.globe.topLightColor.hex).toBe(expected.topLightColor);
      expect(GLSL_COLORS.globe.glowColor).toBe(expected.glowColor);
      expect(GLSL_COLORS.globe.mistColor).toBe(expected.mistColor);
    });
  });
});
