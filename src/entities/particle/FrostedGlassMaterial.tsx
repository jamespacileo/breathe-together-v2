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
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Use instance color from InstancedMesh (set via setColorAt)
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.85, 0.75, 0.65); // Fallback warm neutral
  #endif

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - fresnel rim + breathing luminosity
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

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

  // Mix in golden constellation rim glow (matches stars)
  vec3 rimColor = vec3(1.0, 0.86, 0.42); // Golden #ffdb6b
  vec3 colorWithRim = mix(baseColor, rimColor, fresnel * 0.25);

  // Subtle inner luminance - very gentle glow from within
  float innerGlow = (1.0 - fresnel) * 0.05 * (1.0 + breathPhase * 0.3);
  colorWithRim += vec3(1.0, 0.98, 0.95) * innerGlow;

  // Slight desaturation toward edges for atmospheric feel
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.85 + facingBoost);

  gl_FragColor = vec4(finalColor, 1.0);
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
  });
}
