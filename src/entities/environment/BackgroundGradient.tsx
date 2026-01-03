/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Renders as a fullscreen quad behind all other content with:
 * - Multi-stop pastel gradient (sky blue → dusty rose → apricot → coral)
 * - Animated procedural clouds using FBM noise
 * - Subtle vignette effect
 * - BREATH-REACTIVE color shifts:
 *   - Inhale (breathPhase → 1): Cool blue/teal tones ("contracted")
 *   - Exhale (breathPhase → 0): Warm gold/coral tones ("radiant")
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { DoubleSide, PlaneGeometry, ShaderMaterial } from 'three';

import { breathPhase as breathPhaseTrait } from '../breath/traits';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const fragmentShader = `
uniform float time;
uniform float breathPhase;
varying vec2 vUv;

// Simplex noise functions for cloud-like patterns
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

// Optimized FBM with 2 octaves (was 4) - 50% cheaper, nearly identical visual
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p);
  return f / 0.75;
}

void main() {
  // ============================================
  // BREATH-REACTIVE COLOR PALETTES
  // ============================================
  // Exhale (breathPhase = 0): Warm, radiant gold/coral - expanding energy
  // Inhale (breathPhase = 1): Cool, contracted blue/teal - gathering energy

  // WARM palette (exhale state) - radiant, expansive
  vec3 warmTop = vec3(0.96, 0.94, 0.91);      // #f5f0e8 Warm cream
  vec3 warmMid = vec3(0.99, 0.94, 0.88);      // #fcf0e0 Soft peach
  vec3 warmHorizon = vec3(0.99, 0.91, 0.84);  // #fce8d6 Warm glow
  vec3 warmGlow = vec3(0.98, 0.88, 0.78);     // #fae0c7 Golden radiance

  // COOL palette (inhale state) - contracted, centered
  vec3 coolTop = vec3(0.92, 0.95, 0.97);      // #ebf3f8 Cool sky
  vec3 coolMid = vec3(0.90, 0.95, 0.96);      // #e6f2f5 Soft teal
  vec3 coolHorizon = vec3(0.88, 0.94, 0.95);  // #e0f0f2 Aqua mist
  vec3 coolGlow = vec3(0.86, 0.93, 0.94);     // #dbedee Breath teal

  // Blend between warm and cool based on breath phase
  // breathPhase 0 = exhale (warm), breathPhase 1 = inhale (cool)
  vec3 skyTop = mix(warmTop, coolTop, breathPhase);
  vec3 skyMid = mix(warmMid, coolMid, breathPhase);
  vec3 horizon = mix(warmHorizon, coolHorizon, breathPhase);
  vec3 bottomGlow = mix(warmGlow, coolGlow, breathPhase);

  // Vertical position for gradient
  float y = vUv.y;

  // Smooth multi-stop gradient using smoothstep blending
  vec3 skyColor;
  float t1 = smoothstep(0.5, 0.9, y);   // Top transition
  float t2 = smoothstep(0.25, 0.6, y);  // Middle transition
  float t3 = smoothstep(0.0, 0.35, y);  // Bottom transition

  // Layer the colors smoothly
  skyColor = mix(bottomGlow, horizon, t3);
  skyColor = mix(skyColor, skyMid, t2);
  skyColor = mix(skyColor, skyTop, t1);

  // Animated cloud-like wisps using FBM noise
  vec2 cloudUv = vUv * vec2(2.0, 1.0) + vec2(time * 0.015, 0.0);
  float clouds = fbm(cloudUv * 2.5);

  // Second layer of clouds moving slightly differently
  vec2 cloudUv2 = vUv * vec2(1.5, 0.8) + vec2(time * 0.01 + 50.0, time * 0.003);
  float clouds2 = fbm(cloudUv2 * 2.0);

  // Combine cloud layers - fade at top and bottom
  float cloudMask = smoothstep(0.2, 0.55, clouds * 0.5 + clouds2 * 0.5);
  cloudMask *= smoothstep(0.1, 0.4, y) * smoothstep(0.95, 0.6, y);

  // Cloud color shifts with breath - warmer during exhale, cooler during inhale
  vec3 warmCloud = vec3(1.0, 0.98, 0.95);   // Warm white
  vec3 coolCloud = vec3(0.96, 0.99, 1.0);   // Cool white
  vec3 cloudColor = mix(warmCloud, coolCloud, breathPhase);

  // Blend clouds very subtly into sky
  vec3 color = mix(skyColor, cloudColor, cloudMask * 0.15);

  // Very subtle vignette - just darkens corners slightly
  vec2 vignetteUv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vignetteUv * 0.15, vignetteUv * 0.15);
  color *= mix(0.97, 1.0, vignette);

  // Paper texture noise (very subtle)
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.008;
  color += noise;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function BackgroundGradient() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  // Create geometry with useMemo for proper disposal
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhase: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
  }, []);

  // Animate time and breathPhase uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;

      // Query breath phase from ECS
      try {
        const breathEntity = world.queryFirst(breathPhaseTrait);
        if (breathEntity) {
          const phase = breathEntity.get(breathPhaseTrait)?.value ?? 0;
          materialRef.current.uniforms.breathPhase.value = phase;
        }
      } catch {
        // Ignore ECS errors during unmount/remount in Triplex
      }
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
    <mesh renderOrder={-1000} frustumCulled={false} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default BackgroundGradient;
