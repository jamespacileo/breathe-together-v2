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

// Fragment shader - fresnel rim + breathing luminosity + opacity fade
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;
uniform float opacity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel rim effect - soft edge glow
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

  // Breathing luminosity pulse - subtle brightness shift
  // Peak brightness during hold phases (phase 0.25-0.5 and 0.75-1.0)
  float breathLuminosity = 1.0 + breathPhase * 0.12;

  // Subtle saturation boost based on viewing angle
  // Faces pointing toward camera are slightly more saturated
  float facingBoost = max(dot(vNormal, viewDir), 0.0) * 0.08;

  // Apply mood color with luminosity and saturation
  vec3 baseColor = vColor * breathLuminosity;

  // Mix in a warm white rim glow (like the globe)
  vec3 rimColor = vec3(0.98, 0.96, 0.94); // Soft warm white
  vec3 colorWithRim = mix(baseColor, rimColor, fresnel * 0.25);

  // Subtle inner luminance - very gentle glow from within
  float innerGlow = (1.0 - fresnel) * 0.05 * (1.0 + breathPhase * 0.3);
  colorWithRim += vec3(1.0, 0.98, 0.95) * innerGlow;

  // Slight desaturation toward edges for atmospheric feel
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.85 + facingBoost);

  gl_FragColor = vec4(finalColor, opacity);
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
 * - Opacity control for fade-in animations
 */
export function createFrostedGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      opacity: { value: 1 },
    },
    vertexShader: shardVertexShader,
    fragmentShader: shardFragmentShader,
    vertexColors: true,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: true,
  });
}
