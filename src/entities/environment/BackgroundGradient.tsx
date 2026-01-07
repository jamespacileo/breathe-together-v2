/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Uses TSL (Three.js Shading Language) nodes for renderer-agnostic code.
 * Compiles to both WebGL (GLSL) and WebGPU (WGSL).
 *
 * Features:
 * - Multi-stop pastel gradient
 * - Animated FBM cloud layers (2 layers with different speeds)
 * - Subtle paper texture noise
 * - Subtle vignette effect
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
import { getMaterialUserData, setMaterialUserData } from '../../lib/three/materialUserData';
// Import existing TSL noise utility
import { createFBMNode } from '../../lib/tsl/noise';

interface BackgroundGradientProps {
  /** Enable vignette effect (default: true) */
  enableVignette?: boolean;
  /** Enable animated cloud layers (default: true) */
  enableClouds?: boolean;
}

/**
 * BackgroundGradient Component
 *
 * Renders a fullscreen gradient background.
 * Uses TSL for renderer-agnostic shader code.
 */
export function BackgroundGradient({
  enableVignette = true,
  enableClouds = true,
}: BackgroundGradientProps = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<MeshBasicNodeMaterial>(null);

  // Create the material with TSL nodes
  const material = useMemo(() => {
    // Time uniform for cloud animation
    const uTime = uniform(float(0));

    // Store uniform for animation
    const userData = { uTime };
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

    // ═══════════════════════════════════════════════════════════════
    // Animated cloud-like wisps using FBM noise (if enabled)
    // GLSL equivalent (lines 84-99 in BackgroundGradient.tsx):
    // vec2 cloudUv = vUv * vec2(2.0, 1.0) + vec2(time * 0.015, 0.0);
    // float clouds = fbm(cloudUv * 2.5);
    // vec2 cloudUv2 = vUv * vec2(1.5, 0.8) + vec2(time * 0.01 + 50.0, time * 0.003);
    // float clouds2 = fbm(cloudUv2 * 2.0);
    // ═══════════════════════════════════════════════════════════════
    const colorWithClouds = enableClouds
      ? (() => {
          // Cloud layer 1 - main drifting clouds
          const cloudUv1 = add(
            mul(uvCoord, vec2(2.0, 1.0)),
            vec2(mul(uTime, float(0.015)), float(0.0)),
          );
          const clouds1 = createFBMNode(mul(cloudUv1, float(2.5)), 2, 2.0, 0.5);

          // Cloud layer 2 - secondary slower clouds
          const cloudUv2 = add(
            mul(uvCoord, vec2(1.5, 0.8)),
            vec2(add(mul(uTime, float(0.01)), float(50.0)), mul(uTime, float(0.003))),
          );
          const clouds2 = createFBMNode(mul(cloudUv2, float(2.0)), 2, 2.0, 0.5);

          // Combine cloud layers - fade at top and bottom
          const cloudCombined = add(mul(clouds1, float(0.5)), mul(clouds2, float(0.5)));
          const cloudMask = mul(
            smoothstep(float(0.2), float(0.55), cloudCombined),
            mul(smoothstep(float(0.1), float(0.4), y), smoothstep(float(0.95), float(0.6), y)),
          );

          // Cloud color - pure warm white
          const cloudColor = vec3(1.0, 0.99, 0.97);

          // Blend clouds very subtly into sky (15% opacity)
          return mix(skyColor, cloudColor, mul(cloudMask, float(0.15)));
        })()
      : skyColor;

    // Paper texture noise (very subtle dithering)
    const noiseSeed = dot(uvCoord, vec2(12.9898, 78.233));
    const noise = mul(sub(fract(mul(sin(noiseSeed), float(43758.5453))), float(0.5)), float(0.008));

    // Build final color with noise
    const colorWithNoise = add(colorWithClouds, noise);

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

    // Store userData for animation
    setMaterialUserData(mat, userData);

    return mat;
  }, [enableVignette, enableClouds]);

  // Animate time uniform for cloud animation
  useFrame((state) => {
    if (!materialRef.current) return;

    const userData = getMaterialUserData<{ uTime?: { value: number } }>(materialRef.current);
    if (userData?.uTime) {
      userData.uTime.value = state.clock.elapsedTime;
    }
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
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default BackgroundGradient;
