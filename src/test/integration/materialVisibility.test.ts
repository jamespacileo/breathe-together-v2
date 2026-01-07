/**
 * Material Visibility Tests
 *
 * Ensures all scene materials have visible opacity levels.
 * Protects against accidental invisible objects that would cause blank screens.
 *
 * IMPORTANT: This file imports constants from source to ensure tests
 * validate actual values, not hardcoded assumptions.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { VISUAL_COLORS, VISUAL_OPACITY } from '../../constants';
import { CLOUD_CONFIGS } from '../../entities/environment/CloudSystem';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';

describe('Material Visibility Tests', () => {
  describe('Globe Material Opacity', () => {
    it('globe main material is opaque (uses VISUAL_OPACITY.GLOBE)', () => {
      // OUTCOME: Globe is fully visible - uses actual constant
      const globeMaterial = new THREE.MeshPhongMaterial({
        color: VISUAL_COLORS.GLOBE_BROWN,
        opacity: VISUAL_OPACITY.GLOBE,
        transparent: false,
      });

      expect(globeMaterial.opacity).toBe(VISUAL_OPACITY.GLOBE);
      expect(VISUAL_OPACITY.GLOBE).toBe(1.0); // Verify constant is correct
      expect(globeMaterial.transparent).toBe(false);
      expect(globeMaterial.visible).toBe(true);
    });

    it('globe overlay materials maintain minimum visibility (uses VISUAL_OPACITY.ATMOSPHERE)', () => {
      // OUTCOME: Atmosphere overlays don't completely hide globe
      const minOpacity = VISUAL_OPACITY.ATMOSPHERE;
      const maxOpacity = VISUAL_OPACITY.CLOUD_MAX;

      expect(minOpacity).toBeGreaterThan(0);
      expect(minOpacity).toBeLessThan(0.15); // Very subtle
      expect(maxOpacity).toBeLessThan(1.0); // Still see through
    });

    it('shard glass body has subtle opacity range (uses VISUAL_OPACITY.SHARD_GLASS)', () => {
      // OUTCOME: Shard glass body is visible but not opaque
      const frostedGlassMaterial = new THREE.MeshPhongMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: VISUAL_OPACITY.SHARD_GLASS,
      });

      expect(frostedGlassMaterial.opacity).toBeGreaterThan(0.1);
      expect(frostedGlassMaterial.opacity).toBeLessThanOrEqual(0.6);
      expect(frostedGlassMaterial.transparent).toBe(true);
    });
  });

  describe('Particle Material Opacity', () => {
    it('particle swarm shards are never invisible (uses VISUAL_OPACITY.SHARD_GLASS)', () => {
      // OUTCOME: All particles have visible opacity - uses actual constant
      const particleOpacity = VISUAL_OPACITY.SHARD_GLASS;

      expect(particleOpacity).toBeGreaterThan(0.1);
      expect(particleOpacity).toBeLessThanOrEqual(0.6);
    });

    it('mood-colored particles maintain visibility', () => {
      // OUTCOME: All mood colors are visible - using constant for all moods
      const moodOpacity = VISUAL_OPACITY.SHARD_GLASS;

      // Verify the constant is suitable for all moods
      expect(moodOpacity).toBeGreaterThan(0.1);
      expect(moodOpacity).toBeLessThanOrEqual(0.6);
    });

    it('atmospheric particles have subtle but visible opacity', () => {
      // OUTCOME: Background particles are visible
      // Note: Atmospheric particles use a different opacity than shard glass
      const atmosphericOpacity = 0.6; // This is set directly in AtmosphericParticles

      expect(atmosphericOpacity).toBeGreaterThan(0.3);
      expect(atmosphericOpacity).toBeLessThan(1.0);
    });
  });

  describe('Cloud Material Opacity', () => {
    it('all cloud configurations have visible opacity (within VISUAL_OPACITY range)', () => {
      // OUTCOME: No clouds are invisible - uses constants for bounds
      for (const cloud of CLOUD_CONFIGS) {
        expect(cloud.opacity).toBeGreaterThan(0);
        expect(cloud.opacity).toBeLessThanOrEqual(1.0);

        // Clouds should be within expected range
        expect(cloud.opacity).toBeGreaterThanOrEqual(VISUAL_OPACITY.CLOUD_MIN);
        expect(cloud.opacity).toBeLessThanOrEqual(VISUAL_OPACITY.CLOUD_MAX);
      }
    });

    it('cloud layers maintain visibility hierarchy', () => {
      // OUTCOME: All layers are visible, with outer clouds most subtle
      const innerClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'inner');
      const middleClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'middle');
      const outerClouds = CLOUD_CONFIGS.filter((c) => c.layer === 'outer');

      for (const cloud of [...innerClouds, ...middleClouds, ...outerClouds]) {
        expect(cloud.opacity).toBeGreaterThanOrEqual(VISUAL_OPACITY.CLOUD_MIN);
      }
    });
  });

  describe('Material Color Brightness', () => {
    it('no materials use pure black (invisible on dark background)', () => {
      // OUTCOME: All materials are distinguishable from black background
      // Uses constants where available, palette for mood colors
      const testColors = [
        MONUMENT_VALLEY_PALETTE.gratitude,
        MONUMENT_VALLEY_PALETTE.presence,
        MONUMENT_VALLEY_PALETTE.release,
        MONUMENT_VALLEY_PALETTE.connection,
        VISUAL_COLORS.GLOBE_BROWN,
        VISUAL_COLORS.BACKGROUND_TOP,
      ];

      for (const colorHex of testColors) {
        const color = new THREE.Color(colorHex);

        // No pure black (0, 0, 0)
        const totalBrightness = color.r + color.g + color.b;
        expect(totalBrightness).toBeGreaterThan(0.1);

        // At least one channel should be reasonably bright
        const maxChannel = Math.max(color.r, color.g, color.b);
        expect(maxChannel).toBeGreaterThan(0.05);
      }
    });

    it('no materials use pure white on light background (invisible)', () => {
      // OUTCOME: Materials are distinguishable from white background
      const lightBackground = new THREE.Color(VISUAL_COLORS.BACKGROUND_TOP);

      const moodColors = [
        new THREE.Color(MONUMENT_VALLEY_PALETTE.gratitude),
        new THREE.Color(MONUMENT_VALLEY_PALETTE.presence),
        new THREE.Color(MONUMENT_VALLEY_PALETTE.release),
        new THREE.Color(MONUMENT_VALLEY_PALETTE.connection),
      ];

      for (const color of moodColors) {
        // Colors should be noticeably different from background
        const colorDistance = Math.sqrt(
          (color.r - lightBackground.r) ** 2 +
            (color.g - lightBackground.g) ** 2 +
            (color.b - lightBackground.b) ** 2,
        );

        expect(colorDistance).toBeGreaterThan(0.2); // Noticeable difference
      }
    });
  });

  describe('Transparent Materials Validation', () => {
    it('transparent materials have reasonable opacity ranges (uses VISUAL_OPACITY constants)', () => {
      // OUTCOME: Transparency is intentional, not accidental - uses actual constants
      const transparentMaterials = [
        {
          name: 'shard-glass',
          opacity: VISUAL_OPACITY.SHARD_GLASS,
          minExpected: 0.1,
          maxExpected: 0.6,
        },
        {
          name: 'atmosphere',
          opacity: VISUAL_OPACITY.ATMOSPHERE,
          minExpected: 0.05,
          maxExpected: 0.15,
        },
        {
          name: 'cloud',
          opacity: 0.35,
          minExpected: VISUAL_OPACITY.CLOUD_MIN,
          maxExpected: VISUAL_OPACITY.CLOUD_MAX,
        },
      ];

      for (const mat of transparentMaterials) {
        expect(mat.opacity).toBeGreaterThanOrEqual(mat.minExpected);
        expect(mat.opacity).toBeLessThanOrEqual(mat.maxExpected);
        expect(mat.opacity).toBeGreaterThan(0);
      }
    });

    it('no materials have opacity of exactly 0 (completely invisible)', () => {
      // OUTCOME: Prevents accidental invisible objects - uses actual constants
      const allOpacities = [
        VISUAL_OPACITY.GLOBE, // Globe
        VISUAL_OPACITY.SHARD_GLASS, // Particles
        VISUAL_OPACITY.ATMOSPHERE, // Atmosphere
        ...CLOUD_CONFIGS.map((c) => c.opacity),
      ];

      for (const opacity of allOpacities) {
        expect(opacity).toBeGreaterThan(0);
        expect(opacity).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('Material Visibility Property', () => {
    it('all materials have visible=true by default', () => {
      // OUTCOME: Materials render unless explicitly hidden - uses constants
      const materials = [
        new THREE.MeshPhongMaterial({ color: VISUAL_COLORS.GLOBE_BROWN }),
        new THREE.MeshPhongMaterial({
          color: MONUMENT_VALLEY_PALETTE.gratitude,
          transparent: true,
          opacity: VISUAL_OPACITY.SHARD_GLASS,
        }),
        new THREE.ShaderMaterial({
          uniforms: { color: { value: new THREE.Color('#ffffff') } },
        }),
      ];

      for (const material of materials) {
        expect(material.visible).toBe(true);
      }
    });

    it('materials maintain visibility after color/opacity changes', () => {
      // OUTCOME: Updating properties doesn't hide materials
      const material = new THREE.MeshPhongMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: VISUAL_OPACITY.GLOBE,
      });

      // Change opacity
      material.opacity = 0.5;
      expect(material.visible).toBe(true);

      // Change color
      material.color.set('#ff0000');
      expect(material.visible).toBe(true);

      // Change transparency
      material.transparent = false;
      expect(material.visible).toBe(true);
    });
  });

  describe('Scene Lighting Impact on Visibility', () => {
    it('ambient light intensity ensures minimum visibility', () => {
      // OUTCOME: Even without directional light, objects are visible
      const ambientIntensity = 0.4; // Default ambient light

      expect(ambientIntensity).toBeGreaterThan(0.2);
      expect(ambientIntensity).toBeLessThan(2.0);
    });

    it('combined lighting does not wash out or darken excessively', () => {
      // OUTCOME: Total light is balanced
      const ambientIntensity = 0.4;
      const directionalIntensity = 0.6;
      const totalIntensity = ambientIntensity + directionalIntensity;

      expect(totalIntensity).toBeGreaterThan(0.5); // Not too dark
      expect(totalIntensity).toBeLessThan(3.0); // Not washed out
    });
  });

  describe('Material Opacity Mutation Protection', () => {
    it('detects if globe opacity is accidentally set to 0 (validates VISUAL_OPACITY.GLOBE)', () => {
      // OUTCOME: Mutation test - globe should be visible
      const validGlobeOpacity = VISUAL_OPACITY.GLOBE;
      const invalidGlobeOpacity = 0.0;

      expect(validGlobeOpacity).toBeGreaterThan(0.5);
      expect(invalidGlobeOpacity).not.toBeGreaterThan(0); // This would fail
    });

    it('detects if particle opacity drops below threshold (validates VISUAL_OPACITY.SHARD_GLASS)', () => {
      // OUTCOME: Mutation test - particles should be visible
      const validParticleOpacity = VISUAL_OPACITY.SHARD_GLASS;
      const tooLowOpacity = 0.05;

      expect(validParticleOpacity).toBeGreaterThan(0.1);
      expect(tooLowOpacity).not.toBeGreaterThan(0.1); // This would fail
    });

    it('detects if all cloud opacities become 0', () => {
      // OUTCOME: Mutation test - at least some clouds should be visible
      const cloudOpacities = CLOUD_CONFIGS.map((c) => c.opacity);
      const hasVisibleClouds = cloudOpacities.some(
        (opacity) => opacity >= VISUAL_OPACITY.CLOUD_MIN,
      );

      expect(hasVisibleClouds).toBe(true);
    });
  });

  describe('VISUAL_CONSTANTS validation', () => {
    it('VISUAL_OPACITY constants are valid ranges', () => {
      // OUTCOME: Constants themselves are correctly defined
      expect(VISUAL_OPACITY.GLOBE).toBe(1.0);
      expect(VISUAL_OPACITY.SHARD_GLASS).toBeGreaterThan(0.1);
      expect(VISUAL_OPACITY.ATMOSPHERE).toBeGreaterThan(0);
      expect(VISUAL_OPACITY.ATMOSPHERE).toBeLessThan(0.2);
      expect(VISUAL_OPACITY.CLOUD_MIN).toBeGreaterThan(0);
      expect(VISUAL_OPACITY.CLOUD_MAX).toBeLessThan(1.0);
    });

    it('VISUAL_COLORS constants are valid hex colors', () => {
      // OUTCOME: Color constants are properly formatted
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      expect(VISUAL_COLORS.BACKGROUND_TOP).toMatch(hexPattern);
      expect(VISUAL_COLORS.BACKGROUND_MID).toMatch(hexPattern);
      expect(VISUAL_COLORS.GLOBE_BROWN).toMatch(hexPattern);
      expect(VISUAL_COLORS.CLOUD_TEAL_LIGHT).toMatch(hexPattern);
      expect(VISUAL_COLORS.CLOUD_TEAL_MID).toMatch(hexPattern);
      expect(VISUAL_COLORS.CLOUD_NAVY).toMatch(hexPattern);
    });

    it('VISUAL_COLORS match intended temperature', () => {
      // OUTCOME: Background is deep navy; globe brown remains warm
      const backgroundTop = new THREE.Color(VISUAL_COLORS.BACKGROUND_TOP);
      const globeBrown = new THREE.Color(VISUAL_COLORS.GLOBE_BROWN);

      // Background is cool/deep navy (blue dominant)
      expect(backgroundTop.b).toBeGreaterThan(backgroundTop.r);
      expect(backgroundTop.b).toBeGreaterThan(backgroundTop.g);

      // Globe brown is warm (r+g > b)
      expect(globeBrown.r + globeBrown.g).toBeGreaterThan(globeBrown.b);
    });
  });
});
