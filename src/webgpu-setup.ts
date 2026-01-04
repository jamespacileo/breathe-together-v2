/**
 * WebGPU Setup for React Three Fiber
 *
 * This module sets up WebGPU/TSL support for the application.
 * It extends R3F with the WebGPU version of Three.js classes and provides
 * the renderer factory function for the Canvas gl prop.
 *
 * TSL (Three.js Shading Language) is a node-based shader system that:
 * - Generates both WGSL (WebGPU) and GLSL (WebGL fallback) automatically
 * - Provides type-safe shader composition
 * - Enables GPU compute shaders on WebGPU
 *
 * @see https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
 * @see https://blog.pragmattic.dev/react-three-fiber-webgpu-typescript
 */

import { extend, type ThreeToJSXElements } from '@react-three/fiber';
import * as THREE from 'three/webgpu';

// Extend React Three Fiber with WebGPU Three.js classes
// This makes node materials like <meshBasicNodeMaterial /> available as JSX elements
// We need to cast to any because the module exports both constructors and utilities
extend(THREE as unknown as Record<string, new (...args: unknown[]) => unknown>);

// Re-export Three.js WebGPU module for use throughout the app
export { THREE };

// Re-export TSL for shader authoring
export * as TSL from 'three/tsl';

// Export individual TSL functions for convenience
export {
  // Math operations
  abs,
  acos,
  add,
  and,
  asin,
  atan,
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  ceil,
  clamp,
  // Colors
  color,
  // Logic
  cond,
  cos,
  cross,
  cubeTexture,
  distance,
  div,
  // Vector operations
  dot,
  equal,
  exp,
  // Node types
  Fn,
  faceforward,
  // Vector constructors
  float,
  // Floor/ceiling
  floor,
  fract,
  // Comparison
  greaterThan,
  // Noise
  hash,
  inverseSqrt,
  length,
  lessThan,
  log,
  mat2,
  mat3,
  mat4,
  max,
  min,
  mix,
  mod,
  mul,
  normalize,
  normalLocal,
  normalView,
  normalWorld,
  not,
  or,
  // Built-in inputs
  positionLocal,
  positionView,
  positionWorld,
  // Power and exponential
  pow,
  reflect,
  refract,
  round,
  sign,
  // Trigonometry
  sin,
  smoothstep,
  sqrt,
  step,
  sub,
  tan,
  // Textures
  texture,
  time as timerLocal,
  // Transformed values
  transformedNormalView,
  transformedNormalWorld,
  uniform,
  uv,
  varying,
  varyingProperty,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

/**
 * WebGPURenderer configuration options
 */
export interface WebGPURendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'high-performance' | 'low-power';
  /** Force WebGL fallback even if WebGPU is available */
  forceWebGL?: boolean;
}

/**
 * Check if WebGPU is available in the current browser
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Creates a WebGPU renderer for use with React Three Fiber's Canvas gl prop.
 * Falls back to WebGL if WebGPU is not available.
 *
 * @example
 * ```tsx
 * import { Canvas } from '@react-three/fiber';
 * import { createWebGPURenderer } from './webgpu-setup';
 *
 * <Canvas gl={createWebGPURenderer({ antialias: true })}>
 *   <mesh>
 *     <boxGeometry />
 *     <meshBasicNodeMaterial color="orange" />
 *   </mesh>
 * </Canvas>
 * ```
 */
export function createWebGPURenderer(options: WebGPURendererOptions = {}) {
  // biome-ignore lint/suspicious/noExplicitAny: R3F's gl prop accepts async factory functions with flexible return types - DefaultGLProps has canvas: HTMLCanvasElement | OffscreenCanvas
  return async (props: any) => {
    const canvas = props.canvas as HTMLCanvasElement;
    const { antialias = true, alpha = true, powerPreference, forceWebGL = false } = options;

    // Check WebGPU availability
    const webgpuAvailable = !forceWebGL && (await isWebGPUAvailable());

    if (webgpuAvailable) {
      console.log('[WebGPU] Initializing WebGPU renderer');
      const renderer = new THREE.WebGPURenderer({
        canvas,
        antialias,
        alpha,
        powerPreference,
      });
      await renderer.init();
      return renderer;
    }

    // Fallback to WebGL
    console.log('[WebGPU] WebGPU not available, falling back to WebGL');
    const { WebGLRenderer } = await import('three');
    return new WebGLRenderer({
      canvas,
      antialias,
      alpha,
      powerPreference,
    });
  };
}

/**
 * Type declaration for extended JSX elements with WebGPU materials
 * Node materials are automatically extended via extend(THREE) above.
 * Custom node props (colorNode, etc.) are typed as unknown to allow any node graph.
 */
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
