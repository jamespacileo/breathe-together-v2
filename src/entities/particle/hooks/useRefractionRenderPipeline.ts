import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Manages render target creation and lifecycle for glass refraction effect.
 * Creates FBOs for environment and back-face normals at configurable resolution.
 *
 * FBOs are automatically resized when window size changes via dependency tracking.
 */
export function useRefractionRenderPipeline(enabled: boolean = true, resolution: number = 1024) {
  const { size } = useThree();

  const renderTargets = useMemo(() => {
    if (!enabled) return null;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const width = Math.min(resolution * dpr, size.width);
    const height = Math.min(resolution * dpr, size.height);

    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      stencilBuffer: false,
    };

    return {
      envFBO: new THREE.WebGLRenderTarget(width, height, rtOptions),
      backfaceFBO: new THREE.WebGLRenderTarget(width, height, rtOptions),
    };
  }, [enabled, resolution, size.width, size.height]);

  useEffect(() => {
    return () => {
      renderTargets?.envFBO.dispose();
      renderTargets?.backfaceFBO.dispose();
    };
  }, [renderTargets]);

  return renderTargets;
}
