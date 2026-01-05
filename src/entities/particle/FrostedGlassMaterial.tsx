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

  // Gem-like transparency: much more transparent for gem appearance
  // Base alpha varies from 0.15 (center) to 0.45 (edges) via fresnel
  float baseAlpha = mix(0.15, 0.45, fresnel);

  // Apply mood color as tint (heavily reduced for gem transparency)
  vec3 gemTint = vColor * 0.4; // Reduced from 0.7 to 0.4 for lighter tint

  // Neon mood-colored rim glow (per-instance, not uniform golden)
  // Amplify vColor saturation for neon effect (2.2x boost creates ~55-60% saturation from NEON_MOOD_PALETTE)
  vec3 neonRimColor = vColor * 2.2; // Amplifies input neon colors for vibrant edges
  vec3 colorWithRim = mix(gemTint, neonRimColor, fresnel * 0.55); // Increased from 0.4 for stronger rim

  // Additive neon glow component for edge brilliance
  // Quadratic falloff (fresnel²) creates sharp edge glow without washing out center
  float neonGlow = fresnel * fresnel * 0.25;
  colorWithRim += neonRimColor * neonGlow;

  // Inner luminance - gem glow from within (stronger than before)
  float innerGlow = (1.0 - fresnel) * 0.15 * breathLuminosity;
  vec3 glowColor = mix(vColor, vec3(1.0, 1.0, 1.0), 0.5); // Whitened glow
  colorWithRim += glowColor * innerGlow;

  // Atmospheric integration - very slight desaturation for cohesion
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.90);

  // Output with transparency for gem-like appearance
  gl_FragColor = vec4(finalColor, baseAlpha * breathLuminosity);
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
