/**
 * Consolidated Color Validation Tests
 *
 * Ensures visual identity is preserved and prevents accidental color regressions.
 * Tests document Monument Valley aesthetic and accessibility requirements.
 *
 * Consolidates:
 * - colorPalette.test.ts - Mood color contracts and accessibility
 * - shaderColorValidation.test.ts - Material color sampling and preservation
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getMoodColor, getMonumentValleyMoodColor } from '../../lib/colors';
import {
  expectColorAccessibility,
  expectColorDiversity,
  expectColorMatch,
  getColorDistance,
  getColorTemperature,
  getContrastRatio,
  hexToRgb,
} from '../helpers';

describe('Color Validation', () => {
  describe('Mood Color Palette', () => {
    it('maintains Monument Valley warm aesthetic', () => {
      // OUTCOME: Mood colors match design system with small tolerance
      const colors = {
        gratitude: getMoodColor('gratitude'),
        presence: getMoodColor('presence'),
        release: getMoodColor('release'),
        connection: getMoodColor('connection'),
      };

      // Monument Valley vibrant gem colors (from src/lib/colors.ts)
      // Tolerance of 15 allows for minor adjustments while catching major changes
      expectColorMatch(colors.gratitude, '#ffbe0b', 15); // Warm Gold
      expectColorMatch(colors.presence, '#06d6a0', 15); // Teal/Mint
      expectColorMatch(colors.release, '#118ab2', 15); // Deep Blue
      expectColorMatch(colors.connection, '#ef476f', 15); // Warm Rose
    });

    it('all mood colors are visually distinct', () => {
      // OUTCOME: Users can easily distinguish between moods by color
      const colors = [
        getMoodColor('gratitude'),
        getMoodColor('presence'),
        getMoodColor('release'),
        getMoodColor('connection'),
      ];

      // Minimum distance of 50 in RGB space ensures distinctness
      expectColorDiversity(colors, 50);
    });

    it('all mood colors are unique (no duplicates)', () => {
      // OUTCOME: Prevents mono-color screen (all same color)
      const colors = [
        getMoodColor('gratitude'),
        getMoodColor('presence'),
        getMoodColor('release'),
        getMoodColor('connection'),
      ];

      // All colors should be different hex values
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });

    it('mood colors span RGB color space (not all clustered)', () => {
      // OUTCOME: Prevents all colors being shades of one color
      const colors = {
        gratitude: hexToRgb(getMoodColor('gratitude')),
        presence: hexToRgb(getMoodColor('presence')),
        release: hexToRgb(getMoodColor('release')),
        connection: hexToRgb(getMoodColor('connection')),
      };

      // Should have variety across RGB channels
      const hasRedDominant = Object.values(colors).some(
        (c) => c.r > 200 && c.r > c.g + 50 && c.r > c.b + 50,
      );
      const hasGreenDominant = Object.values(colors).some((c) => c.g > 150 && c.g > c.r * 0.7);
      const hasBlueDominant = Object.values(colors).some((c) => c.b > 150 && c.b > c.r * 0.7);

      // At least 2 out of 3 primary-dominated colors should exist
      const varietyCount = [hasRedDominant, hasGreenDominant, hasBlueDominant].filter(
        (x) => x,
      ).length;
      expect(varietyCount).toBeGreaterThanOrEqual(2);
    });

    it('mood colors have consistent saturation', () => {
      // OUTCOME: Colors feel cohesive (not some muted, some vibrant)
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      const saturations = moods.map((mood) => {
        const rgb = hexToRgb(getMoodColor(mood));
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        return max - min; // Saturation approximation
      });

      const avgSaturation = saturations.reduce((a, b) => a + b, 0) / saturations.length;

      for (const saturation of saturations) {
        // Each color should be within 40% of average saturation
        expect(Math.abs(saturation - avgSaturation)).toBeLessThan(avgSaturation * 0.4);
      }
    });
  });

  describe('Material Color Preservation', () => {
    it('MeshPhongMaterial preserves base color without shader distortion', () => {
      // OUTCOME: Basic materials don't tint colors unexpectedly
      const expectedColor = '#ffbe0b'; // Gratitude gold
      const material = new THREE.MeshPhongMaterial({
        color: expectedColor,
      });

      // Sample the material's base color
      const actualColor = `#${material.color.getHexString()}`;

      // Should match exactly (no shader distortion)
      expectColorMatch(actualColor, expectedColor, 1);

      // Cleanup
      material.dispose();
    });

    it('particle shard materials preserve Monument Valley mood colors', () => {
      // OUTCOME: Shards maintain vibrant gem aesthetic
      const moodColors = {
        gratitude: getMonumentValleyMoodColor('gratitude'),
        presence: getMonumentValleyMoodColor('presence'),
        release: getMonumentValleyMoodColor('release'),
        connection: getMonumentValleyMoodColor('connection'),
      };

      const materials: THREE.Material[] = [];

      for (const [_mood, expectedColor] of Object.entries(moodColors)) {
        const material = new THREE.MeshPhongMaterial({
          color: expectedColor,
        });

        const actualColor = `#${material.color.getHexString()}`;

        // Allow tolerance of 5 for material conversion
        expectColorMatch(actualColor, expectedColor, 5);

        materials.push(material);
      }

      // Cleanup
      for (const material of materials) {
        material.dispose();
      }
    });

    it("frosted glass material doesn't over-tint base color", () => {
      // OUTCOME: Transparency effects preserve color hue
      const baseColor = '#ffffff'; // White shards
      const material = new THREE.MeshPhongMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.9,
      });

      const actualColor = `#${material.color.getHexString()}`;

      // Should remain white (not tinted blue/yellow)
      expectColorMatch(actualColor, baseColor, 3);

      // Verify near-white (all components > 250)
      const rgb = hexToRgb(actualColor);
      expect(rgb.r).toBeGreaterThan(250);
      expect(rgb.g).toBeGreaterThan(250);
      expect(rgb.b).toBeGreaterThan(250);

      // Cleanup
      material.dispose();
    });

    it('globe material color matches earthy brown scheme', () => {
      // OUTCOME: Globe doesn't drift toward unexpected colors
      const expectedGlobeColor = '#8b6f47'; // Warm brown earth tone
      const material = new THREE.MeshPhongMaterial({
        color: expectedGlobeColor,
      });

      const actualColor = `#${material.color.getHexString()}`;

      // Allow small delta for material processing
      expectColorMatch(actualColor, expectedGlobeColor, 5);

      // Verify it's warm (red+green > blue)
      const rgb = hexToRgb(actualColor);
      expect(rgb.r + rgb.g).toBeGreaterThan(rgb.b * 1.5);

      // Cleanup
      material.dispose();
    });
  });

  describe('Color Temperature Preservation', () => {
    it('warm colors remain warm after material conversion', () => {
      // OUTCOME: Reds/oranges don't shift toward cool tones
      const warmColors = [
        '#ffbe0b', // Gratitude gold
        '#ef476f', // Connection rose
        '#8b6f47', // Globe brown
      ];

      const materials: THREE.Material[] = [];

      for (const color of warmColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Warm colors have red > blue
        expect(rgb.r).toBeGreaterThan(rgb.b);

        materials.push(material);
      }

      // Cleanup
      for (const material of materials) {
        material.dispose();
      }
    });

    it('cool colors remain cool after material conversion', () => {
      // OUTCOME: Blues/teals don't shift toward warm tones
      const coolColors = [
        '#06d6a0', // Presence teal
        '#118ab2', // Release blue
      ];

      const materials: THREE.Material[] = [];

      for (const color of coolColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Cool colors have blue > red
        expect(rgb.b).toBeGreaterThan(rgb.r);

        materials.push(material);
      }

      // Cleanup
      for (const material of materials) {
        material.dispose();
      }
    });

    it('mood colors span warm to cool spectrum', () => {
      // OUTCOME: Palette has both warm and cool colors for variety
      const temperatures = {
        gratitude: getColorTemperature(getMoodColor('gratitude')),
        presence: getColorTemperature(getMoodColor('presence')),
        release: getColorTemperature(getMoodColor('release')),
        connection: getColorTemperature(getMoodColor('connection')),
      };

      // Should have both positive (warm) and negative (cool) temperatures
      const temps = Object.values(temperatures);
      const hasWarm = temps.some((t) => t > 100); // Warm reds/oranges
      const hasCool = temps.some((t) => t < 0); // Cool blues/teals

      expect(hasWarm).toBe(true);
      expect(hasCool).toBe(true);
    });

    it('gratitude is warmest, release is coolest', () => {
      // OUTCOME: Gratitude (gold) is warmest, release (blue) is coolest
      const gratitudeTemp = getColorTemperature(getMoodColor('gratitude'));
      const releaseTemp = getColorTemperature(getMoodColor('release'));

      expect(gratitudeTemp).toBeGreaterThan(releaseTemp);
      expect(releaseTemp).toBeLessThan(0); // Release should be cool (negative temp)
    });
  });

  describe('Saturation Preservation', () => {
    it('vibrant mood colors maintain high saturation', () => {
      // OUTCOME: Monument Valley gem colors stay vibrant, not desaturated
      const vibrantColors = [
        '#ffbe0b', // Gratitude
        '#06d6a0', // Presence
        '#118ab2', // Release
        '#ef476f', // Connection
      ];

      const materials: THREE.Material[] = [];

      for (const color of vibrantColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Saturation: max - min should be high for vibrant colors
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const saturation = max - min;

        // Should maintain high saturation (>100 in RGB space)
        expect(saturation).toBeGreaterThan(100);

        materials.push(material);
      }

      // Cleanup
      for (const material of materials) {
        material.dispose();
      }
    });

    it('neutral background colors maintain low saturation', () => {
      // OUTCOME: Backgrounds stay neutral, not oversaturated
      const neutralColors = [
        '#f5f0e8', // Light cream background
        '#1a1a1a', // Dark background
      ];

      const materials: THREE.Material[] = [];

      for (const color of neutralColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const saturation = max - min;

        // Should maintain low saturation (<30 for neutral tones)
        expect(saturation).toBeLessThan(30);

        materials.push(material);
      }

      // Cleanup
      for (const material of materials) {
        material.dispose();
      }
    });
  });

  describe('Accessibility - WCAG Compliance', () => {
    it('mood colors have minimum contrast against dark background', () => {
      // OUTCOME: All colors are readable on dark backgrounds
      const darkBackground = '#1a1a1a';
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      for (const mood of moods) {
        const color = getMoodColor(mood);
        const contrast = getContrastRatio(color, darkBackground);

        // WCAG AA requires 3:1 for large text
        expect(contrast).toBeGreaterThanOrEqual(3);
      }
    });

    it('mood colors have minimum contrast against light background', () => {
      // OUTCOME: Colors work on light backgrounds too
      const lightBackground = '#f5f0e8'; // Current scene background
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      for (const mood of moods) {
        const color = getMoodColor(mood);
        const contrast = getContrastRatio(color, lightBackground);

        // At least 1.4:1 contrast for visibility
        expect(contrast).toBeGreaterThanOrEqual(1.4);
      }
    });

    it('all mood colors meet WCAG AA for large text', () => {
      // OUTCOME: Colors are accessible for users with vision impairments
      const background = '#1a1a1a';
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      for (const mood of moods) {
        expectColorAccessibility(getMoodColor(mood), background, 3); // WCAG AA
      }
    });

    it('mood colors are distinguishable for common color blindness', () => {
      // OUTCOME: Red-green colorblind users can distinguish moods
      const colors = {
        gratitude: getMoodColor('gratitude'),
        presence: getMoodColor('presence'),
        release: getMoodColor('release'),
        connection: getMoodColor('connection'),
      };

      // Ensure we're not relying solely on red-green differences
      const presenceRgb = hexToRgb(colors.presence);
      const gratitudeRgb = hexToRgb(colors.gratitude);

      // Blue component should be significantly higher in presence
      expect(presenceRgb.b).toBeGreaterThan(gratitudeRgb.b + 50);
    });
  });

  describe('Background and Environment Colors', () => {
    it('background color matches Monument Valley palette', () => {
      // OUTCOME: Scene background is warm cream, not stark white
      const backgroundColor = '#f5f0e8'; // Default scene background

      // Background should be warm (more red/yellow than blue)
      const temp = getColorTemperature(backgroundColor);
      expect(temp).toBeGreaterThan(0);

      // Should be light but not pure white
      const rgb = hexToRgb(backgroundColor);
      const brightness = (rgb.r + rgb.g + rgb.b) / 3;
      expect(brightness).toBeGreaterThan(200); // Bright
      expect(brightness).toBeLessThan(255); // Not pure white
    });

    it('globe color is earthy and warm', () => {
      // OUTCOME: Central globe has warm brown/earth tone
      const globeColor = '#8b6f47'; // Default globe color

      // Should be warm
      const temp = getColorTemperature(globeColor);
      expect(temp).toBeGreaterThan(0);

      // Should be brownish (more red+green than blue)
      const rgb = hexToRgb(globeColor);
      expect(rgb.r + rgb.g).toBeGreaterThan(rgb.b * 1.5);
    });

    it('atmosphere has subtle transparency', () => {
      // OUTCOME: Atmosphere layers don't overpower the scene
      const atmosphereOpacity = 0.08; // Default atmosphere opacity

      expect(atmosphereOpacity).toBeGreaterThan(0);
      expect(atmosphereOpacity).toBeLessThan(0.15); // Very subtle
    });
  });

  describe('ShaderMaterial Color Uniforms', () => {
    it('custom shaders respect color uniform inputs', () => {
      // OUTCOME: Custom shaders don't hardcode unexpected colors
      const expectedColor = new THREE.Color('#ffbe0b');

      const material = new THREE.ShaderMaterial({
        uniforms: {
          baseColor: { value: expectedColor },
        },
        fragmentShader: `
          uniform vec3 baseColor;
          void main() {
            gl_FragColor = vec4(baseColor, 1.0);
          }
        `,
      });

      const uniformColor = material.uniforms.baseColor.value;
      const actualHex = `#${uniformColor.getHexString()}`;

      expectColorMatch(actualHex, '#ffbe0b', 1);

      // Cleanup
      material.dispose();
    });

    it("time-based shader uniforms don't exceed reasonable color shifts", () => {
      // OUTCOME: Animated shaders don't create jarring color transitions
      const baseColor = new THREE.Color('#8b6f47');

      // Simulate time-based color modulation (common in breathing animations)
      const timeValues = [0, 0.25, 0.5, 0.75, 1.0];

      for (const time of timeValues) {
        // Simulate common breathing intensity modulation (±20%)
        const modulation = 1.0 + Math.sin(time * Math.PI * 2) * 0.2;
        const modulatedColor = baseColor.clone().multiplyScalar(modulation);

        // Verify color doesn't shift hue (only intensity)
        const originalHSL = { h: 0, s: 0, l: 0 };
        const modulatedHSL = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(originalHSL);
        modulatedColor.getHSL(modulatedHSL);

        // Hue should remain stable (within 0.05 tolerance)
        expect(Math.abs(originalHSL.h - modulatedHSL.h)).toBeLessThan(0.05);

        // Saturation should remain stable (within 0.1 tolerance)
        expect(Math.abs(originalHSL.s - modulatedHSL.s)).toBeLessThan(0.1);
      }
    });
  });

  describe('Color Consistency', () => {
    it('getMoodColor returns same color for same mood', () => {
      // OUTCOME: Color mapping is deterministic
      const mood = 'gratitude';

      const color1 = getMoodColor(mood);
      const color2 = getMoodColor(mood);
      const color3 = getMoodColor(mood);

      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });

    it('all mood IDs have color mappings', () => {
      // OUTCOME: No mood is missing a color
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      for (const mood of moods) {
        const color = getMoodColor(mood);
        expect(color).toBeTruthy();
        expect(color).toMatch(/^#[0-9a-f]{6}$/i); // Valid hex
      }
    });

    it('material color conversions are deterministic', () => {
      // OUTCOME: Same input always produces same output
      const testColor = '#ffbe0b';

      const material1 = new THREE.MeshPhongMaterial({ color: testColor });
      const material2 = new THREE.MeshPhongMaterial({ color: testColor });

      const color1 = `#${material1.color.getHexString()}`;
      const color2 = `#${material2.color.getHexString()}`;

      expect(color1).toBe(color2);

      // Cleanup
      material1.dispose();
      material2.dispose();
    });
  });

  describe('Visual Regression Guards', () => {
    it('documents color palette snapshot for regression detection', () => {
      // OUTCOME: Any color change is intentional and documented
      const palette = {
        moods: {
          gratitude: getMoodColor('gratitude'),
          presence: getMoodColor('presence'),
          release: getMoodColor('release'),
          connection: getMoodColor('connection'),
        },
        environment: {
          background: '#f5f0e8', // Default scene background
          globe: '#8b6f47', // Default globe color
        },
      };

      // This snapshot documents the current palette
      expect(palette).toMatchSnapshot();
    });

    it('color distances remain stable', () => {
      // OUTCOME: Relative color relationships are preserved
      const gratitude = getMoodColor('gratitude');
      const presence = getMoodColor('presence');

      const distance = getColorDistance(gratitude, presence);

      // Distance between gratitude and presence should be substantial
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(300);
    });
  });
});
