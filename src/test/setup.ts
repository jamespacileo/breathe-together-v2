/**
 * Vitest test setup
 *
 * Configures:
 * - MSW server for API mocking
 * - WebGL mocks for Three.js rendering tests
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/server';

// ============================================
// MSW Server Setup
// ============================================

// Start MSW server before tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// ============================================
// WebGL / Canvas Mocks for Three.js
// ============================================

// Create a mock WebGL context (stub implementation)
// For full WebGL tests, consider using @vitest/browser or happy-dom with WebGL support
function createMockWebGLContext() {
  return {
    canvas: { width: 800, height: 600 },
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,
    getExtension: () => null,
    getParameter: () => 0,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    useProgram: () => {},
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    uniformMatrix4fv: () => {},
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
    depthFunc: () => {},
    clearColor: () => {},
    clear: () => {},
    viewport: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
    deleteBuffer: () => {},
    deleteTexture: () => {},
    createFramebuffer: () => ({}),
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 36053, // FRAMEBUFFER_COMPLETE
    createRenderbuffer: () => ({}),
    bindRenderbuffer: () => {},
    renderbufferStorage: () => {},
    framebufferRenderbuffer: () => {},
    pixelStorei: () => {},
    activeTexture: () => {},
    generateMipmap: () => {},
    isContextLost: () => false,
  };
}

// Create a mock canvas for headless testing
function createHeadlessCanvas(width = 800, height = 600) {
  const glContext = createMockWebGLContext();

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
