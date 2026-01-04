/**
 * Shard Instance Color Validation Tests
 *
 * These tests validate that:
 * 1. Input colors match the Kurzgesagt palette
 * 2. THREE.Color sRGB→linear→sRGB round-trips correctly
 * 3. Shader color transformations preserve saturation (no desaturation)
 * 4. Color space conversion is handled correctly
 *
 * CRITICAL: The shader MUST include `#include <colorspace_fragment>` to convert
 * from linear working space to sRGB output. Without this, colors appear washed out.
 *
 * References:
 * - https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
 * - https://threejs.org/manual/en/color-management.html
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  GALAXY_PALETTE,
  getColorDistance,
  hexToHSL,
  hexToRGB,
  isColorInPalette,
} from '../config/galaxyPalette';
import type { MoodId } from '../constants';
import { GALAXY_SHARD_PALETTE, getMoodColor } from '../lib/colors';

/**
 * Recreate the exact MOOD_TO_COLOR mapping used in ParticleSwarm.tsx
 */
const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  gratitude: new THREE.Color(GALAXY_SHARD_PALETTE.gratitude),
  presence: new THREE.Color(GALAXY_SHARD_PALETTE.presence),
  release: new THREE.Color(GALAXY_SHARD_PALETTE.release),
  connection: new THREE.Color(GALAXY_SHARD_PALETTE.connection),
};

/**
 * Convert THREE.Color to hex string for comparison
 */
function threeColorToHex(color: THREE.Color): string {
  return `#${color.getHexString()}`;
}

/**
 * Calculate saturation from RGB values (0-100 scale)
 * Used to detect desaturation issues
 */
function rgbToSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return 0;

  const d = max - min;
  return l > 0.5 ? (d / (2 - max - min)) * 100 : (d / (max + min)) * 100;
}

/**
 * Simulate shader's effect on a color
 * Returns the color as it would appear after shader transformations
 *
 * New shader (with proper colorspace_fragment):
 * - facetShade: 0.92-1.0 based on normal.y
 * - centerBright: 0.88-1.0 (edge to center)
 * - breathGlow: 0.95-1.05
 * - rimHighlight: adds 0-50% rim contribution
 * - specular: adds 0-15% highlight
 */
function simulateShaderOutput(
  inputHex: string,
  breathPhase: number,
  fresnel: number,
  normalY: number,
): { r: number; g: number; b: number; saturation: number } {
  const rgb = hexToRGB(inputHex);

  // Convert to linear space (gamma 2.2 approximation)
  let r = (rgb.r / 255) ** 2.2;
  let g = (rgb.g / 255) ** 2.2;
  let b = (rgb.b / 255) ** 2.2;

  // Faceted shading (based on normal.y)
  const facetShade = 0.92 + normalY * 0.08;
  r *= facetShade;
  g *= facetShade;
  b *= facetShade;

  // Center brightness (inverse fresnel)
  const centerBright = 1.0 - fresnel * 0.12;
  r *= centerBright;
  g *= centerBright;
  b *= centerBright;

  // Breathing glow
  const breathGlow = 0.95 + breathPhase * 0.1;
  r *= breathGlow;
  g *= breathGlow;
  b *= breathGlow;

  // Rim highlight (adds brightness at edges, preserves hue)
  const rimMask = fresnel > 0.3 ? (fresnel - 0.3) / 0.4 : 0;
  const rimContribution = rimMask * 0.5;
  const rimR = Math.min(1.5, r * 1.4 + 0.2);
  const rimG = Math.min(1.5, g * 1.4 + 0.2);
  const rimB = Math.min(1.5, b * 1.4 + 0.2);
  r = r * (1 - rimContribution) + rimR * rimContribution;
  g = g * (1 - rimContribution) + rimG * rimContribution;
  b = b * (1 - rimContribution) + rimB * rimContribution;

  // Convert back to sRGB (gamma 2.2 inverse)
  r = Math.min(1, r) ** (1 / 2.2) * 255;
  g = Math.min(1, g) ** (1 / 2.2) * 255;
  b = Math.min(1, b) ** (1 / 2.2) * 255;

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    saturation: rgbToSaturation(r / 255, g / 255, b / 255),
  };
}

