/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Renders as a fullscreen quad behind all other content with:
 * - Multi-stop pastel gradient (sky blue → dusty rose → apricot → coral)
 * - Animated procedural clouds using TSL noise
 * - Subtle vignette effect
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 * NOTE: Uses pure TSL noise (no glslFn) for WebGPU compatibility
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { DoubleSide, PlaneGeometry } from 'three';
import {
  add,
  dot,
  Fn,
  floor,
  fract,
  mix,
  mul,
  positionGeometry,
  sin,
  smoothstep,
  sub,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

/**
 * Pure TSL value noise function for WebGPU compatibility
 * Uses a hash-based approach that compiles to both GLSL and WGSL
 */
const valueNoise = Fn(([p]: [ReturnType<typeof vec2>]) => {
  const i = floor(p);
  const f = fract(p);

  // Smooth interpolation (cubic Hermite)
  const u = mul(mul(f, f), sub(3.0, mul(2.0, f)));

  // Four corners using hash function
  const a = fract(mul(sin(dot(i, vec2(127.1, 311.7))), 43758.5453));
  const b = fract(mul(sin(dot(add(i, vec2(1.0, 0.0)), vec2(127.1, 311.7))), 43758.5453));
  const c = fract(mul(sin(dot(add(i, vec2(0.0, 1.0)), vec2(127.1, 311.7))), 43758.5453));
  const d = fract(mul(sin(dot(add(i, vec2(1.0, 1.0)), vec2(127.1, 311.7))), 43758.5453));

  // Bilinear interpolation
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

/**
 * FBM (Fractal Brownian Motion) using value noise
 * Two octaves for soft cloud-like patterns
 */
const fbmNoise = Fn(([p]: [ReturnType<typeof vec2>]) => {
  const n1 = valueNoise(p);
  const n2 = valueNoise(mul(p, 2.02));

  // Combine octaves: 0.5 * n1 + 0.25 * n2, normalized to ~0-1
  return mul(add(mul(n1, 0.5), mul(n2, 0.25)), 1.333);
});

export function BackgroundGradient() {
  const meshRef = useRef<Mesh>(null);

  // Create geometry with useMemo for proper disposal
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.side = DoubleSide;

    // Time uniform for animation
    const timeUniform = uniform(0);
    mat.userData.time = timeUniform;

    // Build color node using TSL
    const colorNode = Fn(() => {
      const uvCoord = uv();
      const y = uvCoord.y;

      // Creamy neutral background - soft warm tones
      const skyTop = vec3(0.96, 0.94, 0.91); // Warm cream
      const skyMid = vec3(0.98, 0.95, 0.9); // Soft ivory
      const horizon = vec3(0.99, 0.94, 0.88); // Warm white
      const warmGlow = vec3(0.98, 0.92, 0.85); // Subtle warm glow

      // Smooth multi-stop gradient using smoothstep blending
      const t1 = smoothstep(0.5, 0.9, y);
      const t2 = smoothstep(0.25, 0.6, y);
      const t3 = smoothstep(0.0, 0.35, y);

      // Layer the colors smoothly
      const skyColor1 = mix(warmGlow, horizon, t3);
      const skyColor2 = mix(skyColor1, skyMid, t2);
      const skyColor = mix(skyColor2, skyTop, t1);

      // Animated cloud-like wisps using FBM noise
      const cloudUv = add(mul(uvCoord, vec2(2.0, 1.0)), vec2(mul(timeUniform, 0.015), 0.0));
      const clouds = fbmNoise(mul(cloudUv, 2.5));

      // Second layer of clouds moving slightly differently
      const cloudUv2 = add(
        mul(uvCoord, vec2(1.5, 0.8)),
        vec2(add(mul(timeUniform, 0.01), 50.0), mul(timeUniform, 0.003)),
      );
      const clouds2 = fbmNoise(mul(cloudUv2, 2.0));

      // Combine cloud layers - fade at top and bottom
      const cloudMaskBase = smoothstep(0.2, 0.55, add(mul(clouds, 0.5), mul(clouds2, 0.5)));
      const cloudMask = mul(mul(cloudMaskBase, smoothstep(0.1, 0.4, y)), smoothstep(0.95, 0.6, y));

      // Cloud color - pure warm white
      const cloudColor = vec3(1.0, 0.99, 0.97);

      // Blend clouds very subtly into sky
      const color1 = mix(skyColor, cloudColor, mul(cloudMask, 0.15));

      // Very subtle vignette - just darkens corners slightly
      const vignetteUv = sub(mul(uvCoord, 2.0), 1.0);
      const vignette = sub(1.0, dot(mul(vignetteUv, 0.15), mul(vignetteUv, 0.15)));
      const color2 = mul(color1, mix(0.97, 1.0, vignette));

      // Paper texture noise (very subtle)
      const noise = mul(
        sub(fract(mul(sin(dot(uvCoord, vec2(12.9898, 78.233))), 43758.5453)), 0.5),
        0.008,
      );
      const finalColor = add(color2, noise);

      return vec4(finalColor, 1.0);
    })();

    mat.colorNode = colorNode;

    // Override position for fullscreen quad
    mat.positionNode = Fn(() => {
      return vec4(positionGeometry.xy, 0.9999, 1.0);
    })();

    return mat;
  }, []);

  // Animate time uniform
  useFrame((state) => {
    if (material.userData.time) {
      material.userData.time.value = state.clock.elapsedTime;
    }
  });

  // Cleanup geometry and material on unmount
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

export default BackgroundGradient;
