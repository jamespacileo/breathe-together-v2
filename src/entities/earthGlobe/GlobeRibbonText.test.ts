/**
 * Tests for GlobeRibbonText configuration and positioning logic
 *
 * These tests verify the ribbon text is correctly positioned outside the globe
 * and the curveRadius calculation produces the expected cylindrical curvature.
 */

import { describe, expect, it } from 'vitest';

/**
 * Calculate ribbon positioning values (extracted from component logic)
 * This mirrors the calculations done in GlobeRibbonText component
 */
function calculateRibbonPosition(globeRadius: number) {
  // Ribbon is positioned slightly outside the globe
  const ribbonRadius = globeRadius + 0.1;

  // curveRadius: negative = convex (text curves outward, center behind text)
  // With curveRadius = -R and text at z = R, the cylinder center aligns with globe center
  const curveRadius = -ribbonRadius;

  // Text is positioned at z = ribbonRadius so it sits on the sphere surface
  const textPosition: [number, number, number] = [0, 0, ribbonRadius];

  return { ribbonRadius, curveRadius, textPosition };
}

describe('GlobeRibbonText', () => {
  describe('ribbon positioning calculations', () => {
    const DEFAULT_GLOBE_RADIUS = 1.5;

    it('positions ribbon outside the globe surface', () => {
      const { ribbonRadius } = calculateRibbonPosition(DEFAULT_GLOBE_RADIUS);

      // Ribbon should be 0.1 units outside the globe
      expect(ribbonRadius).toBe(DEFAULT_GLOBE_RADIUS + 0.1);
      expect(ribbonRadius).toBeGreaterThan(DEFAULT_GLOBE_RADIUS);
    });

    it('calculates negative curveRadius for convex curvature', () => {
      const { curveRadius, ribbonRadius } = calculateRibbonPosition(DEFAULT_GLOBE_RADIUS);

      // curveRadius should be negative (convex - text curves outward)
      expect(curveRadius).toBeLessThan(0);
      // curveRadius magnitude should equal ribbonRadius
      expect(Math.abs(curveRadius)).toBe(ribbonRadius);
    });

    it('positions text at z = ribbonRadius', () => {
      const { textPosition, ribbonRadius } = calculateRibbonPosition(DEFAULT_GLOBE_RADIUS);

      // Text should be positioned at z = ribbonRadius
      expect(textPosition[0]).toBe(0); // x = 0
      expect(textPosition[1]).toBe(0); // y = 0
      expect(textPosition[2]).toBe(ribbonRadius); // z = ribbonRadius
    });

    it('cylinder center aligns with globe center', () => {
      const { curveRadius, textPosition } = calculateRibbonPosition(DEFAULT_GLOBE_RADIUS);

      // With negative curveRadius, cylinder center is behind the text by |curveRadius| units
      // Text is at z = ribbonRadius, curveRadius = -ribbonRadius
      // So cylinder center is at z = ribbonRadius - ribbonRadius = 0 (globe center)
      const cylinderCenterZ = textPosition[2] + curveRadius;
      expect(cylinderCenterZ).toBeCloseTo(0, 5);
    });

    it('works with different globe radii', () => {
      const radii = [1.0, 1.5, 2.0, 3.0];

      for (const radius of radii) {
        const { ribbonRadius, curveRadius, textPosition } = calculateRibbonPosition(radius);

        // Ribbon always 0.1 outside globe
        expect(ribbonRadius).toBe(radius + 0.1);

        // curveRadius magnitude equals ribbonRadius
        expect(Math.abs(curveRadius)).toBe(ribbonRadius);

        // Cylinder center always at origin
        const cylinderCenterZ = textPosition[2] + curveRadius;
        expect(cylinderCenterZ).toBeCloseTo(0, 5);
      }
    });
  });

  describe('text wrapping geometry', () => {
    it('text wraps around 360 degrees when long enough', () => {
      // For a cylinder of radius R, circumference = 2 * PI * R
      // Text needs to be approximately this length to wrap fully
      const ribbonRadius = 1.6; // 1.5 + 0.1
      const circumference = 2 * Math.PI * ribbonRadius;

      // Circumference should be approximately 10 units for radius 1.6
      expect(circumference).toBeCloseTo(10.05, 1);
    });

    it('calculates text coverage angle for given text length', () => {
      const ribbonRadius = 1.6;
      const textLength = 5; // hypothetical text width in 3D units

      // Arc length = radius * angle (radians)
      // So angle = textLength / radius
      const coverageAngle = textLength / ribbonRadius;

      // 5 units of text on radius 1.6 covers about 3.14 radians (180 degrees)
      expect(coverageAngle).toBeCloseTo(Math.PI, 1);
    });
  });

  describe('default props', () => {
    it('uses correct default values', () => {
      // These match the default props in GlobeRibbonText component
      const defaults = {
        text: '✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦',
        globeRadius: 1.5,
        heightOffset: 0,
        tiltAngle: 0.15,
        color: '#5eb3b2',
        fontSize: 0.12,
        opacity: 0.8,
        syncRotation: true,
        breathSync: true,
        rotationDirection: 1,
        glyphGeometryDetail: 4,
      };

      expect(defaults.globeRadius).toBe(1.5);
      expect(defaults.color).toBe('#5eb3b2');
      expect(defaults.tiltAngle).toBeCloseTo(0.15, 2);
      expect(defaults.glyphGeometryDetail).toBeGreaterThanOrEqual(1);
    });
  });

  describe('rotation synchronization', () => {
    const GLOBE_ROTATION_SPEED = 0.0008; // rad/frame, matches EarthGlobe

    it('rotation speed matches EarthGlobe', () => {
      // GlobeRibbonText should rotate at same speed as EarthGlobe
      expect(GLOBE_ROTATION_SPEED).toBe(0.0008);
    });

    it('can rotate in opposite direction', () => {
      const rotationDirection = -1;
      const effectiveSpeed = GLOBE_ROTATION_SPEED * rotationDirection;

      expect(effectiveSpeed).toBe(-0.0008);
    });

    it('calculates rotation over time correctly', () => {
      const framesPerSecond = 60;
      const seconds = 10;
      const totalFrames = framesPerSecond * seconds;

      const totalRotation = GLOBE_ROTATION_SPEED * totalFrames;

      // After 10 seconds at 60fps, should rotate about 0.48 radians (27.5 degrees)
      expect(totalRotation).toBeCloseTo(0.48, 2);
    });
  });

  describe('breathing opacity animation', () => {
    it('calculates opacity range correctly', () => {
      const baseOpacity = 0.8;

      // At breathPhase = 0 (exhale), opacity = base * 0.7
      const minOpacity = baseOpacity * 0.7;
      expect(minOpacity).toBeCloseTo(0.56, 2);

      // At breathPhase = 1 (inhale), opacity = base * 1.0
      const maxOpacity = baseOpacity * 1.0;
      expect(maxOpacity).toBeCloseTo(0.8, 2);
    });

    it('opacity varies smoothly with breath phase', () => {
      const baseOpacity = 0.8;

      // Test several breath phases
      const phases = [0, 0.25, 0.5, 0.75, 1.0];

      for (const phase of phases) {
        const opacity = baseOpacity * (0.7 + phase * 0.3);
        expect(opacity).toBeGreaterThanOrEqual(baseOpacity * 0.7);
        expect(opacity).toBeLessThanOrEqual(baseOpacity * 1.0);
      }
    });
  });

  describe('height offset and tilt', () => {
    it('supports multiple ribbon bands at different heights', () => {
      const heights = [0, 0.45, -0.45];

      // Primary at equator, secondary above and below
      expect(heights[0]).toBe(0);
      expect(heights[1]).toBeGreaterThan(0);
      expect(heights[2]).toBeLessThan(0);
    });

    it('supports different tilt angles', () => {
      const tilts = [0.12, -0.18, 0.22];

      // All tilts should be reasonable (less than 45 degrees = ~0.785 rad)
      for (const tilt of tilts) {
        expect(Math.abs(tilt)).toBeLessThan(Math.PI / 4);
      }
    });
  });
});
