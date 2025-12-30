/**
 * BackgroundGradient - Monument Valley inspired gradient background
 *
 * Renders a fullscreen quad with vertical gradient shader:
 * - Top: Off-white/cream (#faf8f3)
 * - Bottom: Soft terracotta/peach (#f2d8cc)
 * - Subtle paper texture noise
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  PAINTED_BACKGROUND_FRAGMENT_SHADER,
  PAINTED_BACKGROUND_VERTEX_SHADER,
} from '../../lib/shaders';

/**
 * BackgroundGradient - Fullscreen gradient background
 *
 * Uses existing shader from src/lib/shaders.ts for Monument Valley aesthetic.
 * Renders at renderOrder=-1000 to ensure it appears behind all other elements.
 */
export function BackgroundGradient() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: PAINTED_BACKGROUND_VERTEX_SHADER,
      fragmentShader: PAINTED_BACKGROUND_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  // Update time uniform for shader animation
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      material.dispose();
      geometry.dispose();
    };
  }, [material, geometry]);

  return (
    <mesh geometry={geometry} material={material} renderOrder={-1000} position={[0, 0, -100]}>
      {/* Mesh created with geometry and material props above */}
    </mesh>
  );
}

export default BackgroundGradient;
