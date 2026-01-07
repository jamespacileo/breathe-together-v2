import { calculateMomentumDelta, calculateTargetZoom, isUiEventTarget } from './sceneInput';

describe('sceneInput helpers', () => {
  describe('calculateMomentumDelta', () => {
    it('returns zero deltas when velocity is below threshold', () => {
      const result = calculateMomentumDelta({
        velocity: [0.01, 0], // 10 px/s
        size: { width: 1000, height: 1000 },
        speed: 1,
        momentum: 1,
        velocityMultiplier: 1,
        timeConstant: 1,
        minVelocityThreshold: 50,
        maxMomentum: Math.PI * 2,
      });

      expect(result.hasMomentumX).toBe(false);
      expect(result.deltaX).toBe(0);
      expect(result.deltaY).toBe(0);
    });

    it('produces momentum deltas when velocity exceeds threshold', () => {
      const result = calculateMomentumDelta({
        velocity: [0.2, 0.15], // 200 px/s, 150 px/s
        size: { width: 1000, height: 800 },
        speed: 1,
        momentum: 1,
        velocityMultiplier: 1,
        timeConstant: 0.325,
        minVelocityThreshold: 50,
        maxMomentum: Math.PI * 2,
      });

      expect(result.hasMomentumX).toBe(true);
      expect(result.hasMomentumY).toBe(true);
      expect(Math.abs(result.deltaX)).toBeGreaterThan(0);
      expect(Math.abs(result.deltaY)).toBeGreaterThan(0);
    });

    it('clamps momentum deltas to maxMomentum', () => {
      const result = calculateMomentumDelta({
        velocity: [1000, 0], // 1,000,000 px/s
        size: { width: 1000, height: 1000 },
        speed: 1,
        momentum: 1,
        velocityMultiplier: 1,
        timeConstant: 1,
        minVelocityThreshold: 50,
        maxMomentum: Math.PI * 2,
      });

      expect(result.hasMomentumX).toBe(true);
      expect(result.deltaX).toBeCloseTo(Math.PI * 2, 4);
    });
  });

  describe('isUiEventTarget', () => {
    it('detects data-ui elements', () => {
      const root = document.createElement('div');
      root.setAttribute('data-ui', 'test');
      const child = document.createElement('button');
      root.appendChild(child);
      document.body.appendChild(root);

      expect(isUiEventTarget(child)).toBe(true);

      document.body.removeChild(root);
    });

    it('detects Leva-styled elements by class prefix', () => {
      const root = document.createElement('div');
      root.className = 'leva-test-class';
      const child = document.createElement('span');
      root.appendChild(child);
      document.body.appendChild(root);

      expect(isUiEventTarget(child)).toBe(true);

      document.body.removeChild(root);
    });

    it('returns false for non-ui elements', () => {
      const node = document.createElement('div');
      document.body.appendChild(node);

      expect(isUiEventTarget(node)).toBe(false);

      document.body.removeChild(node);
    });
  });
});

/**
 * Zoom calculation constants (mirroring MomentumControls defaults)
 */
const ZOOM_DEFAULTS = {
  min: 0.5,
  max: 2.0,
  speed: 0.001,
  damping: 0.15,
};

describe('Scroll Zoom Calculation', () => {
  describe('Basic zoom behavior', () => {
    it('should zoom in when scrolling up (negative delta)', () => {
      const currentZoom = 1.0;
      const scrollUpDelta = -100; // Scroll up = negative delta

      const newZoom = calculateTargetZoom(currentZoom, scrollUpDelta, ZOOM_DEFAULTS);

      // Scroll up should increase zoom (zoom in)
      expect(newZoom).toBeGreaterThan(currentZoom);
      expect(newZoom).toBeCloseTo(1.1, 2); // -(-100) * 0.001 = 0.1 increase
    });

    it('should zoom out when scrolling down (positive delta)', () => {
      const currentZoom = 1.0;
      const scrollDownDelta = 100; // Scroll down = positive delta

      const newZoom = calculateTargetZoom(currentZoom, scrollDownDelta, ZOOM_DEFAULTS);

      // Scroll down should decrease zoom (zoom out)
      expect(newZoom).toBeLessThan(currentZoom);
      expect(newZoom).toBeCloseTo(0.9, 2); // -(100) * 0.001 = -0.1 decrease
    });

    it('should maintain zoom level with no scroll (delta = 0)', () => {
      const currentZoom = 1.5;
      const noDelta = 0;

      const newZoom = calculateTargetZoom(currentZoom, noDelta, ZOOM_DEFAULTS);

      expect(newZoom).toBe(currentZoom);
    });
  });

  describe('Min/max zoom boundaries', () => {
    it('should clamp to minimum zoom when zooming out beyond limit', () => {
      const currentZoom = 0.6; // Close to min (0.5)
      const largeScrollDown = 500; // Large scroll down to exceed min

      const newZoom = calculateTargetZoom(currentZoom, largeScrollDown, ZOOM_DEFAULTS);

      expect(newZoom).toBe(ZOOM_DEFAULTS.min);
      expect(newZoom).toBe(0.5);
    });

    it('should clamp to maximum zoom when zooming in beyond limit', () => {
      const currentZoom = 1.9; // Close to max (2.0)
      const largeScrollUp = -500; // Large scroll up to exceed max

      const newZoom = calculateTargetZoom(currentZoom, largeScrollUp, ZOOM_DEFAULTS);

      expect(newZoom).toBe(ZOOM_DEFAULTS.max);
      expect(newZoom).toBe(2.0);
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

      // Faster zoom should change more for same delta
      expect(fasterZoom - currentZoom).toBeCloseTo(5 * (defaultZoom - currentZoom), 10);
    });
  });
});
