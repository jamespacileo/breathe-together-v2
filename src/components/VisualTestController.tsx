/**
 * VisualTestController - Bridge for E2E visual regression testing.
 *
 * When the app is loaded with ?visualTest=true, this component:
 * 1. Exposes window.advanceFrame(delta) for manual frame advancement
 * 2. Exposes window.advanceTo(time) for jumping to specific timestamps
 * 3. Provides stable rendering for screenshots and pixel sampling
 *
 * Usage in E2E tests:
 * ```ts
 * await page.goto('/?visualTest=true');
 * await page.waitForFunction(() => window.visualTestReady);
 * await page.evaluate(() => window.advanceFrame(2.0)); // Returns Promise
 * ```
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

// Extend window for test methods
declare global {
  interface Window {
    /** Advance simulation by delta seconds, returns Promise that resolves after render */
    advanceFrame?: (delta: number) => Promise<void>;
    /** Set absolute simulation time, returns Promise that resolves after render */
    advanceTo?: (time: number) => Promise<void>;
    /** Signal that visual test mode is ready */
    visualTestReady?: boolean;
    /** Current simulation time */
    visualTestTime?: number;
  }
}

/**
 * Controller component for deterministic visual testing.
 * Must be rendered inside R3F Canvas.
 */
export function VisualTestController() {
  const { gl, clock, advance } = useThree();
  const simulationTimeRef = useRef(0);
  const renderResolveRef = useRef<(() => void) | null>(null);

  // Pause the internal clock on mount
  useEffect(() => {
    clock.stop();
    simulationTimeRef.current = 0;
    window.visualTestTime = 0;

    // Expose async control methods to window
    window.advanceFrame = (delta: number): Promise<void> => {
      return new Promise((resolve) => {
        simulationTimeRef.current += delta;
        window.visualTestTime = simulationTimeRef.current;
        clock.elapsedTime = simulationTimeRef.current;

        // Store resolve for after render
        renderResolveRef.current = resolve;

        // Use advance() which forces a synchronous render in demand mode
        advance(delta);
      });
    };

    window.advanceTo = (time: number): Promise<void> => {
      const delta = time - simulationTimeRef.current;
      if (delta <= 0) return Promise.resolve();
      const adv = window.advanceFrame;
      if (!adv) {
        return Promise.reject(new Error('window.advanceFrame is not available'));
      }
      return adv(delta);
    };

    window.visualTestReady = true;
    console.log(
      '[VisualTestController] Ready - use window.advanceFrame(delta) for deterministic rendering',
    );

    return () => {
      window.advanceFrame = undefined;
      window.advanceTo = undefined;
      window.visualTestReady = undefined;
      window.visualTestTime = undefined;
    };
  }, [clock, advance]);

  // Signal render completion
  useFrame(() => {
    if (renderResolveRef.current) {
      const resolve = renderResolveRef.current;
      renderResolveRef.current = null;
      // Use requestAnimationFrame to ensure GL commands are flushed
      requestAnimationFrame(() => {
        gl.domElement.getContext('webgl2')?.flush();
        resolve();
      });
    }
  }, 1000); // Run after other useFrame hooks

  return null;
}

/**
 * Check if visual test mode is enabled via URL parameter.
 */
export function isVisualTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('visualTest') === 'true';
}
