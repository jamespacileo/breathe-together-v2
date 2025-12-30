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

// Fragment shader - fresnel rim + breathing luminosity
// Harmonized with globe's visual style (muted earth tones, matching rim colors)
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel rim effect - matched to globe's fresnel falloff (pow 4.0 → 3.5 for shards)
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.5);

  // Breathing luminosity pulse - subtle brightness shift
  float breathLuminosity = 1.0 + breathPhase * 0.10;

  // Subtle saturation boost based on viewing angle
  float facingBoost = max(dot(vNormal, viewDir), 0.0) * 0.06;

  // Apply mood color with luminosity
  vec3 baseColor = vColor * breathLuminosity;

  // Warm earth-tone tint (matches globe's palette: cream/peach undertone)
  // Subtle 8% blend toward globe's warm cream color
  vec3 earthTint = vec3(0.94, 0.88, 0.82); // Warm cream from globe
  baseColor = mix(baseColor, earthTint, 0.08);

  // Rim color matched exactly to globe's rim: vec3(0.94, 0.90, 0.86)
  vec3 rimColor = vec3(0.94, 0.90, 0.86); // Globe's muted warm cream
  vec3 colorWithRim = mix(baseColor, rimColor, fresnel * 0.30);

  // Subtle atmosphere hint at edges - warm peach from globe's inner atmosphere
  vec3 atmosphereHint = vec3(0.97, 0.82, 0.66); // Globe's #f8d0a8 atmosphere
  colorWithRim = mix(colorWithRim, atmosphereHint, fresnel * 0.12);

  // Subtle inner luminance - warm glow from within (matches globe's glow #efe5da)
  float innerGlow = (1.0 - fresnel) * 0.04 * (1.0 + breathPhase * 0.25);
  colorWithRim += vec3(0.94, 0.90, 0.85) * innerGlow;

  // Slight desaturation toward edges for atmospheric cohesion
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.82 + facingBoost);

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
