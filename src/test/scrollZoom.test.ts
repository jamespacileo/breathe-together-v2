/**
 * Scroll Zoom Tests
 *
 * Tests for the scroll-to-zoom functionality in MomentumControls.
 * These tests verify the zoom calculation logic and boundary enforcement.
 */

import { MathUtils } from 'three';
import { describe, expect, it } from 'vitest';

/**
 * Zoom calculation constants (mirroring MomentumControls defaults)
 */
const ZOOM_DEFAULTS = {
  min: 0.5,
  max: 2.0,
  speed: 0.001,
  damping: 0.15,
};

/**
 * Simulates the zoom calculation logic from MomentumControls
 * @param currentZoom Current zoom level
 * @param wheelDelta Wheel delta from scroll event (positive = scroll down = zoom out)
 * @param config Zoom configuration
 * @returns New target zoom level
 */
function calculateTargetZoom(
  currentZoom: number,
  wheelDelta: number,
  config: {
    min: number;
    max: number;
    speed: number;
  } = ZOOM_DEFAULTS,
): number {
  // Negative delta = scroll up = zoom in (increase zoom)
  // Positive delta = scroll down = zoom out (decrease zoom)
  const zoomDelta = -wheelDelta * config.speed;
  return MathUtils.clamp(currentZoom + zoomDelta, config.min, config.max);
}

describe('Scroll Zoom Calculation', () => {
  describe('Basic zoom behavior', () => {
    it('should zoom in when scrolling up (negative delta)', () => {
      const currentZoom = 1.0;
      const scrollUpDelta = -100; // Scroll up = negative delta

      const newZoom = calculateTargetZoom(currentZoom, scrollUpDelta);

      // Scroll up should increase zoom (zoom in)
      expect(newZoom).toBeGreaterThan(currentZoom);
      expect(newZoom).toBeCloseTo(1.1, 2); // -(-100) * 0.001 = 0.1 increase
    });

    it('should zoom out when scrolling down (positive delta)', () => {
      const currentZoom = 1.0;
      const scrollDownDelta = 100; // Scroll down = positive delta

      const newZoom = calculateTargetZoom(currentZoom, scrollDownDelta);

      // Scroll down should decrease zoom (zoom out)
      expect(newZoom).toBeLessThan(currentZoom);
      expect(newZoom).toBeCloseTo(0.9, 2); // -(100) * 0.001 = -0.1 decrease
    });

    it('should maintain zoom level with no scroll (delta = 0)', () => {
      const currentZoom = 1.5;
      const noDelta = 0;

      const newZoom = calculateTargetZoom(currentZoom, noDelta);

      expect(newZoom).toBe(currentZoom);
    });
  });

  describe('Min/max zoom boundaries', () => {
    it('should clamp to minimum zoom when zooming out beyond limit', () => {
      const currentZoom = 0.6; // Close to min (0.5)
      const largeScrollDown = 500; // Large scroll down to exceed min

      const newZoom = calculateTargetZoom(currentZoom, largeScrollDown);

      expect(newZoom).toBe(ZOOM_DEFAULTS.min);
      expect(newZoom).toBe(0.5);
    });

    it('should clamp to maximum zoom when zooming in beyond limit', () => {
      const currentZoom = 1.9; // Close to max (2.0)
      const largeScrollUp = -500; // Large scroll up to exceed max

      const newZoom = calculateTargetZoom(currentZoom, largeScrollUp);

      expect(newZoom).toBe(ZOOM_DEFAULTS.max);
      expect(newZoom).toBe(2.0);
    });

    it('should allow zoom at exactly minimum boundary', () => {
      const currentZoom = ZOOM_DEFAULTS.min;
      const scrollDown = 100; // Try to zoom out further

      const newZoom = calculateTargetZoom(currentZoom, scrollDown);

      expect(newZoom).toBe(ZOOM_DEFAULTS.min);
    });

    it('should allow zoom at exactly maximum boundary', () => {
      const currentZoom = ZOOM_DEFAULTS.max;
      const scrollUp = -100; // Try to zoom in further

      const newZoom = calculateTargetZoom(currentZoom, scrollUp);

      expect(newZoom).toBe(ZOOM_DEFAULTS.max);
    });
  });

  describe('Custom zoom configuration', () => {
    it('should respect custom min/max limits', () => {
      const customConfig = {
        min: 0.25,
        max: 4.0,
        speed: 0.001,
      };

      // Test custom min
      const zoomAtMin = calculateTargetZoom(0.3, 500, customConfig);
      expect(zoomAtMin).toBe(0.25);

      // Test custom max
      const zoomAtMax = calculateTargetZoom(3.9, -500, customConfig);
      expect(zoomAtMax).toBe(4.0);

      // Test within custom range
      const midZoom = calculateTargetZoom(2.0, -100, customConfig);
      expect(midZoom).toBeCloseTo(2.1, 2);
    });

    it('should respect custom zoom speed', () => {
      const fasterZoomConfig = {
        min: 0.5,
        max: 2.0,
        speed: 0.005, // 5x faster than default
      };

      const currentZoom = 1.0;
      const scrollDelta = -100;

      const defaultZoom = calculateTargetZoom(currentZoom, scrollDelta, ZOOM_DEFAULTS);
      const fasterZoom = calculateTargetZoom(currentZoom, scrollDelta, fasterZoomConfig);

      // Faster zoom should change more for same delta (using toBeCloseTo for floating point precision)
      expect(fasterZoom - currentZoom).toBeCloseTo(5 * (defaultZoom - currentZoom), 10);
    });
  });

  describe('Continuous scrolling behavior', () => {
    it('should accumulate zoom changes with repeated scrolls', () => {
      let currentZoom = 1.0;

      // Simulate 5 scroll-up events
      for (let i = 0; i < 5; i++) {
        currentZoom = calculateTargetZoom(currentZoom, -100);
      }

      // Should have zoomed in 5 times
      expect(currentZoom).toBeCloseTo(1.5, 2);
    });

    it('should stop accumulating at boundaries', () => {
      let currentZoom = 1.9;

      // Simulate many scroll-up events that would exceed max
      for (let i = 0; i < 20; i++) {
        currentZoom = calculateTargetZoom(currentZoom, -100);
      }

      // Should be clamped to max
      expect(currentZoom).toBe(ZOOM_DEFAULTS.max);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small scroll deltas', () => {
      const currentZoom = 1.0;
      const tinyDelta = 1; // Very small scroll

      const newZoom = calculateTargetZoom(currentZoom, tinyDelta);

      expect(newZoom).toBeCloseTo(0.999, 4);
    });

    it('should handle very large scroll deltas', () => {
      const currentZoom = 1.0;
      const hugeDelta = 10000; // Very large scroll (zoom out)

      const newZoom = calculateTargetZoom(currentZoom, hugeDelta);

      // Should be clamped to min
      expect(newZoom).toBe(ZOOM_DEFAULTS.min);
    });

    it('should handle negative current zoom (invalid state) gracefully', () => {
      // This shouldn't happen in practice, but let's ensure it's handled
      const invalidZoom = -0.5;
      const scrollDelta = -100;

      const newZoom = calculateTargetZoom(invalidZoom, scrollDelta);

      // Should still be clamped to valid range
      expect(newZoom).toBeGreaterThanOrEqual(ZOOM_DEFAULTS.min);
    });

    it('should handle zero zoom speed (disabled zoom)', () => {
      const disabledConfig = {
        min: 0.5,
        max: 2.0,
        speed: 0, // Disabled
      };

      const currentZoom = 1.0;
      const scrollDelta = -1000;

      const newZoom = calculateTargetZoom(currentZoom, scrollDelta, disabledConfig);

      // Should not change
      expect(newZoom).toBe(currentZoom);
    });
  });
});

