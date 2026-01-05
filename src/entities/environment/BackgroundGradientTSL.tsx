/**
 * BackgroundGradientTSL - TSL (Three.js Shading Language) version
 *
 * Monument Valley inspired animated gradient background using TSL nodes.
 * This compiles to both WebGL (GLSL) and WebGPU (WGSL).
 *
 * Features:
 * - Multi-stop pastel gradient
 * - Subtle paper texture noise
 * - Subtle vignette effect
 *
 * Note: This is a simplified TSL version focused on the core gradient.
 * The animated clouds are omitted for now as the TSL noise implementation
 * is complex. Use BackgroundGradient.tsx (GLSL) for full features.
 *
 * @see BackgroundGradient.tsx for the GLSL equivalent with clouds
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  add,
  dot,
  float,
  fract,
  mix,
  mul,
  sin,
  smoothstep,
  sub,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { setUniformValue } from '../../types/tsl';

interface BackgroundGradientTSLProps {
  /** Enable vignette effect (default: true) */
  enableVignette?: boolean;
}

/**
 * BackgroundGradientTSL Component
 *
 * Renders a fullscreen gradient background.
 * Uses TSL for renderer-agnostic shader code.
 */
export function BackgroundGradientTSL({ enableVignette = true }: BackgroundGradientTSLProps = {}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Time uniform for animation (future use)
  const uTime = useMemo(() => uniform(float(0)), []);

  // Create the material with TSL nodes
  const material = useMemo(() => {
    // Get UV coordinates
    const uvCoord = uv();
    const y = uvCoord.y;

    // Monument Valley color palette - warm creamy tones
    const skyTop = vec3(0.96, 0.94, 0.91); // #f5f0e8 Warm cream
    const skyMid = vec3(0.98, 0.95, 0.9); // #faf2e6 Soft ivory
    const horizon = vec3(0.99, 0.94, 0.88); // #fcf0e0 Warm white
    const warmGlow = vec3(0.98, 0.92, 0.85); // #faebb9 Subtle warm glow

    // Smooth multi-stop gradient using smoothstep blending
    const t1 = smoothstep(float(0.5), float(0.9), y); // Top transition
    const t2 = smoothstep(float(0.25), float(0.6), y); // Middle transition
    const t3 = smoothstep(float(0.0), float(0.35), y); // Bottom transition

    // Layer the colors smoothly (functional composition)
    const layer1 = mix(warmGlow, horizon, t3);
    const layer2 = mix(layer1, skyMid, t2);
    const skyColor = mix(layer2, skyTop, t1);

    // Paper texture noise (very subtle dithering)
    const noiseSeed = dot(uvCoord, vec2(12.9898, 78.233));
    const noise = mul(sub(fract(mul(sin(noiseSeed), float(43758.5453))), float(0.5)), float(0.008));

    // Build final color with noise
    const colorWithNoise = add(skyColor, noise);

    // Apply vignette if enabled, otherwise use color with noise
    const finalColorNode = enableVignette
      ? (() => {
          // Vignette - darken corners slightly
          const vignetteUv = sub(mul(uvCoord, float(2.0)), float(1.0));
          const vignetteDist = dot(mul(vignetteUv, float(0.15)), mul(vignetteUv, float(0.15)));
          const vignette = sub(float(1.0), vignetteDist);
          const vignetteMult = mix(float(0.97), float(1.0), vignette);
          return mul(colorWithNoise, vignetteMult);
        })()
      : colorWithNoise;

    // Create material
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = finalColorNode;
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;

    return mat;
  }, [enableVignette]);

  // Animate time uniform (for future cloud animation)
  useFrame((state) => {
    setUniformValue(uTime, state.clock.elapsedTime);
  });

  // Create geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh ref={meshRef} renderOrder={-1000} frustumCulled={false} geometry={geometry}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default BackgroundGradientTSL;