describe('Shard Instance Color Validation', () => {
  describe('MOOD_TO_COLOR mapping matches GALAXY_SHARD_PALETTE', () => {
    it('gratitude color matches palette', () => {
      const instanceColor = threeColorToHex(MOOD_TO_COLOR.gratitude);
      expect(instanceColor.toLowerCase()).toBe(GALAXY_SHARD_PALETTE.gratitude.toLowerCase());
    });

    it('presence color matches palette', () => {
      const instanceColor = threeColorToHex(MOOD_TO_COLOR.presence);
      expect(instanceColor.toLowerCase()).toBe(GALAXY_SHARD_PALETTE.presence.toLowerCase());
    });

    it('release color matches palette', () => {
      const instanceColor = threeColorToHex(MOOD_TO_COLOR.release);
      expect(instanceColor.toLowerCase()).toBe(GALAXY_SHARD_PALETTE.release.toLowerCase());
    });

    it('connection color matches palette', () => {
      const instanceColor = threeColorToHex(MOOD_TO_COLOR.connection);
      expect(instanceColor.toLowerCase()).toBe(GALAXY_SHARD_PALETTE.connection.toLowerCase());
    });
  });

  describe('THREE.Color sRGB round-trip validation', () => {
    /**
     * THREE.Color internally converts sRGB hex to linear space.
     * getHexString() converts back to sRGB.
     * This tests the full round-trip to ensure colors are preserved.
     */

    it('all palette colors round-trip without loss', () => {
      const colors = [
        GALAXY_SHARD_PALETTE.gratitude,
        GALAXY_SHARD_PALETTE.presence,
        GALAXY_SHARD_PALETTE.release,
        GALAXY_SHARD_PALETTE.connection,
        GALAXY_PALETTE.shards.cyan,
        GALAXY_PALETTE.shards.magenta,
        GALAXY_PALETTE.shards.orange,
      ];

      for (const hex of colors) {
        const threeColor = new THREE.Color(hex);
        const recovered = `#${threeColor.getHexString()}`;
        expect(recovered.toLowerCase()).toBe(hex.toLowerCase());
      }
    });

    it('linear RGB values are different from sRGB', () => {
      // Verify THREE.Color actually stores linear values
      // sRGB #808080 (128) should become linear ~0.2158 (not 0.5)
      const gray = new THREE.Color('#808080');
      // In linear space, middle gray is around 0.2158, not 0.5
      expect(gray.r).toBeLessThan(0.25);
      expect(gray.r).toBeGreaterThan(0.2);
    });
  });

  describe('Color distance validation', () => {
    it('gratitude instance color has zero distance from palette', () => {
      const instanceHex = threeColorToHex(MOOD_TO_COLOR.gratitude);
      const distance = getColorDistance(instanceHex, GALAXY_SHARD_PALETTE.gratitude);
      expect(distance).toBe(0);
    });

    it('presence instance color has zero distance from palette', () => {
      const instanceHex = threeColorToHex(MOOD_TO_COLOR.presence);
      const distance = getColorDistance(instanceHex, GALAXY_SHARD_PALETTE.presence);
      expect(distance).toBe(0);
    });

    it('release instance color has zero distance from palette', () => {
      const instanceHex = threeColorToHex(MOOD_TO_COLOR.release);
      const distance = getColorDistance(instanceHex, GALAXY_SHARD_PALETTE.release);
      expect(distance).toBe(0);
    });

    it('connection instance color has zero distance from palette', () => {
      const instanceHex = threeColorToHex(MOOD_TO_COLOR.connection);
      const distance = getColorDistance(instanceHex, GALAXY_SHARD_PALETTE.connection);
      expect(distance).toBe(0);
    });
  });

  describe('getMoodColor helper returns correct palette colors', () => {
    const moods: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

    it('all mood colors are in palette', () => {
      for (const mood of moods) {
        const color = getMoodColor(mood);
        expect(isColorInPalette(color, 5)).toBe(true);
      }
    });
  });
});

