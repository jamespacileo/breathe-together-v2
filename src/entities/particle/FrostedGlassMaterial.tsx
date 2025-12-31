/**
 * FrostedGlassMaterial - Enhanced shader material for icosahedral shards
 *
 * Features subtle visual effects that users won't consciously notice but will feel:
 * - Soft fresnel rim glow (edge lighting like the globe)
 * - Breathing luminosity pulse (subtle brightness variation)
 * - Per-vertex mood colors with gentle saturation boost
 * - Subtle inner glow on exhale phase
 *
 * For the refraction effect to work:
 * 1. Mesh must have userData.useRefraction = true
 * 2. Mesh geometry must have a 'color' attribute with per-vertex mood colors
 * 3. RefractionPipeline must be present in the scene tree
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Vertex shader - passes normals and colors to fragment
const shardVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - fresnel rim + breathing luminosity + quick win enhancements
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

// Pseudo-random for edge noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float depth = length(vViewPosition);

  // === QUICK WIN #5: Edge noise on fresnel ===
  // Add per-face variation for more interesting light catch
  float edgeNoise = hash(vNormal.xy) * 0.3;
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5 + edgeNoise);

  // Breathing luminosity pulse - subtle brightness shift
  float breathLuminosity = 1.0 + breathPhase * 0.12;

  // Subtle saturation boost based on viewing angle
  float facingBoost = max(dot(vNormal, viewDir), 0.0) * 0.08;

  // === QUICK WIN #2: Per-face warmth shift ===
  // Faces pointing up get warmer, down get cooler
  float warmth = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.06;
  vec3 baseColor = vColor * breathLuminosity;
  baseColor.r += warmth;
  baseColor.g += warmth * 0.3;
  baseColor.b -= warmth * 0.4;

  // Mix in a warm white rim glow (like the globe)
  vec3 rimColor = vec3(0.98, 0.96, 0.94);
  vec3 colorWithRim = mix(baseColor, rimColor, fresnel * 0.25);

  // Subtle inner luminance - very gentle glow from within
  float innerGlow = (1.0 - fresnel) * 0.05 * (1.0 + breathPhase * 0.3);
  colorWithRim += vec3(1.0, 0.98, 0.95) * innerGlow;

  // === QUICK WIN #1: Specular glint ===
  // Moving highlight that sparkles as shards rotate
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
  vec3 reflectDir = reflect(-lightDir, vNormal);
  float spec = pow(max(dot(reflectDir, viewDir), 0.0), 48.0);
  // Add time-based shimmer for extra life
  float shimmer = 0.8 + 0.2 * sin(time * 2.0 + depth * 3.0);
  colorWithRim += vec3(1.0, 0.98, 0.95) * spec * 0.18 * shimmer;

  // Slight desaturation toward edges for atmospheric feel
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.85 + facingBoost);

  // === QUICK WIN #3: Depth-based atmospheric fade ===
  // Distant shards slightly fade/desaturate
  vec3 fogColor = vec3(0.96, 0.94, 0.91); // Warm atmospheric color
  float fogFactor = smoothstep(4.0, 10.0, depth);
  finalColor = mix(finalColor, fogColor, fogFactor * 0.3);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface FrostedGlassMaterialProps {
  /** Base color for non-refraction fallback @default '#ffffff' */
  color?: string;
}

export function FrostedGlassMaterial({ color = '#ffffff' }: FrostedGlassMaterialProps) {
  // Simple placeholder material - actual rendering uses RefractionPipeline shaders
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        vertexColors: true, // Enable per-vertex colors
      }),
    [color],
  );

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
}

/**
 * Creates an enhanced frosted glass shader material for icosahedral shards
 *
 * Returns a ShaderMaterial with:
 * - Fresnel rim glow (soft edge lighting)
 * - Breathing luminosity (synced brightness pulse)
 * - Per-vertex color support
 */
export function createFrostedGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
    },
    vertexShader: shardVertexShader,
    fragmentShader: shardFragmentShader,
    vertexColors: true,
    side: THREE.FrontSide,
  });
}
