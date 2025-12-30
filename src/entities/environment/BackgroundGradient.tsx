/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Renders as a fullscreen quad behind all other content with:
 * - Multi-stop pastel gradient (sky blue → dusty rose → apricot → coral)
 * - Animated procedural clouds using FBM noise
 * - Subtle vignette effect
 * - Breathing-synchronized watercolor bloom effect
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

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

float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p); p *= 2.01;
  f += 0.0625 * snoise(p);
  return f / 0.9375;
}

void main() {
  // Creamy neutral background - soft warm tones
  vec3 skyTop = vec3(0.96, 0.94, 0.91);       // #f5f0e8 Warm cream
  vec3 skyMid = vec3(0.98, 0.95, 0.90);       // #faf2e6 Soft ivory
  vec3 horizon = vec3(0.99, 0.94, 0.88);      // #fcf0e0 Warm white
  vec3 warmGlow = vec3(0.98, 0.92, 0.85);     // #faebb9 Subtle warm glow

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

  // BREATHING-SYNCHRONIZED WATERCOLOR BLOOM
  // Subtle center glow that expands/contracts with breath
  vec2 center = vUv - 0.5;
  float dist = length(center);

  // Bloom radius pulses with breathing (smaller on inhale, larger on exhale)
  float bloomRadius = 0.35 + (1.0 - breathPhase) * 0.15;
  float bloom = smoothstep(bloomRadius + 0.2, bloomRadius - 0.1, dist);

  // Watercolor bloom color - warm peachy glow
  vec3 bloomColor = vec3(1.0, 0.97, 0.93);
  skyColor = mix(skyColor, bloomColor, bloom * 0.08 * (0.7 + breathPhase * 0.3));

  // Animated cloud-like wisps using FBM noise
  vec2 cloudUv = vUv * vec2(2.0, 1.0) + vec2(time * 0.015, 0.0);
  float clouds = fbm(cloudUv * 2.5);

  // Second layer of clouds moving slightly differently
  vec2 cloudUv2 = vUv * vec2(1.5, 0.8) + vec2(time * 0.01 + 50.0, time * 0.003);
  float clouds2 = fbm(cloudUv2 * 2.0);

  // Third layer - breathing-synchronized cloud wisps
  vec2 breathCloudUv = vUv * vec2(1.2, 0.6) + vec2(time * 0.008, breathPhase * 0.05);
  float breathClouds = fbm(breathCloudUv * 1.8);

  // Combine cloud layers - fade at top and bottom
  float cloudMask = smoothstep(0.2, 0.55, clouds * 0.4 + clouds2 * 0.35 + breathClouds * 0.25);
  cloudMask *= smoothstep(0.1, 0.4, y) * smoothstep(0.95, 0.6, y);

  // Cloud opacity pulses subtly with breathing
  float cloudOpacity = 0.12 + breathPhase * 0.06;

  // Cloud color - pure warm white
  vec3 cloudColor = vec3(1.0, 0.99, 0.97);

  // Blend clouds into sky
  vec3 color = mix(skyColor, cloudColor, cloudMask * cloudOpacity);

  // BREATHING VIGNETTE - expands on inhale, contracts on exhale
  vec2 vignetteUv = vUv * 2.0 - 1.0;
  float vignetteStrength = 0.12 + (1.0 - breathPhase) * 0.05;
  float vignette = 1.0 - dot(vignetteUv * vignetteStrength, vignetteUv * vignetteStrength);
  color *= mix(0.96, 1.0, vignette);

  // Subtle color temperature shift with breathing
  // Warmer on exhale (relaxed), cooler on inhale (energized)
  vec3 warmShift = vec3(0.02, 0.01, -0.01);
  vec3 coolShift = vec3(-0.01, 0.0, 0.015);
  color += mix(warmShift, coolShift, breathPhase) * 0.5;

  // Paper texture noise (very subtle)
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.008;
  color += noise;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function BackgroundGradient() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhase: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Animate time and breathPhase uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;

      // Get breath phase from ECS
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          const phase = breathEntity.get(breathPhase)?.value ?? 0;
          materialRef.current.uniforms.breathPhase.value = phase;
        }
      } catch {
        // Ignore ECS errors during unmount/remount in Triplex
      }
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
