/**
 * WebGL Mock with Spy Functions
 *
 * Creates a mock WebGL2RenderingContext that tracks:
 * - Draw calls (drawArrays, drawElements, drawArraysInstanced, drawElementsInstanced)
 * - Shader programs (createProgram)
 * - Geometries (createBuffer)
 * - Textures (createTexture)
 *
 * This approach works reliably in Node.js without native dependencies.
 */

import { vi } from 'vitest';

export interface WebGLStats {
  drawCalls: number;
  triangles: number;
  programs: number;
  buffers: number;
  textures: number;
  instancedDrawCalls: number;
}

export interface MockWebGLContext extends WebGL2RenderingContext {
  __stats: WebGLStats;
  __resetStats: () => void;
}

/**
 * Creates a mock WebGL2RenderingContext with spy functions
 */
export function createMockWebGLContext(): MockWebGLContext {
  const stats: WebGLStats = {
    drawCalls: 0,
    triangles: 0,
    programs: 0,
    buffers: 0,
    textures: 0,
    instancedDrawCalls: 0,
  };

  // Create base mock with all required WebGL2 properties
  const mockGL: Partial<WebGL2RenderingContext> = {
    // Canvas reference
    canvas: {
      width: 800,
      height: 600,
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement,

    // Drawing buffer dimensions
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,

    // Constants (subset of most used)
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    TRIANGLES: 4,
    LINES: 1,
    POINTS: 0,
    FRAGMENT_SHADER: 35632,
    VERTEX_SHADER: 35633,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    TEXTURE_2D: 3553,
    TEXTURE_CUBE_MAP: 34067,
    RGBA: 6408,
    RGB: 6407,
    UNSIGNED_BYTE: 5121,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    LINEAR: 9729,
    NEAREST: 9728,
    CLAMP_TO_EDGE: 33071,
    REPEAT: 10497,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    STENCIL_BUFFER_BIT: 1024,
    BLEND: 3042,
    DEPTH_TEST: 2929,
    CULL_FACE: 2884,
    FRAMEBUFFER: 36160,
    RENDERBUFFER: 36161,
    COLOR_ATTACHMENT0: 36064,
    DEPTH_ATTACHMENT: 36096,
    FRAMEBUFFER_COMPLETE: 36053,
    MAX_TEXTURE_IMAGE_UNITS: 34930,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
    MAX_TEXTURE_SIZE: 3379,
    MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
    MAX_VERTEX_ATTRIBS: 34921,
    MAX_VARYING_VECTORS: 36348,
    MAX_VERTEX_UNIFORM_VECTORS: 36347,
    MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
    UNPACK_FLIP_Y_WEBGL: 37440,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,

    // WebGL2 specific
    UNIFORM_BUFFER: 35345,
    TRANSFORM_FEEDBACK_BUFFER: 35982,
    READ_FRAMEBUFFER: 36008,
    DRAW_FRAMEBUFFER: 36009,

    // Draw calls - these are the key ones we track!
    drawArrays: vi.fn((mode: number, _first: number, count: number) => {
      stats.drawCalls++;
      if (mode === 4) {
        // TRIANGLES
        stats.triangles += count / 3;
      }
    }),

    drawElements: vi.fn((mode: number, count: number) => {
      stats.drawCalls++;
      if (mode === 4) {
        // TRIANGLES
        stats.triangles += count / 3;
      }
    }),

    drawArraysInstanced: vi.fn(
      (mode: number, _first: number, count: number, instanceCount: number) => {
        stats.drawCalls++;
        stats.instancedDrawCalls++;
        if (mode === 4) {
          stats.triangles += (count / 3) * instanceCount;
        }
      },
    ),

    drawElementsInstanced: vi.fn(
      (mode: number, count: number, _type: number, _offset: number, instanceCount: number) => {
        stats.drawCalls++;
        stats.instancedDrawCalls++;
        if (mode === 4) {
          stats.triangles += (count / 3) * instanceCount;
        }
      },
    ),

    // Resource creation
    createProgram: vi.fn(() => {
      stats.programs++;
      return { __id: stats.programs };
    }),

    createBuffer: vi.fn(() => {
      stats.buffers++;
      return { __id: stats.buffers };
    }),

    createTexture: vi.fn(() => {
      stats.textures++;
      return { __id: stats.textures };
    }),

    createShader: vi.fn((type: number) => ({ __type: type })),
    createFramebuffer: vi.fn(() => ({})),
    createRenderbuffer: vi.fn(() => ({})),
    createVertexArray: vi.fn(() => ({})),

    // Shader operations
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    getShaderPrecisionFormat: vi.fn(() => ({
      precision: 23,
      rangeMin: 127,
      rangeMax: 127,
    })),
    getActiveAttrib: vi.fn(() => null),
    getActiveUniform: vi.fn(() => null),
    validateProgram: vi.fn(),

    // Uniform operations
    getUniformLocation: vi.fn(() => ({ __uniform: true })),
    getAttribLocation: vi.fn(() => 0),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1fv: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    // Buffer operations
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),

    // Vertex array operations
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),

    // Texture operations
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    texParameteri: vi.fn(),
    texParameterf: vi.fn(),
    generateMipmap: vi.fn(),
    deleteTexture: vi.fn(),
    pixelStorei: vi.fn(),

    // Framebuffer operations
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    framebufferRenderbuffer: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    deleteFramebuffer: vi.fn(),

    // Renderbuffer operations
    bindRenderbuffer: vi.fn(),
    renderbufferStorage: vi.fn(),
    deleteRenderbuffer: vi.fn(),

    // State operations
    viewport: vi.fn(),
    scissor: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    blendFuncSeparate: vi.fn(),
    blendEquation: vi.fn(),
    blendEquationSeparate: vi.fn(),
    depthFunc: vi.fn(),
    depthMask: vi.fn(),
    depthRange: vi.fn(),
    cullFace: vi.fn(),
    frontFace: vi.fn(),
    colorMask: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    clearDepth: vi.fn(),
    clearStencil: vi.fn(),

    // Query operations
    getParameter: vi.fn((param: number) => {
      // Return reasonable defaults for common queries
      const params: Record<number, number | string | null> = {
        34930: 16, // MAX_TEXTURE_IMAGE_UNITS
        35660: 16, // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        35661: 32, // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        3379: 4096, // MAX_TEXTURE_SIZE
        34076: 4096, // MAX_CUBE_MAP_TEXTURE_SIZE
        34921: 16, // MAX_VERTEX_ATTRIBS
        36348: 16, // MAX_VARYING_VECTORS
        36347: 256, // MAX_VERTEX_UNIFORM_VECTORS
        36349: 256, // MAX_FRAGMENT_UNIFORM_VECTORS
        7936: 'Mock WebGL', // VENDOR
        7937: 'Mock WebGL Renderer', // RENDERER
        7938: 'WebGL 2.0 (Mock)', // VERSION
        35724: 'WebGL GLSL ES 3.00 (Mock)', // SHADING_LANGUAGE_VERSION
      };
      return params[param] ?? null;
    }),

    // biome-ignore lint/suspicious/noExplicitAny: WebGL extension types are complex and vary by extension name
    getExtension: vi.fn((name: string): any => {
      // Return mock extensions for common ones
      if (name === 'WEBGL_debug_renderer_info') {
        return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
      }
      if (name === 'EXT_texture_filter_anisotropic') {
        return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047 };
      }
      return null;
    }),

    getSupportedExtensions: vi.fn(() => [
      'WEBGL_debug_renderer_info',
      'EXT_texture_filter_anisotropic',
      'OES_texture_float',
      'OES_texture_half_float',
    ]),

    isContextLost: vi.fn(() => false),
    getContextAttributes: vi.fn(
      (): WebGLContextAttributes => ({
        alpha: true,
        antialias: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default' as const,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false,
      }),
    ),

    // Error handling
    getError: vi.fn(() => 0),

    // Misc
    flush: vi.fn(),
    finish: vi.fn(),
    readPixels: vi.fn(),
  };

  // Add stats access and reset function
  const contextWithStats = mockGL as MockWebGLContext;
  contextWithStats.__stats = stats;
  contextWithStats.__resetStats = () => {
    stats.drawCalls = 0;
    stats.triangles = 0;
    stats.programs = 0;
    stats.buffers = 0;
    stats.textures = 0;
    stats.instancedDrawCalls = 0;
  };

  return contextWithStats;
}

/**
 * Creates a mock canvas element that returns our mock WebGL context
 */
export function createMockCanvas(mockGL: MockWebGLContext): HTMLCanvasElement {
  const canvas = {
    width: 800,
    height: 600,
    style: {} as CSSStyleDeclaration,
    clientWidth: 800,
    clientHeight: 600,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
    getContext: vi.fn((contextType: string) => {
      if (
        contextType === 'webgl2' ||
        contextType === 'webgl' ||
        contextType === 'experimental-webgl'
      ) {
        return mockGL;
      }
      return null;
    }),
    // Required by Three.js
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    transferControlToOffscreen: vi.fn(),
  };

  return canvas as unknown as HTMLCanvasElement;
}
