/**
 * HolographicShardMaterial - Ethereal holographic shader for space-themed shards
 *
 * Creates a sci-fi holographic look inspired by:
 * - Anderson Mancini's threejs-vanilla-holographic-material
 * - Three.js Journey hologram shader tutorials
 *
 * Features:
 * - Animated horizontal scanlines
 * - Fresnel-based iridescent rim glow
 * - Semi-transparent with additive blending for ethereal feel
 * - Color shifting based on viewing angle
 * - Breathing-synchronized brightness pulse
 * - Per-instance mood colors
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

// Fragment shader - holographic scanlines + fresnel iridescence
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // === FRESNEL FOR IRIDESCENT RIM ===
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);

  // === SCANLINES (holographic effect) ===
  // Horizontal scanlines that move slowly upward
  float scanlineFreq = 40.0; // Number of scanlines
  float scanlineSpeed = time * 0.5; // Slow upward movement
  float scanline = sin((vWorldPosition.y * scanlineFreq + scanlineSpeed) * 3.14159) * 0.5 + 0.5;
  // Softer scanlines - not too harsh
  scanline = smoothstep(0.3, 0.7, scanline) * 0.3 + 0.7;

  // === IRIDESCENT COLOR SHIFT ===
  // Shift hue slightly based on viewing angle for rainbow effect
  float hueShift = fresnel * 0.15;
  vec3 shiftedColor = vColor;
  // Simple hue rotation approximation
  shiftedColor.r = vColor.r * cos(hueShift) - vColor.g * sin(hueShift) * 0.3;
  shiftedColor.g = vColor.g * cos(hueShift * 0.5) + vColor.b * sin(hueShift) * 0.2;
  shiftedColor.b = vColor.b + fresnel * 0.2; // Boost blue at edges

  // === BREATHING LUMINOSITY ===
  float breathGlow = 0.8 + breathPhase * 0.4;

  // === HOLOGRAPHIC BASE COLOR ===
  vec3 baseColor = shiftedColor * breathGlow * scanline;

  // === FRESNEL RIM GLOW ===
  // Cool white-blue rim for ethereal edge
  vec3 rimColor = mix(vec3(0.7, 0.85, 1.0), vColor, 0.3);
  vec3 colorWithRim = mix(baseColor, rimColor, fresnel * 0.6);

  // === INNER CORE GLOW ===
  // Subtle glow from center, stronger on exhale
  float coreGlow = (1.0 - fresnel) * 0.15 * (0.8 + breathPhase * 0.4);
  colorWithRim += vColor * coreGlow;

  // === HOLOGRAPHIC SHIMMER ===
  // Subtle flicker based on time and position
  float shimmer = sin(time * 3.0 + vWorldPosition.x * 10.0 + vWorldPosition.z * 10.0) * 0.05 + 1.0;
  colorWithRim *= shimmer;

  // === ALPHA FOR TRANSLUCENCY ===
  // More transparent at edges (fresnel), more opaque at center
  float alpha = 0.6 + (1.0 - fresnel) * 0.3 + breathPhase * 0.1;

  // Boost brightness for additive-like feel (without actual additive blend)
  colorWithRim *= 1.2;

  gl_FragColor = vec4(colorWithRim, alpha);
}
`;

/**
 * Creates an ethereal holographic shader material for space-themed shards
 *
 * Returns a ShaderMaterial with:
 * - Animated scanlines for holographic effect
 * - Fresnel-based iridescent rim glow
 * - Semi-transparent for ethereal feel
 * - Breathing-synchronized brightness
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
    depthWrite: false, // For proper transparency sorting
    side: THREE.DoubleSide, // Show both sides for holographic feel
  });
}
