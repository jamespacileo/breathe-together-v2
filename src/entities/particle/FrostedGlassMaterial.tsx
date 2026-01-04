/**
 * KurzgesagtCellMaterial - Vibrant cell-like shader for space-themed shards
 *
 * Inspired by Kurzgesagt's "Immune" book illustrations:
 * - Solid vibrant colors (not muddy or desaturated)
 * - Subtle fresnel rim glow
 * - Soft inner gradients
 * - Breathing-synchronized brightness
 *
 * IMPORTANT: This shader preserves the input colors!
 * Previous version was muddying colors with excessive hue shifting and scanlines.
 *
 * Performance: Uses InstancedMesh for single draw call (300+ particles = 1 draw call)
 */

import * as THREE from 'three';

// Vertex shader - passes position, normals and instance colors to fragment
// Supports both regular meshes and InstancedMesh
const shardVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying vec3 vWorldPosition;

void main() {
  // Use instance color from InstancedMesh (set via setColorAt)
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.4, 0.7, 0.9); // Fallback cool blue
  #endif

  // Handle instancing for transforms
  #ifdef USE_INSTANCING
    vec3 transformedNormal = mat3(normalMatrix) * mat3(instanceMatrix) * normal;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vec3 transformedNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
  #endif

  vNormal = normalize(transformedNormal);
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = worldPos.xyz;

  #ifdef USE_INSTANCING
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  #else
    gl_Position = projectionMatrix * mvPosition;
  #endif
}
`;

// Fragment shader - Kurzgesagt cell look: vibrant colors with subtle rim glow
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // === FRESNEL FOR SOFT RIM ===
  // Subtle edge detection - NOT for color shifting, just for rim highlight
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

  // === PRESERVE THE ORIGINAL VIBRANT COLOR ===
  // No hue shifting, no scanlines - just the pure Kurzgesagt color
  vec3 baseColor = vColor;

  // === BREATHING LUMINOSITY ===
  // Subtle brightness pulse synced to breath (0.9 to 1.1 range)
  float breathGlow = 0.9 + breathPhase * 0.2;
  baseColor *= breathGlow;

  // === SOFT INNER GRADIENT ===
  // Slightly brighter center, dimmer edges (opposite of fresnel)
  float innerGlow = 1.0 - fresnel * 0.15;
  baseColor *= innerGlow;

  // === SUBTLE RIM HIGHLIGHT ===
  // Soft white-ish rim for depth (Kurzgesagt style edge highlight)
  vec3 rimColor = vColor * 1.3 + vec3(0.15); // Lighter version of base color
  vec3 finalColor = mix(baseColor, rimColor, fresnel * 0.35);

  // === SUBTLE SHIMMER (very subtle) ===
  // Minimal variation to keep it alive without muddying
  float shimmer = sin(time * 1.5 + vWorldPosition.x * 5.0 + vWorldPosition.z * 5.0) * 0.03 + 1.0;
  finalColor *= shimmer;

  // === OPACITY ===
  // Mostly opaque like Kurzgesagt cells, slight transparency at edges
  float alpha = 0.85 + (1.0 - fresnel) * 0.15;

  // Clamp to prevent over-saturation
  finalColor = clamp(finalColor, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

/**
 * Creates a vibrant Kurzgesagt-style cell material for shards
 *
 * Returns a ShaderMaterial with:
 * - Preserved vibrant input colors (no muddy transformations)
 * - Subtle fresnel rim highlight
 * - Breathing-synchronized brightness
 * - Mostly opaque with slight edge transparency
 * - Per-instance color support
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
    transparent: true,
    depthWrite: true, // Enable depth write for solid-ish appearance
    side: THREE.FrontSide, // Only front side for cleaner look
  });
}
