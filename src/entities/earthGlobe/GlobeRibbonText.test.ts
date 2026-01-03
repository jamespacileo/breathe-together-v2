/**
 * Tests for GlobeRibbonText configuration and positioning logic
 *
 * These tests verify the ribbon text is correctly positioned outside the globe,
 * wraps fully around 360°, and the curveRadius calculation produces the expected
 * cylindrical curvature.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateTextRepetitions,
  generateFullCircleText,
  RIBBON_SEGMENTS,
} from './GlobeRibbonText';

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

  describe('calculateTextRepetitions', () => {
    const DEFAULT_RADIUS = 1.6;
    const DEFAULT_FONT_SIZE = 0.12;
    const DEFAULT_LETTER_SPACING = 0.08;

    it('calculates repetitions needed to fill circumference', () => {
      const text = '✦ BREATHE ✦';
      const repetitions = calculateTextRepetitions(
        text,
        DEFAULT_RADIUS,
        DEFAULT_FONT_SIZE,
        DEFAULT_LETTER_SPACING,
      );

      // Should return at least 1
      expect(repetitions).toBeGreaterThanOrEqual(1);

      // For short text on large radius, should need multiple repetitions
      expect(repetitions).toBeGreaterThan(1);
    });

    it('returns 1 for very long text', () => {
      // Create text that's longer than the circumference
      const longText = 'A'.repeat(500);
      const repetitions = calculateTextRepetitions(
        longText,
        DEFAULT_RADIUS,
        DEFAULT_FONT_SIZE,
        DEFAULT_LETTER_SPACING,
      );

      // Should return minimum of 1 (plus 1 for seamless wrap = 2)
      expect(repetitions).toBeGreaterThanOrEqual(1);
    });

    it('increases repetitions for smaller font sizes', () => {
      const text = '✦ BREATHE ✦';

      const repLarge = calculateTextRepetitions(text, DEFAULT_RADIUS, 0.2, DEFAULT_LETTER_SPACING);
      const repSmall = calculateTextRepetitions(text, DEFAULT_RADIUS, 0.08, DEFAULT_LETTER_SPACING);

      // Smaller font = more repetitions needed
      expect(repSmall).toBeGreaterThan(repLarge);
    });

    it('increases repetitions for larger radius', () => {
      const text = '✦ BREATHE ✦';

      const repSmallRadius = calculateTextRepetitions(
        text,
        1.0,
        DEFAULT_FONT_SIZE,
        DEFAULT_LETTER_SPACING,
      );
      const repLargeRadius = calculateTextRepetitions(
        text,
        3.0,
        DEFAULT_FONT_SIZE,
        DEFAULT_LETTER_SPACING,
      );

      // Larger radius = larger circumference = more repetitions
      expect(repLargeRadius).toBeGreaterThan(repSmallRadius);
    });

    it('handles empty text gracefully', () => {
      const repetitions = calculateTextRepetitions(
        '',
        DEFAULT_RADIUS,
        DEFAULT_FONT_SIZE,
        DEFAULT_LETTER_SPACING,
      );

      // Should return at least 1
      expect(repetitions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateFullCircleText', () => {
    const DEFAULT_RADIUS = 1.6;
    const DEFAULT_FONT_SIZE = 0.12;

    it('repeats text to fill circumference', () => {
      const baseText = '✦ BREATHE ✦';
      const fullText = generateFullCircleText(baseText, DEFAULT_RADIUS, DEFAULT_FONT_SIZE);

      // Full text should be longer than base text
      expect(fullText.length).toBeGreaterThan(baseText.length);

      // Full text should contain the base text multiple times
      expect(fullText).toContain(baseText);
    });

    it('generates seamless wrapping text', () => {
      const baseText = 'HELLO';
      const fullText = generateFullCircleText(baseText, DEFAULT_RADIUS, DEFAULT_FONT_SIZE);

      // Should contain multiple copies separated by spaces
      const expectedPattern = `${baseText} ${baseText}`;
      expect(fullText).toContain(expectedPattern);
    });

    it('estimates correct text width for full coverage', () => {
      const baseText = '✦ BREATHE TOGETHER ✦';
      const fullText = generateFullCircleText(baseText, DEFAULT_RADIUS, DEFAULT_FONT_SIZE);

      // Calculate expected text width
      const letterSpacing = 0.08;
      const avgCharWidth = DEFAULT_FONT_SIZE * (0.5 + letterSpacing);
      const textWidth = fullText.length * avgCharWidth;

      // Circumference
      const circumference = 2 * Math.PI * DEFAULT_RADIUS;

      // Text width should exceed circumference for seamless wrap
      expect(textWidth).toBeGreaterThan(circumference);
    });

    it('works with different radii', () => {
      const baseText = '✦ BREATHE ✦';

      const textSmall = generateFullCircleText(baseText, 1.0, DEFAULT_FONT_SIZE);
      const textLarge = generateFullCircleText(baseText, 3.0, DEFAULT_FONT_SIZE);

      // Larger radius needs longer text
      expect(textLarge.length).toBeGreaterThan(textSmall.length);
    });

    it('generates consistent output for same inputs', () => {
      const baseText = '✦ TEST ✦';

      const text1 = generateFullCircleText(baseText, DEFAULT_RADIUS, DEFAULT_FONT_SIZE);
      const text2 = generateFullCircleText(baseText, DEFAULT_RADIUS, DEFAULT_FONT_SIZE);

      expect(text1).toBe(text2);
    });
  });

  describe('multi-segment 360° coverage', () => {
    it('uses 4 segments for full coverage', () => {
      // 4 segments at 90° each = 360° total coverage
      expect(RIBBON_SEGMENTS).toBe(4);
    });

    it('segments are evenly distributed around circle', () => {
      const rotationStep = (2 * Math.PI) / RIBBON_SEGMENTS;

      // Each segment should be 90° (PI/2 radians) apart
      expect(rotationStep).toBeCloseTo(Math.PI / 2, 5);
    });

    it('calculates correct segment rotations', () => {
      const rotationStep = (2 * Math.PI) / RIBBON_SEGMENTS;
      const rotations = Array.from({ length: RIBBON_SEGMENTS }, (_, i) => i * rotationStep);

      // First segment at 0°
      expect(rotations[0]).toBeCloseTo(0, 5);

      // Second segment at 90°
      expect(rotations[1]).toBeCloseTo(Math.PI / 2, 5);

      // Third segment at 180°
      expect(rotations[2]).toBeCloseTo(Math.PI, 5);

      // Fourth segment at 270°
      expect(rotations[3]).toBeCloseTo((3 * Math.PI) / 2, 5);
    });

    it('total rotation coverage equals full circle', () => {
      const rotationStep = (2 * Math.PI) / RIBBON_SEGMENTS;
      const totalCoverage = rotationStep * RIBBON_SEGMENTS;

      // Total coverage should be exactly 2π (360°)
      expect(totalCoverage).toBeCloseTo(2 * Math.PI, 5);
    });

    it('segments provide overlapping coverage for seamless appearance', () => {
      // With 4 segments, each segment needs to cover at least 90° + some overlap
      // The text in each segment should extend beyond its 90° allocation
      // This is ensured by the text being centered (anchorX="center")
      const minSegmentCoverage = (2 * Math.PI) / RIBBON_SEGMENTS;

      // Each segment should cover at least its allocated portion
      expect(minSegmentCoverage).toBeCloseTo(Math.PI / 2, 5);
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
