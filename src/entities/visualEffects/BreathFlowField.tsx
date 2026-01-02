/**
 * BreathFlowField - Perlin noise flow field background that responds to breathing
 *
 * Inspired by music visualizer fluid dynamics. Creates a subtle, organic flow field
 * background where the noise parameters modulate based on breath phase:
 * - Inhale: Noise contracts, frequency increases (tighter swirls)
 * - Hold: Noise slows, amplitude dampens (calm stillness)
 * - Exhale: Noise expands, frequency decreases (gentle release)
 *
 * Uses curl noise for smooth, divergence-free flow patterns.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

// Flow field vertex shader
const flowVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Flow field fragment shader with breathing-reactive perlin noise
const flowFragmentShader = `
uniform float time;
uniform float breathPhase;
uniform int phaseType;
uniform vec2 resolution;
uniform vec3 color1;  // Warm color (inhale peak)
uniform vec3 color2;  // Cool color (exhale)
uniform vec3 color3;  // Accent color

varying vec2 vUv;

// Improved noise functions for smooth flow
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractal Brownian motion for layered noise
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;

  // Breathing-reactive parameters
  // Inhale (breathPhase→1): tighter swirls, faster flow, warmer colors
  // Exhale (breathPhase→0): looser swirls, slower flow, cooler colors

  // Noise frequency: higher when inhaling (tighter swirls)
  float noiseFreq = 2.0 + breathPhase * 1.5;

  // Time speed: faster when inhaling, slower during hold
  float timeSpeed = 0.15;
  if (phaseType == 1 || phaseType == 3) {
    // Hold phases - very slow, calm
    timeSpeed = 0.05;
  } else if (phaseType == 0) {
    // Inhale - energetic
    timeSpeed = 0.2;
  }

  float animTime = time * timeSpeed;

  // Create flowing noise field
  vec3 noiseCoord = vec3(
    uv.x * noiseFreq,
    uv.y * noiseFreq,
    animTime
  );

  // Multi-octave noise for organic flow
  float noise1 = fbm(noiseCoord, 3);
  float noise2 = fbm(noiseCoord + vec3(5.2, 1.3, 0.0), 3);

  // Curl-like distortion (pseudo-curl noise)
  float curl = noise1 * 0.5 + 0.5;
  float curlOffset = noise2 * 0.3;

  // Breathing amplitude: more pronounced during transitions, subtle during hold
  float breathAmplitude = 0.3;
  if (phaseType == 1 || phaseType == 3) {
    breathAmplitude = 0.1; // Subtle during hold
  }

  // Radial flow pattern - contracts on inhale, expands on exhale
  float radialDist = length(center);
  float radialFlow = sin(radialDist * 6.0 - breathPhase * 3.14159 + animTime * 2.0);
  radialFlow *= (1.0 - breathPhase) * 0.3; // Stronger on exhale

  // Combine all effects
  float flowIntensity = curl + curlOffset * breathAmplitude + radialFlow * 0.2;

  // Color based on breathing phase
  // Inhale (1): warm tones, Exhale (0): cool tones
  vec3 warmColor = color1;  // Warm cream/gold
  vec3 coolColor = color2;  // Soft blue/teal
  vec3 accentColor = color3; // Rose accent

  // Base gradient (vertical)
  vec3 baseColor = mix(coolColor * 0.95, warmColor, uv.y);

  // Apply breath-based color shift
  vec3 breathColor = mix(coolColor, warmColor, breathPhase);

  // Blend base with breath color
  vec3 color = mix(baseColor, breathColor, 0.3);

  // Add flow field influence
  color = mix(color, accentColor, flowIntensity * 0.15);

  // Subtle radial vignette
  float vignette = 1.0 - radialDist * 0.3;
  color *= vignette;

  // Very subtle noise grain
  float grain = (snoise(vec3(uv * 100.0, time * 0.1)) * 0.5 + 0.5) * 0.02;
  color += grain;

  // Soft center glow that breathes
  float centerGlow = smoothstep(0.5, 0.0, radialDist) * 0.08 * (0.7 + breathPhase * 0.3);
  color += vec3(1.0, 0.98, 0.95) * centerGlow;

  gl_FragColor = vec4(color, 1.0);
}
`;

interface BreathFlowFieldProps {
  /** Enable the flow field @default true */
  enabled?: boolean;
  /** Warm color (inhale peak) @default '#faf5ef' */
  warmColor?: string;
  /** Cool color (exhale) @default '#e8f4f8' */
  coolColor?: string;
  /** Accent color @default '#f8e8e8' */
  accentColor?: string;
}

export function BreathFlowField({
  enabled = true,
  warmColor = '#faf5ef',
  coolColor = '#e8f4f8',
  accentColor = '#f8e8e8',
}: BreathFlowFieldProps) {
  const { size } = useThree();
  const world = useWorld();
  const meshRef = useRef<THREE.Mesh>(null);

  // Create shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          phaseType: { value: 0 },
          resolution: { value: new THREE.Vector2(size.width, size.height) },
          color1: { value: new THREE.Color(warmColor) },
          color2: { value: new THREE.Color(coolColor) },
          color3: { value: new THREE.Color(accentColor) },
        },
        vertexShader: flowVertexShader,
        fragmentShader: flowFragmentShader,
        depthWrite: false,
        depthTest: false,
      }),
    [size.width, size.height, warmColor, coolColor, accentColor],
  );

  // Create fullscreen quad geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
      geometry.dispose();
    };
  }, [material, geometry]);

  // Update resolution on resize
  useEffect(() => {
    material.uniforms.resolution.value.set(size.width, size.height);
  }, [size.width, size.height, material]);

  // Animation loop
  useFrame((state) => {
    if (!enabled) return;

    const time = state.clock.elapsedTime;

    // Get breath state from ECS
    let currentBreathPhase = 0;
    let currentPhaseType = 0;
    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      if (breathEntity) {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors
    }

    // Update uniforms
    material.uniforms.time.value = time;
    material.uniforms.breathPhase.value = currentBreathPhase;
    material.uniforms.phaseType.value = currentPhaseType;
  });

  if (!enabled) return null;

  // Render as background layer
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-1000}
    />
  );
}

export default BreathFlowField;