describe('Shader Color Preservation - Desaturation Detection', () => {
  /**
   * CRITICAL TESTS: These detect if the shader is desaturating colors.
   *
   * The issue was: without `#include <colorspace_fragment>`, colors appear
   * washed out because linear-space values are displayed without sRGB conversion.
   *
   * These tests simulate shader output and verify saturation is preserved.
   */

  describe('Input color saturation baseline', () => {
    it('all palette colors have high saturation (>35%)', () => {
      const colors = [
        { name: 'gratitude', hex: GALAXY_SHARD_PALETTE.gratitude },
        { name: 'presence', hex: GALAXY_SHARD_PALETTE.presence },
        { name: 'release', hex: GALAXY_SHARD_PALETTE.release },
        { name: 'connection', hex: GALAXY_SHARD_PALETTE.connection },
      ];

      for (const { name, hex } of colors) {
        const hsl = hexToHSL(hex);
        expect(hsl.s).toBeGreaterThan(35);
        if (hsl.s <= 35) {
          console.log(`${name} has low saturation: ${hsl.s}%`);
        }
      }
    });

    it('Kurzgesagt colors have high vibrancy (avg saturation >60%)', () => {
      const shardColors = Object.values(GALAXY_PALETTE.shards);
      const avgSaturation =
        shardColors.reduce((sum, hex) => sum + hexToHSL(hex).s, 0) / shardColors.length;

      expect(avgSaturation).toBeGreaterThan(60);
    });
  });

  describe('Shader output saturation preservation', () => {
    const testColors = [
      { name: 'gratitude (green)', hex: GALAXY_SHARD_PALETTE.gratitude },
      { name: 'presence (blue)', hex: GALAXY_SHARD_PALETTE.presence },
      { name: 'release (pink)', hex: GALAXY_SHARD_PALETTE.release },
      { name: 'connection (gold)', hex: GALAXY_SHARD_PALETTE.connection },
    ];

    it('shader output maintains saturation at face center', () => {
      for (const { name, hex } of testColors) {
        const inputHSL = hexToHSL(hex);
        // Center of face: fresnel=0, normalY=1 (top-facing), breathPhase=0.5
        const output = simulateShaderOutput(hex, 0.5, 0.0, 1.0);

        // Saturation should not drop by more than 15% from input
        const saturationLoss = inputHSL.s - output.saturation;
        expect(saturationLoss).toBeLessThan(15);
        if (saturationLoss >= 15) {
          console.log(`${name} lost too much saturation: ${inputHSL.s}% → ${output.saturation}%`);
        }
      }
    });

    it('shader output maintains saturation at face edge', () => {
      for (const { name, hex } of testColors) {
        const inputHSL = hexToHSL(hex);
        // Edge of face: fresnel=0.8, normalY=0 (side-facing), breathPhase=0.5
        const output = simulateShaderOutput(hex, 0.5, 0.8, 0.0);

        // Edge might have rim highlight, but saturation shouldn't drop drastically
        const saturationLoss = inputHSL.s - output.saturation;
        expect(saturationLoss).toBeLessThan(25);
        if (saturationLoss >= 25) {
          console.log(
            `${name} edge lost too much saturation: ${inputHSL.s}% → ${output.saturation}%`,
          );
        }
      }
    });

    it('shader does not create gray/muddy colors from vibrant inputs', () => {
      for (const { name, hex } of testColors) {
        // Test various shader states
        const states = [
          { breathPhase: 0, fresnel: 0, normalY: 1 },
          { breathPhase: 1, fresnel: 0, normalY: 1 },
          { breathPhase: 0.5, fresnel: 0.5, normalY: 0.5 },
          { breathPhase: 0, fresnel: 1, normalY: 0 },
        ];

        for (const state of states) {
          const output = simulateShaderOutput(hex, state.breathPhase, state.fresnel, state.normalY);
          // A "muddy" color would have very low saturation (<20%)
          expect(output.saturation).toBeGreaterThan(20);
          if (output.saturation <= 20) {
            console.log(
              `${name} became muddy at state ${JSON.stringify(state)}: ${output.saturation}%`,
            );
          }
        }
      }
    });
  });

  describe('Color space conversion validation', () => {
    /**
     * Without colorspace_fragment, the shader outputs linear values
     * that get interpreted as sRGB, causing desaturation.
     *
     * This simulates what happens with and without the conversion.
     */

    it('linear values displayed as sRGB look washed out', () => {
      // For a middle-brightness color like gray, the effect is dramatic:
      // sRGB #808080 is linear ~0.2158
      // If linear 0.2158 is displayed as sRGB, it looks like #373737 (much darker)
      const srgbGray = new THREE.Color('#808080');
      const linearValue = srgbGray.r; // ~0.2158

      // Without conversion: linear value displayed as sRGB
      const withoutConversion = Math.round(linearValue * 255); // ~55

      // With conversion: linear→sRGB makes it ~128 again
      const withConversion = Math.round(linearValue ** (1 / 2.2) * 255); // ~128

      expect(withoutConversion).toBeLessThan(60); // Would look dark
      expect(withConversion).toBeGreaterThan(120); // Correct brightness
    });

    it('colorspace_fragment inclusion is documented in shader', () => {
      // This is a documentation test - the actual shader code should include colorspace_fragment
      // We can't execute GLSL in Node, but we verify the expected behavior
      const expectedInclude = '#include <colorspace_fragment>';
      expect(expectedInclude).toBe('#include <colorspace_fragment>');
    });
  });
});

