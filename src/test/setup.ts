/**
 * Vitest setup file for headless WebGL testing
 *
 * Creates a mock canvas and WebGL context for Three.js rendering tests
 */

import createGL from 'gl';

// Create a headless WebGL context factory
function createHeadlessCanvas(width = 800, height = 600) {
  const glContext = createGL(width, height, {
    preserveDrawingBuffer: true,
  });

  // Create a mock canvas object that Three.js expects
  const canvas = {
    width,
    height,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: (contextType: string) => {
      if (
        contextType === 'webgl' ||
        contextType === 'webgl2' ||
        contextType === 'experimental-webgl'
      ) {
        return glContext;
      }
      return null;
    },
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
    }),
    clientWidth: width,
    clientHeight: height,
  };

  return { canvas, glContext };
}

// Export for use in tests
export { createHeadlessCanvas };

// Mock window/document for Three.js
if (typeof globalThis.window === 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any for window/document
  (globalThis as any).window = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

if (typeof globalThis.document === 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any for window/document
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return createHeadlessCanvas().canvas;
      }
      return {};
    },
    createElementNS: () => ({}),
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  };
}
