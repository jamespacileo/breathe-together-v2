/**
 * GalaxyBackground - Deep space cosmic background shader
 *
 * Features:
 * - Deep space gradient (dark blue to purple to black)
 * - Nebula-like clouds using multi-octave noise
 * - Subtle color variations for cosmic depth
 * - Optimized 2-octave FBM for performance
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { DoubleSide, PlaneGeometry, ShaderMaterial } from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const fragmentShader = `
uniform float time;
varying vec2 vUv;

// Simplex noise for nebula clouds
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
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

// Optimized FBM with 3 octaves for nebula effect
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p);
  return f / 0.875;
}

void main() {
  // Vibrant cosmic gradient - inspired by Cosmic XR meditation app
  // Much brighter for visibility and meditative atmosphere
  vec3 deepSpace = vec3(0.05, 0.08, 0.18);      // Rich deep blue
  vec3 cosmicTeal = vec3(0.08, 0.15, 0.25);     // Cosmic teal
  vec3 nebulaPurple = vec3(0.12, 0.08, 0.22);   // Vibrant purple
  vec3 horizonGlow = vec3(0.15, 0.18, 0.3);     // Brighter horizon

  // Vertical gradient for cosmic depth
  float y = vUv.y;

  // Multi-stop gradient with smoother transitions
  vec3 skyColor;
  float t1 = smoothstep(0.5, 1.0, y);   // Top transition
  float t2 = smoothstep(0.25, 0.75, y); // Middle transition
  float t3 = smoothstep(0.0, 0.5, y);   // Bottom transition

  // Layer the cosmic colors with more variation
  skyColor = mix(deepSpace, nebulaPurple, t3);
  skyColor = mix(skyColor, cosmicTeal, t2);
  skyColor = mix(skyColor, horizonGlow, t1);

  // Animated nebula clouds using FBM - more visible
  vec2 nebulaUv = vUv * vec2(2.5, 2.0) + vec2(time * 0.01, time * 0.006);
  float nebula = fbm(nebulaUv * 1.2);

  // Second nebula layer with different movement
  vec2 nebulaUv2 = vUv * vec2(2.0, 1.5) + vec2(time * 0.008 + 100.0, -time * 0.005);
  float nebula2 = fbm(nebulaUv2 * 1.5);

  // Combine nebula layers with higher visibility
  float nebulaMask = (nebula * 0.6 + nebula2 * 0.4);
  nebulaMask = smoothstep(0.0, 0.8, nebulaMask);

  // Vibrant nebula colors - cosmic nebula palette inspired
  vec3 nebulaColor1 = vec3(0.35, 0.15, 0.45);   // Bright purple (connection)
  vec3 nebulaColor2 = vec3(0.12, 0.3, 0.4);     // Bright teal (presence)
  vec3 nebulaColor3 = vec3(0.25, 0.25, 0.5);    // Stellar blue (release)

  // Mix nebula colors based on position and noise
  vec3 nebulaColor = mix(nebulaColor1, nebulaColor2, vUv.x);
  nebulaColor = mix(nebulaColor, nebulaColor3, nebula * 0.3);

  // Blend nebula into background with higher intensity
  vec3 color = mix(skyColor, nebulaColor, nebulaMask * 0.5);

  // Subtle radial glow for depth (brighter center)
  vec2 center = vUv - 0.5;
  float radial = 1.0 - length(center) * 0.3;
  color *= mix(0.9, 1.15, radial); // Brighter center glow

  // Add subtle shimmer for cosmic feel
  float shimmer = sin(time * 0.5 + vUv.x * 10.0) * 0.02;
  color += shimmer;

  // Very subtle noise for texture
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015;
  color += noise;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function GalaxyBackground() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
  }, []);

  // Animate time uniform
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Note: Defaults to layer 0 (ENVIRONMENT) - will be blurred by DoF for atmospheric depth
  // Only stars/constellations/sun use OVERLAY layer for sharp focus
  return (
    <mesh renderOrder={-1000} frustumCulled={false} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default GalaxyBackground;