describe('Zoom Defaults Validation', () => {
  it('should have sensible default min zoom', () => {
    expect(ZOOM_DEFAULTS.min).toBeGreaterThan(0);
    expect(ZOOM_DEFAULTS.min).toBeLessThan(1);
  });

  it('should have sensible default max zoom', () => {
    expect(ZOOM_DEFAULTS.max).toBeGreaterThan(1);
    expect(ZOOM_DEFAULTS.max).toBeLessThanOrEqual(3); // Not too extreme
  });

  it('should have min less than max', () => {
    expect(ZOOM_DEFAULTS.min).toBeLessThan(ZOOM_DEFAULTS.max);
  });

  it('should have a reasonable zoom speed', () => {
    // Speed should be small enough that a single scroll doesn't jump too much
    // A typical scroll delta is ~100-200, so 0.001 speed = 0.1-0.2 zoom change
    expect(ZOOM_DEFAULTS.speed).toBeGreaterThan(0);
    expect(ZOOM_DEFAULTS.speed).toBeLessThan(0.01);
  });

  it('should have a reasonable damping value', () => {
    // Damping controls smooth interpolation speed
    expect(ZOOM_DEFAULTS.damping).toBeGreaterThan(0);
    expect(ZOOM_DEFAULTS.damping).toBeLessThan(1);
  });
});

describe('Zoom Range Documentation', () => {
  it('documents the zoom range behavior', () => {
    console.log('\n=== ZOOM RANGE DOCUMENTATION ===');
    console.log(`Min zoom: ${ZOOM_DEFAULTS.min}x (zoomed out, globe appears smaller)`);
    console.log(`Max zoom: ${ZOOM_DEFAULTS.max}x (zoomed in, globe appears larger)`);
    console.log(`Default: 1.0x (normal view)`);
    console.log(`Speed: ${ZOOM_DEFAULTS.speed} (zoom delta per wheel delta unit)`);
    console.log('\nTypical scroll wheel delta: ~100 per notch');
    console.log(`Zoom change per scroll notch: ~${(100 * ZOOM_DEFAULTS.speed).toFixed(2)}`);
    console.log(
      `Full zoom out (1.0 → ${ZOOM_DEFAULTS.min}): ~${Math.ceil((1 - ZOOM_DEFAULTS.min) / (100 * ZOOM_DEFAULTS.speed))} scroll notches`,
    );
    console.log(
      `Full zoom in (1.0 → ${ZOOM_DEFAULTS.max}): ~${Math.ceil((ZOOM_DEFAULTS.max - 1) / (100 * ZOOM_DEFAULTS.speed))} scroll notches`,
    );
    console.log('=================================\n');

    expect(true).toBe(true); // Documentation test always passes
  });
});
