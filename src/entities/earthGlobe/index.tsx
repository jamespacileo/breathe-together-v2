/**
 * EarthGlobe - Glass/Crystal Earth visualization
 *
 * Features:
 * - Transparent refractive glass sphere with internal glow
 * - Ethereal continent silhouettes visible through crystal
 * - Breathing pulse glow that expands/contracts with breath cycle
 * - Soft fresnel rim creating atmospheric halo
 * - Inner luminescence that intensifies during inhale
 */

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';

// Vertex shader for glass globe with fresnel and inner glow
const globeVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - crystal glass with inner glow and continent silhouettes
const globeFragmentShader = `
uniform sampler2D earthTexture;
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;

// Simplex noise for internal caustics
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

void main() {
  // Sample earth texture for continent silhouettes
  vec3 texColor = texture2D(earthTexture, vUv).rgb;
  float landMask = length(texColor - vec3(0.85, 0.75, 0.55)); // Detect land (warm tones)
  landMask = smoothstep(0.3, 0.0, landMask); // Invert: land = 1, ocean = 0

  // Fresnel effect - strong rim glow for glass appearance
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

  // Inner glow - intensifies with breath phase
  float innerGlow = breathPhase * 0.6 + 0.2;

  // Internal caustics - animated light patterns inside crystal
  vec2 causticUv = vUv * 4.0 + vec2(time * 0.02, time * 0.015);
  float caustics = snoise(causticUv) * 0.5 + 0.5;
  caustics = smoothstep(0.3, 0.7, caustics) * 0.15 * breathPhase;

  // Glass base color - pale cyan crystal tint
  vec3 glassColor = vec3(0.85, 0.95, 0.98);

  // Inner glow color - warm gold/amber
  vec3 glowColor = vec3(1.0, 0.92, 0.7);

  // Continent silhouette color - subtle golden outlines
  vec3 continentColor = vec3(0.95, 0.85, 0.65);

  // Rim color - ethereal teal/cyan
  vec3 rimColor = vec3(0.6, 0.9, 0.95);

  // Build final color:
  // 1. Start with transparent glass base
  vec3 color = glassColor * 0.3;

  // 2. Add inner luminescence (core glow)
  color += glowColor * innerGlow * (1.0 - fresnel) * 0.5;

  // 3. Add continent silhouettes as ethereal golden shapes
  color += continentColor * landMask * 0.35 * (1.0 + breathPhase * 0.3);

  // 4. Add animated caustics
  color += glowColor * caustics;

  // 5. Add fresnel rim glow
  color = mix(color, rimColor, fresnel * 0.7);

  // 6. Breathing pulse - radial glow that expands outward
  float pulseGlow = fresnel * breathPhase * 0.4;
  color += rimColor * pulseGlow;

  // Transparency: more transparent in center, opaque at rim
  float alpha = mix(0.4, 0.85, fresnel) + innerGlow * 0.15;
  alpha = clamp(alpha, 0.35, 0.95);

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  /** Core radius @default 1.5 */
  radius?: number;
  /** Resolution of the sphere (segments) @default 64 */
  resolution?: number;
  /** Enable continuous Y-axis rotation @default true */
  enableRotation?: boolean;
}

/**
 * EarthGlobe - Renders a stylized textured earth as the central core
 */
export function EarthGlobe({
  radius = 1.5,
  resolution = 64,
  enableRotation = true,
}: Partial<EarthGlobeProps> = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Load earth texture
  const earthTexture = useTexture('/textures/earth-texture.png');

  // Configure texture
  useEffect(() => {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 16;
  }, [earthTexture]);

  // Create shader material with texture - transparent glass effect
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          earthTexture: { value: earthTexture },
          breathPhase: { value: 0 },
          time: { value: 0 },
        },
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false, // Better blending with background
      }),
    [earthTexture],
  );

  // Sphere geometry
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, resolution, resolution),
    [radius, resolution],
  );

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  /**
   * Update globe scale, rotation, and shader uniforms
   */
  useFrame((state) => {
    if (!meshRef.current) return;

    // Update time uniform for caustic animation
    material.uniforms.time.value = state.clock.elapsedTime;

    try {
      // Get breath phase for animation
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
        // Update shader uniform
        material.uniforms.breathPhase.value = phase;
        // Glass globe pulse: 1.0 to 1.08 (8% scale change for more visible breathing)
        const scale = 1.0 + phase * 0.08;
        meshRef.current.scale.set(scale, scale, scale);
      }

      // Slow rotation
      if (enableRotation) {
        meshRef.current.rotation.y -= 0.0008;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <mesh
      ref={meshRef}
      name="Earth Globe"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}

export default EarthGlobe;
