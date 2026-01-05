/**
 * WebGPUCanvas - R3F Canvas with WebGPU renderer and WebGL fallback
 *
 * Features:
 * - Automatic WebGPU detection and initialization
 * - Graceful fallback to WebGL2 if WebGPU unavailable
 * - Async renderer initialization for WebGPU
 * - Same API as standard R3F Canvas
 *
 * TSL (Three.js Shading Language) works with both renderers:
 * - WebGPU: Compiles to WGSL
 * - WebGL2: Compiles to GLSL via GLSLNodeBuilder
 *
 * @see https://blog.pragmattic.dev/react-three-fiber-webgpu-typescript
 */

import { Canvas, type CanvasProps, extend, type ThreeToJSXElements } from '@react-three/fiber';
import { type FC, type PropsWithChildren, useEffect, useState } from 'react';

// Conditional imports for WebGPU
let WebGPU: { isAvailable: () => boolean } | null = null;
let THREE_WEBGPU: typeof import('three/webgpu') | null = null;

// Track initialization state
let webgpuInitialized = false;
let webgpuAvailable = false;

/**
 * Initialize WebGPU imports asynchronously
 * This prevents bundling issues when WebGPU is not available
 */
async function initializeWebGPU(): Promise<boolean> {
  if (webgpuInitialized) return webgpuAvailable;

  try {
    // Dynamic import to avoid build errors in non-WebGPU environments
    const [webgpuModule, threeWebgpu] = await Promise.all([
      import('three/examples/jsm/capabilities/WebGPU.js'),
      import('three/webgpu'),
    ]);

    WebGPU = webgpuModule.default;
    THREE_WEBGPU = threeWebgpu;

    // Extend R3F with WebGPU types
    // biome-ignore lint/suspicious/noExplicitAny: WebGPU THREE namespace requires any for extend()
    extend(THREE_WEBGPU as any);

    webgpuAvailable = WebGPU?.isAvailable() ?? false;
    webgpuInitialized = true;

    console.log(`[WebGPUCanvas] WebGPU ${webgpuAvailable ? 'available' : 'not available'}`);
    return webgpuAvailable;
  } catch (error) {
    console.warn('[WebGPUCanvas] WebGPU initialization failed, using WebGL fallback:', error);
    webgpuInitialized = true;
    webgpuAvailable = false;
    return false;
  }
}

// Declare WebGPU types for R3F
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof import('three/webgpu')> {}
}

export interface WebGPUCanvasProps extends Omit<CanvasProps, 'gl'> {
  /** Force WebGL even if WebGPU is available */
  forceWebGL?: boolean;
  /** Callback when renderer type is determined */
  onRendererReady?: (type: 'webgpu' | 'webgl') => void;
  /** WebGL config (used when falling back to WebGL) */
  webglConfig?: CanvasProps['gl'];
}

/**
 * WebGPUCanvas - Canvas component with WebGPU support
 *
 * Usage:
 * ```tsx
 * <WebGPUCanvas camera={{ position: [0, 0, 5] }}>
 *   <mesh>
 *     <boxGeometry />
 *     <meshStandardNodeMaterial colorNode={color('#ff0000')} />
 *   </mesh>
 * </WebGPUCanvas>
 * ```
 */
export const WebGPUCanvas: FC<PropsWithChildren<WebGPUCanvasProps>> = ({
  children,
  forceWebGL = false,
  onRendererReady,
  webglConfig,
  ...canvasProps
}) => {
  const [rendererType, setRendererType] = useState<'webgpu' | 'webgl' | 'loading'>('loading');

  useEffect(() => {
    if (forceWebGL) {
      setRendererType('webgl');
      onRendererReady?.('webgl');
      return;
    }

    initializeWebGPU().then((available) => {
      const type = available ? 'webgpu' : 'webgl';
      setRendererType(type);
      onRendererReady?.(type);
    });
  }, [forceWebGL, onRendererReady]);

  // Show nothing while loading
  if (rendererType === 'loading') {
    return null;
  }

  // WebGL fallback
  if (rendererType === 'webgl') {
    return (
      <Canvas gl={webglConfig} {...canvasProps}>
        {children}
      </Canvas>
    );
  }

  // WebGPU renderer
  return (
    <Canvas
      gl={async (props) => {
        if (!THREE_WEBGPU) {
          throw new Error('WebGPU THREE not initialized');
        }
        // biome-ignore lint/suspicious/noExplicitAny: WebGPURenderer constructor expects specific params
        const renderer = new THREE_WEBGPU.WebGPURenderer(props as any);
        await renderer.init();
        return renderer;
      }}
      {...canvasProps}
    >
      {children}
    </Canvas>
  );
};

/**
 * Hook to check WebGPU availability
 * Returns null while checking, true/false after check
 */
export function useWebGPUAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    initializeWebGPU().then(setAvailable);
  }, []);

  return available;
}

export default WebGPUCanvas;
