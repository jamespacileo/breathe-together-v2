/**
 * WebGPU/TSL Setup for React Three Fiber
 *
 * This module sets up TSL (Three.js Shading Language) support for the application.
 * TSL is a node-based shader system that works with both WebGPU and WebGL backends.
 *
 * Key features:
 * - WebGPURenderer with automatic WebGL fallback
 * - TSL node materials (MeshBasicNodeMaterial, etc.)
 * - viewportSharedTexture for refraction effects
 * - Built-in PostProcessing with DoF, bloom, etc.
 *
 * @see https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
 * @see https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
 */

import { extend } from '@react-three/fiber';
import * as THREE from 'three/webgpu';

// Extend React Three Fiber with WebGPU Three.js classes
// This makes node materials like <meshBasicNodeMaterial /> available as JSX elements
extend(THREE as unknown as Record<string, new (...args: unknown[]) => unknown>);

// Re-export Three.js WebGPU module
export { THREE };

/**
 * WebGPURenderer configuration options
 */
export interface WebGPURendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'high-performance' | 'low-power';
  /** Force WebGL backend even if WebGPU is available */
  forceWebGL?: boolean;
}

/**
 * Check if WebGPU is available in the current browser
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
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
 * Uses WebGPURenderer which handles both WebGPU and WebGL backends.
 *
 * IMPORTANT: WebGPURenderer is required for TSL materials to work.
 * Setting forceWebGL: true uses the WebGL backend but still supports TSL.
 */
export function createWebGPURenderer(options: WebGPURendererOptions = {}) {
  return async (props: { canvas: HTMLCanvasElement }) => {
    const canvas = props.canvas;
    const {
      antialias = true,
      alpha = true,
      powerPreference = 'high-performance',
      forceWebGL = false,
    } = options;

    // Check WebGPU availability
    const webgpuAvailable = !forceWebGL && (await isWebGPUAvailable());

    if (webgpuAvailable) {
      console.log('[TSL] Using WebGPU backend');
    } else {
      console.log('[TSL] Using WebGL backend (WebGPU not available or forced)');
    }

    // Always use WebGPURenderer - it handles both backends and supports TSL
    const renderer = new THREE.WebGPURenderer({
      canvas,
      antialias,
      alpha,
      powerPreference,
      forceWebGL: !webgpuAvailable,
    });

    await renderer.init();
    return renderer;
  };
}
