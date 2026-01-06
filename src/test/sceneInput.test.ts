import { describe, expect, it } from 'vitest';
import { calculateMomentumDelta, isUiEventTarget } from '../lib/sceneInput';

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
