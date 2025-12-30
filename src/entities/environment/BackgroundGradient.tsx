/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Renders as a fullscreen quad behind all other content with:
 * - Multi-stop pastel gradient (sky blue → dusty rose → apricot → coral)
 * - Animated procedural clouds using FBM noise
 * - Subtle vignette effect
 * - Breathing-synchronized color warmth shift
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

interface BackgroundGradientProps {
  /** Enable breathing synchronization for color shift @default true */
  breathingSyncEnabled?: boolean;
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const fragmentShader = `
uniform float time;
uniform float breathPhaseValue;
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

float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p); p *= 2.01;
  f += 0.0625 * snoise(p);
  return f / 0.9375;
}

void main() {
  // Breathing-responsive warmth: cooler on exhale (0), warmer on inhale (1)
  float warmth = breathPhaseValue * 0.03; // Very subtle shift (0 to 0.03)

  // Creamy neutral background - soft warm tones with breathing warmth
  vec3 skyTop = vec3(0.96 + warmth, 0.94, 0.91 - warmth * 0.5);       // Warm cream
  vec3 skyMid = vec3(0.98 + warmth * 0.5, 0.95, 0.90 - warmth * 0.3); // Soft ivory
  vec3 horizon = vec3(0.99, 0.94 + warmth * 0.3, 0.88);               // Warm white
  vec3 warmGlow = vec3(0.98, 0.92 + warmth * 0.5, 0.85 + warmth);     // Subtle warm glow

  // Vertical position for gradient
  float y = vUv.y;

  // Smooth multi-stop gradient using smoothstep blending
  vec3 skyColor;
  float t1 = smoothstep(0.5, 0.9, y);   // Top transition
  float t2 = smoothstep(0.25, 0.6, y);  // Middle transition
  float t3 = smoothstep(0.0, 0.35, y);  // Bottom transition

  // Layer the colors smoothly
  skyColor = mix(warmGlow, horizon, t3);
  skyColor = mix(skyColor, skyMid, t2);
  skyColor = mix(skyColor, skyTop, t1);

  // Animated cloud-like wisps using FBM noise
  vec2 cloudUv = vUv * vec2(2.0, 1.0) + vec2(time * 0.015, 0.0);
  float clouds = fbm(cloudUv * 2.5);

  // Second layer of clouds moving slightly differently
  vec2 cloudUv2 = vUv * vec2(1.5, 0.8) + vec2(time * 0.01 + 50.0, time * 0.003);
  float clouds2 = fbm(cloudUv2 * 2.0);

  // Combine cloud layers - fade at top and bottom
  // Cloud visibility slightly increases on inhale (more ethereal feeling)
  float cloudIntensity = 0.15 + breathPhaseValue * 0.05;
  float cloudMask = smoothstep(0.2, 0.55, clouds * 0.5 + clouds2 * 0.5);
  cloudMask *= smoothstep(0.1, 0.4, y) * smoothstep(0.95, 0.6, y);

  // Cloud color - pure warm white, slightly warmer on inhale
  vec3 cloudColor = vec3(1.0, 0.99 + warmth * 0.3, 0.97 + warmth * 0.5);

  // Blend clouds into sky with breathing-responsive intensity
  vec3 color = mix(skyColor, cloudColor, cloudMask * cloudIntensity);

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

export function BackgroundGradient({ breathingSyncEnabled = true }: BackgroundGradientProps = {}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhaseValue: { value: 0.5 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Get current breath phase for synchronization
  const getBreathPhase = (): number => {
    if (!breathingSyncEnabled) return 0.5;
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      return breathEntity?.get?.(breathPhase)?.value ?? 0.5;
    } catch {
      return 0.5;
    }
  };

  // Animate time and breath phase uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.breathPhaseValue.value = getBreathPhase();
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default BackgroundGradient;
