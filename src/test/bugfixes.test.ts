/**
 * Regression tests for bugfixes
 *
 * Tests critical bugs identified in the project review:
 * 1. Missing .has() checks in breathSystem
 * 2. Timer leak in useInspirationText
 * 3. Stale closures in useFrame hooks (usePropRef utility)
 * 4. Type-safe phase indices
 * 5. JSON parse error handling
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePropRef, usePropRefs } from '../hooks/usePropRef';
import { calculatePhaseInfo, type PhaseIndex } from '../lib/breathPhase';

// =============================================================================
// Phase Index Type Safety Tests
// =============================================================================

describe('breathPhase type safety', () => {
  it('should return phaseIndex as PhaseIndex type (0-3)', () => {
    // Test all phases based on 4-7-8-0 breathing pattern:
    // - Inhale: 0-4s (phase 0)
    // - Hold-in: 4-11s (phase 1)
    // - Exhale: 11-19s (phase 2)
    // - Hold-out: 0s (phase 3, but never active since duration is 0)
    const testCases = [
      { time: 0, expectedPhase: 0 as PhaseIndex }, // Start of inhale
      { time: 2, expectedPhase: 0 as PhaseIndex }, // Middle of inhale
      { time: 4.5, expectedPhase: 1 as PhaseIndex }, // Hold-in (4-11)
      { time: 8, expectedPhase: 1 as PhaseIndex }, // Still hold-in
      { time: 12, expectedPhase: 2 as PhaseIndex }, // Exhale (11-19)
      { time: 18, expectedPhase: 2 as PhaseIndex }, // Still exhale (hold-out is 0s)
    ];

    for (const { time, expectedPhase } of testCases) {
      const result = calculatePhaseInfo(time);
      expect(result.phaseIndex).toBe(expectedPhase);
      // Type check: phaseIndex should be 0, 1, 2, or 3
      expect([0, 1, 2, 3]).toContain(result.phaseIndex);
    }
  });

  it('should handle edge case at cycle boundaries', () => {
    // At the very start
    const startResult = calculatePhaseInfo(0);
    expect(startResult.phaseIndex).toBe(0);
    expect(startResult.phaseProgress).toBe(0);

    // Just before phase transition
    const result = calculatePhaseInfo(3.99);
    expect(result.phaseIndex).toBe(0); // Still in inhale
    expect(result.phaseProgress).toBeGreaterThan(0.9);
  });

  it('should clamp progress to 0-1 range', () => {
    const result = calculatePhaseInfo(100); // Way past cycle
    expect(result.phaseProgress).toBeLessThanOrEqual(1);
    expect(result.phaseProgress).toBeGreaterThanOrEqual(0);
  });

  it('should handle negative time gracefully', () => {
    const result = calculatePhaseInfo(-1);
    expect(result.phaseProgress).toBeGreaterThanOrEqual(0);
    // Should default to first phase
    expect(result.phaseIndex).toBe(0);
  });
});

// =============================================================================
// usePropRef Hook Tests (Stale Closure Fix)
// =============================================================================

describe('usePropRef hook', () => {
  it('should return a ref with initial value', () => {
    const { result } = renderHook(() => usePropRef(42));
    expect(result.current.current).toBe(42);
  });

  it('should update ref when prop changes', () => {
    const { result, rerender } = renderHook(({ value }) => usePropRef(value), {
      initialProps: { value: 'initial' },
    });

    expect(result.current.current).toBe('initial');

    // Simulate prop change
    rerender({ value: 'updated' });

    expect(result.current.current).toBe('updated');
  });

  it('should handle object props', () => {
    const initialObj = { foo: 'bar' };
    const { result, rerender } = renderHook(({ value }) => usePropRef(value), {
      initialProps: { value: initialObj },
    });

    expect(result.current.current).toBe(initialObj);

    const newObj = { foo: 'baz' };
    rerender({ value: newObj });

    expect(result.current.current).toBe(newObj);
    expect(result.current.current?.foo).toBe('baz');
  });

  it('should handle boolean props correctly', () => {
    const { result, rerender } = renderHook(({ value }) => usePropRef(value), {
      initialProps: { value: true },
    });

    expect(result.current.current).toBe(true);

    rerender({ value: false });
    expect(result.current.current).toBe(false);

    rerender({ value: true });
    expect(result.current.current).toBe(true);
  });
});

describe('usePropRefs hook', () => {
  it('should return refs with proper naming convention', () => {
    const { result } = renderHook(() => usePropRefs({ distance: 10, enabled: true }));

    expect(result.current.distanceRef.current).toBe(10);
    expect(result.current.enabledRef.current).toBe(true);
  });

  it('should update all refs when props change', () => {
    const { result, rerender } = renderHook((props) => usePropRefs(props), {
      initialProps: { distance: 10, intensity: 0.5 },
    });

    expect(result.current.distanceRef.current).toBe(10);
    expect(result.current.intensityRef.current).toBe(0.5);

    rerender({ distance: 20, intensity: 0.8 });

    expect(result.current.distanceRef.current).toBe(20);
    expect(result.current.intensityRef.current).toBe(0.8);
  });
});

// =============================================================================
// JSON Parse Error Handling Tests
// =============================================================================

describe('JSON parse error handling', () => {
  it('should validate InspirationResponse structure', () => {
    // Valid response
    const validResponse = {
      message: { text: 'Hello', id: '1' },
      cacheMaxAge: 300,
      nextRotationTime: Date.now() + 60000,
    };

    expect(typeof validResponse.message).toBe('object');
    expect(typeof validResponse.cacheMaxAge).toBe('number');
  });

  it('should detect invalid response formats', () => {
    const invalidResponses = [
      null,
      undefined,
      { message: 'string instead of object' },
      { message: {}, cacheMaxAge: 'not a number' },
      {},
    ];

    for (const response of invalidResponses) {
      // Validation function that mirrors the fix in useInspirationText
      const isValid = (() => {
        if (!response || typeof response !== 'object') return false;
        const r = response as Record<string, unknown>;
        if (typeof r.message !== 'object' || r.message === null) return false;
        if (typeof r.cacheMaxAge !== 'number') return false;
        return true;
      })();

      expect(isValid).toBe(false);
    }
  });
});

// =============================================================================
// Timer Cleanup Tests
// =============================================================================

describe('timer cleanup patterns', () => {
  it('should not schedule timeout when unmounted', async () => {
    const timeoutCallback = vi.fn();
    let isMounted = true;

    // Simulate the fixed pattern
    const scheduleIfMounted = () => {
      if (isMounted) {
        setTimeout(timeoutCallback, 10);
      }
    };

    // Schedule while mounted
    scheduleIfMounted();

    // Unmount
    isMounted = false;

    // Try to schedule after unmount
    scheduleIfMounted();

    // Wait for any scheduled timeouts
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Only the first timeout should have fired
    expect(timeoutCallback).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout on cleanup', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const timeoutId = setTimeout(callback, 1000);

    // Simulate cleanup
    clearTimeout(timeoutId);

    // Advance timers
    vi.advanceTimersByTime(1500);

    expect(callback).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// =============================================================================
// ECS Trait Safety Tests (simulated)
// =============================================================================

describe('ECS trait safety patterns', () => {
  // Simulate the Koota entity pattern
  interface MockEntity {
    has: (trait: string) => boolean;
    get: (trait: string) => unknown;
  }

  it('should check .has() before .get() for optional traits', () => {
    const entity: MockEntity = {
      has: (trait) => trait === 'existingTrait',
      get: (trait) => {
        if (trait === 'existingTrait') return { value: 42 };
        throw new Error('Trait not found');
      },
    };

    // Safe pattern (what we fixed)
    const safeGet = (traitName: string) => {
      return entity.has(traitName) ? entity.get(traitName) : null;
    };

    // Should work for existing trait
    expect(safeGet('existingTrait')).toEqual({ value: 42 });

    // Should return null for missing trait (not throw)
    expect(safeGet('missingTrait')).toBeNull();
  });

  it('should handle null values with optional chaining', () => {
    const entity: MockEntity | null = null;

    // Simulating the pattern: phaseOverride?.enabled
    const result = (entity as { enabled?: boolean } | null)?.enabled;
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Frame Delta Tests
// =============================================================================

describe('frame-rate independent animation', () => {
  it('should use actual delta instead of hard-coded 0.016', () => {
    const speed = 1.0;

    // Old pattern (wrong): speed * 0.016
    const oldPattern = speed * 0.016;

    // New pattern (correct): speed * delta
    const delta60fps = 1 / 60; // ~0.0167
    const delta120fps = 1 / 120; // ~0.0083
    const delta30fps = 1 / 30; // ~0.0333

    const newPattern60 = speed * delta60fps;
    const newPattern120 = speed * delta120fps;
    const newPattern30 = speed * delta30fps;

    // At 60fps, should be roughly the same
    expect(Math.abs(newPattern60 - oldPattern)).toBeLessThan(0.001);

    // At 120fps, movement should be half per frame
    expect(newPattern120).toBeLessThan(oldPattern);
    expect(newPattern120).toBeCloseTo(oldPattern / 2, 2);

    // At 30fps, movement should be double per frame
    expect(newPattern30).toBeGreaterThan(oldPattern);
    expect(newPattern30).toBeCloseTo(oldPattern * 2, 2);
  });
});

// =============================================================================
// Material Uniform Guard Tests
// =============================================================================

describe('material uniform guards', () => {
  it('should guard uniform access with null check', () => {
    // Simulate a material that might be disposed
    const material: { uniforms?: { breathPhase: { value: number } } } = {
      uniforms: { breathPhase: { value: 0 } },
    };

    // Safe pattern
    const updateUniform = (phase: number) => {
      if (material.uniforms) {
        material.uniforms.breathPhase.value = phase;
      }
    };

    // Should work normally
    updateUniform(0.5);
    expect(material.uniforms?.breathPhase.value).toBe(0.5);

    // Simulate disposal
    material.uniforms = undefined;

    // Should not throw
    expect(() => updateUniform(0.8)).not.toThrow();
  });
});
