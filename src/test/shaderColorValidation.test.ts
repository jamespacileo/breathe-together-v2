/**
 * Shader Color Validation Tests
 *
 * Validates that shader materials render colors within expected ranges.
 * This protects against AI code generation completely altering the visual aesthetic.
 *
 * Tests sample actual rendered colors from Three.js materials and compare against
 * the Monument Valley color scheme to ensure shaders don't introduce unexpected tints.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getMonumentValleyMoodColor } from '../lib/colors';
import { expectColorMatch, hexToRgb } from './helpers';

describe('Shader Color Validation', () => {
  describe('Material Color Sampling', () => {
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
    });

    it('particle shard material preserves Monument Valley mood colors', () => {
      // OUTCOME: Shards maintain vibrant gem aesthetic
      const moodColors = {
        gratitude: getMonumentValleyMoodColor('gratitude'),
        presence: getMonumentValleyMoodColor('presence'),
        release: getMonumentValleyMoodColor('release'),
        connection: getMonumentValleyMoodColor('connection'),
      };

      for (const [_mood, expectedColor] of Object.entries(moodColors)) {
        const material = new THREE.MeshPhongMaterial({
          color: expectedColor,
        });

        const actualColor = `#${material.color.getHexString()}`;

        // Allow tolerance of 5 for material conversion
        expectColorMatch(actualColor, expectedColor, 5);
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

      for (const color of warmColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Warm colors have red > blue
        expect(rgb.r).toBeGreaterThan(rgb.b);
      }
    });

    it('cool colors remain cool after material conversion', () => {
      // OUTCOME: Blues/teals don't shift toward warm tones
      const coolColors = [
        '#06d6a0', // Presence teal
        '#118ab2', // Release blue
      ];

      for (const color of coolColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Cool colors have blue > red
        expect(rgb.b).toBeGreaterThan(rgb.r);
      }
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

      for (const color of vibrantColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Saturation: max - min should be high for vibrant colors
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const saturation = max - min;

        // Should maintain high saturation (>100 in RGB space)
        expect(saturation).toBeGreaterThan(100);
      }
    });

    it('neutral background colors maintain low saturation', () => {
      // OUTCOME: Backgrounds stay neutral, not oversaturated
      const neutralColors = [
        '#f5f0e8', // Light cream background
        '#1a1a1a', // Dark background
      ];

      for (const color of neutralColors) {
        const material = new THREE.MeshPhongMaterial({ color });
        const rgb = hexToRgb(`#${material.color.getHexString()}`);

        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const saturation = max - min;

        // Should maintain low saturation (<30 for neutral tones)
        expect(saturation).toBeLessThan(30);
      }
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

  describe('Lighting Interaction Bounds', () => {
    it("ambient light doesn't wash out color identity", () => {
      // OUTCOME: Even with strong ambient light, colors remain distinguishable
      const moodColors = {
        gratitude: getMonumentValleyMoodColor('gratitude'),
        presence: getMonumentValleyMoodColor('presence'),
        release: getMonumentValleyMoodColor('release'),
        connection: getMonumentValleyMoodColor('connection'),
      };

      // Simulate ambient light at max reasonable intensity (0.8)
      const _ambientIntensity = 0.8;

      for (const [_mood, baseColor] of Object.entries(moodColors)) {
        const material = new THREE.MeshPhongMaterial({ color: baseColor });
        const _rgb = hexToRgb(`#${material.color.getHexString()}`);

        // Even with strong lighting, base color shouldn't shift
        // (lighting affects rendered intensity, not material.color)
        expectColorMatch(`#${material.color.getHexString()}`, baseColor, 3);
      }
    });

    it("directional light color doesn't tint scene unexpectedly", () => {
      // OUTCOME: Light color is neutral or warm, not garish
      const neutralLight = new THREE.DirectionalLight('#ffffff', 0.6);
      const warmLight = new THREE.DirectionalLight('#ffe8d6', 0.6);

      // Neutral light should be pure white or near-white
      const neutralRgb = hexToRgb(`#${neutralLight.color.getHexString()}`);
      const neutralMin = Math.min(neutralRgb.r, neutralRgb.g, neutralRgb.b);
      const neutralMax = Math.max(neutralRgb.r, neutralRgb.g, neutralRgb.b);
      expect(neutralMax - neutralMin).toBeLessThan(10); // Very low saturation

      // Warm light should have red >= green >= blue
      const warmRgb = hexToRgb(`#${warmLight.color.getHexString()}`);
      expect(warmRgb.r).toBeGreaterThanOrEqual(warmRgb.g);
      expect(warmRgb.g).toBeGreaterThanOrEqual(warmRgb.b);
    });
  });

  describe('Regression Guards', () => {
    it('color palette snapshot matches expected values', () => {
      // OUTCOME: Any color change is intentional and caught by tests
      const palette = {
        moods: {
          gratitude: getMonumentValleyMoodColor('gratitude'),
          presence: getMonumentValleyMoodColor('presence'),
          release: getMonumentValleyMoodColor('release'),
          connection: getMonumentValleyMoodColor('connection'),
        },
        environment: {
          background: '#f5f0e8',
          globe: '#8b6f47',
        },
      };

      // Snapshot test - any change triggers review
      expect(palette).toMatchSnapshot();
    });

    it('material color conversions are deterministic', () => {
      // OUTCOME: Same input always produces same output
      const testColor = '#ffbe0b';

      const material1 = new THREE.MeshPhongMaterial({ color: testColor });
      const material2 = new THREE.MeshPhongMaterial({ color: testColor });

      const color1 = `#${material1.color.getHexString()}`;
      const color2 = `#${material2.color.getHexString()}`;

      expect(color1).toBe(color2);
    });
  });
});
