/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Renders as a fullscreen quad behind all other content with:
 * - Multi-stop pastel gradient (sky blue → dusty rose → apricot → coral)
 * - Animated procedural clouds using FBM noise
 * - Subtle vignette effect
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { DoubleSide, PlaneGeometry } from 'three';
import {
  add,
  dot,
  Fn,
  fract,
  glslFn,
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
 * GLSL FBM noise function for cloud-like patterns
 * Wrapped with glslFn for use in TSL
 */
const fbmNoiseGLSL = glslFn(`
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289v2(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float main(vec2 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p *= 2.02;
    f += 0.2500 * snoise(p);
    return f / 0.75;
  }
`);

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
      const clouds = fbmNoiseGLSL(mul(cloudUv, 2.5));

      // Second layer of clouds moving slightly differently
      const cloudUv2 = add(
        mul(uvCoord, vec2(1.5, 0.8)),
        vec2(add(mul(timeUniform, 0.01), 50.0), mul(timeUniform, 0.003)),
      );
      const clouds2 = fbmNoiseGLSL(mul(cloudUv2, 2.0));

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
