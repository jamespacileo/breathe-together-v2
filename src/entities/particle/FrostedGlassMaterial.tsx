/**
 * FrostedGlassMaterial - Enhanced shader material for icosahedral shards
 *
 * Features subtle visual effects that users won't consciously notice but will feel:
 * - Soft fresnel rim glow (edge lighting like the globe)
 * - Breathing luminosity pulse (subtle brightness variation)
 * - Per-instance mood colors with gentle saturation boost
 * - Subtle inner glow on exhale phase
 *
 * For the refraction effect to work:
 * 1. Mesh must have userData.useRefraction = true
 * 2. InstancedMesh must have instanceColor attribute set
 * 3. RefractionPipeline must be present in the scene tree
 *
 * Performance: Uses InstancedMesh for single draw call (300+ particles = 1 draw call)
 */

import * as THREE from 'three';

// Vertex shader - passes normals and instance colors to fragment
// Uses THREE.js built-in instanceColor attribute for per-instance colors
const shardVertexShader = `
#include <common>
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  #ifdef USE_INSTANCING
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 transformedNormal = mat3(normalMatrix) * mat3(instanceMatrix) * normal;
  #else
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 transformedNormal = normalMatrix * normal;
  #endif

  vNormal = normalize(transformedNormal);

  // Use instance color from InstancedMesh (set via setColorAt)
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.85, 0.75, 0.65); // Fallback warm neutral
  #endif

  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - transparent gem with fresnel rim + breathing luminosity
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel rim effect - stronger for gem-like edges
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

  // Breathing luminosity pulse - subtle brightness shift
  float breathLuminosity = 1.0 + breathPhase * 0.15;

  // Gem-like transparency: very transparent for atmospheric integration
  // Base alpha varies from 0.20 (center) to 0.55 (edges) via fresnel
  float baseAlpha = mix(0.20, 0.55, fresnel);

  // Apply mood color as tint (heavily reduced for gem transparency)
  vec3 gemTint = vColor * 0.4; // Reduced from 0.7 to 0.4 for lighter tint

  // Neon mood-colored rim glow (per-instance, not uniform golden)
  // NEON_MOOD_PALETTE already has 55-60% saturation - no amplification needed
  vec3 neonRimColor = vColor; // Use NEON_MOOD_PALETTE colors directly (no amplification to prevent clipping)
  vec3 colorWithRim = mix(gemTint, neonRimColor, fresnel * 0.35); // Reduced from 0.55 to prevent washout

  // Subtle additive glow for edge accent (not overpowering)
  // Quadratic falloff (fresnel²) with reduced strength to maintain transparency
  float neonGlow = fresnel * fresnel * 0.08; // Reduced from 0.25 to prevent brightness clipping
  colorWithRim += neonRimColor * neonGlow;

  // Inner luminance - subtle gem glow from within
  float innerGlow = (1.0 - fresnel) * 0.05 * breathLuminosity; // Reduced from 0.15 to preserve transparency
  vec3 glowColor = mix(vColor, vec3(1.0, 1.0, 1.0), 0.5); // Whitened glow
  colorWithRim += glowColor * innerGlow;

  // Atmospheric integration - very slight desaturation for cohesion
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.95);

  // Vibrant glass - balanced brightness for scene integration
  // Moderate brightness to blend with atmospheric scene
  vec3 finalColorBrightened = finalColor * 0.75; // Balanced (was 0.92 too bright, 0.4 too dark)

  // Output with transparency for gem-like appearance
  gl_FragColor = vec4(finalColorBrightened, baseAlpha * breathLuminosity);
}
`;

/**
 * Creates an enhanced frosted glass shader material for icosahedral shards
 *
 * Returns a ShaderMaterial with:
 * - Fresnel rim glow (soft edge lighting)
 * - Breathing luminosity (synced brightness pulse)
 * - Per-instance color support (via USE_INSTANCING_COLOR define)
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 */
export function createFrostedGlassMaterial(instanced = true): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
    },
    vertexShader: shardVertexShader,
    fragmentShader: shardFragmentShader,
    defines: instanced ? { USE_INSTANCING_COLOR: '' } : {},
    side: THREE.FrontSide, // Icosahedra are convex - backfaces never visible. Saves 50% fragment processing
    transparent: true, // Enable alpha blending for gem transparency
    depthWrite: true, // CRITICAL FIX: Enable depth writes to fix 1 FPS performance (safe for convex front-face-only objects)
    depthTest: true, // Enable depth testing to cull occluded fragments
    blending: THREE.NormalBlending, // Standard transparency blending
  });
}