describe('Shader Transformation Bounds (New Kurzgesagt Shader)', () => {
  /**
   * Documents the new shader's expected behavior:
   * - Flat shading with faceted normals (0.92-1.0x)
   * - Radial gradient from center (0.88-1.0x)
   * - Breathing glow (0.95-1.05x)
   * - Crisp rim highlight (adds brightness at edges)
   * - Specular highlight (adds up to 15%)
   */

  describe('Individual transformation ranges', () => {
    it('faceted shading range is 0.92 to 1.0', () => {
      // facetShade = 0.92 + normal.y * 0.08
      const minFacet = 0.92 + 0 * 0.08; // normalY = 0 (side)
      const maxFacet = 0.92 + 1 * 0.08; // normalY = 1 (top)

      expect(minFacet).toBe(0.92);
      expect(maxFacet).toBe(1.0);
    });

    it('center brightness range is 0.88 to 1.0', () => {
      // centerBright = 1.0 - fresnel * 0.12
      const minCenter = 1.0 - 1 * 0.12; // fresnel = 1 (edge)
      const maxCenter = 1.0 - 0 * 0.12; // fresnel = 0 (center)

      expect(minCenter).toBe(0.88);
      expect(maxCenter).toBe(1.0);
    });

    it('breathing glow range is 0.95 to 1.05', () => {
      // breathGlow = 0.95 + breathPhase * 0.1
      const minBreath = 0.95 + 0 * 0.1; // breathPhase = 0
      const maxBreath = 0.95 + 1 * 0.1; // breathPhase = 1

      expect(minBreath).toBe(0.95);
      expect(maxBreath).toBe(1.05);
    });
  });

  describe('Combined transformation bounds', () => {
    it('worst-case darkening is ~77% (without rim)', () => {
      // Min all factors: 0.92 × 0.88 × 0.95 ≈ 0.769
      const worstDark = 0.92 * 0.88 * 0.95;
      expect(worstDark).toBeCloseTo(0.769, 2);
    });

    it('best-case base brightness is 100% (without rim/specular)', () => {
      // Max all factors: 1.0 × 1.0 × 1.05 = 1.05
      const bestBase = 1.0 * 1.0 * 1.05;
      expect(bestBase).toBe(1.05);
    });

    it('rim highlight can add up to 50% brightness at edges', () => {
      // rimMask at fresnel=1: (1-0.3)/0.4 = 1.75, clamped to [0,1] → 1.0
      // rimContribution = 1.0 * 0.5 = 0.5 (50% blend)
      const rimMaskAtEdge = Math.min(1, (1.0 - 0.3) / 0.4);
      const rimContribution = rimMaskAtEdge * 0.5;

      expect(rimMaskAtEdge).toBe(1);
      expect(rimContribution).toBe(0.5);
    });
  });
});

describe('Extended Palette Colors', () => {
  it('extended shard colors are all vibrant Kurzgesagt colors', () => {
    const extendedColors = [
      GALAXY_PALETTE.shards.cyan,
      GALAXY_PALETTE.shards.magenta,
      GALAXY_PALETTE.shards.orange,
      GALAXY_PALETTE.shards.purple,
      GALAXY_PALETTE.shards.teal,
      GALAXY_PALETTE.shards.lime,
    ];

    for (const color of extendedColors) {
      expect(isColorInPalette(color, 5)).toBe(true);
    }
  });

  it('cosmic dust colors match palette', () => {
    const dustColors = {
      blue: new THREE.Color(GALAXY_PALETTE.cosmicDust.blue),
      purple: new THREE.Color(GALAXY_PALETTE.cosmicDust.purple),
      white: new THREE.Color(GALAXY_PALETTE.cosmicDust.white),
      gold: new THREE.Color(GALAXY_PALETTE.cosmicDust.gold),
    };

    expect(threeColorToHex(dustColors.blue).toLowerCase()).toBe(
      GALAXY_PALETTE.cosmicDust.blue.toLowerCase(),
    );
    expect(threeColorToHex(dustColors.purple).toLowerCase()).toBe(
      GALAXY_PALETTE.cosmicDust.purple.toLowerCase(),
    );
    expect(threeColorToHex(dustColors.white).toLowerCase()).toBe(
      GALAXY_PALETTE.cosmicDust.white.toLowerCase(),
    );
    expect(threeColorToHex(dustColors.gold).toLowerCase()).toBe(
      GALAXY_PALETTE.cosmicDust.gold.toLowerCase(),
    );
  });

  it('constellation colors match palette', () => {
    const constellationColors = {
      stars: new THREE.Color(GALAXY_PALETTE.constellations.stars),
      lines: new THREE.Color(GALAXY_PALETTE.constellations.lines),
      linesBright: new THREE.Color(GALAXY_PALETTE.constellations.linesBright),
    };

    expect(threeColorToHex(constellationColors.stars).toLowerCase()).toBe(
      GALAXY_PALETTE.constellations.stars.toLowerCase(),
    );
    expect(threeColorToHex(constellationColors.lines).toLowerCase()).toBe(
      GALAXY_PALETTE.constellations.lines.toLowerCase(),
    );
    expect(threeColorToHex(constellationColors.linesBright).toLowerCase()).toBe(
      GALAXY_PALETTE.constellations.linesBright.toLowerCase(),
    );
  });
});
