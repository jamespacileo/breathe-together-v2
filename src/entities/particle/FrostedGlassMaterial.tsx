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

// Fragment shader - glass crystal with solid edges and transparent center
const shardFragmentShader = `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel for edge detection - edges face away from camera
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);

  // Breathing luminosity pulse - subtle brightness shift
  float breathLuminosity = 1.0 + breathPhase * 0.15;

  // === GLASS TRANSPARENCY ===
  // Edges are solid, center is transparent (crystal glass effect)
  // High fresnel = edge = more opaque
  // Low fresnel = center = more transparent
  float edgeOpacity = fresnel * 0.9 + 0.1; // Edges: 0.1-1.0
  float centerTransparency = 1.0 - fresnel; // Centers more transparent

  // Base opacity: solid at edges, glass-like in center
  float baseAlpha = mix(0.15, 0.95, fresnel);

  // Add slight inner glow that pulses with breath
  float innerGlow = centerTransparency * 0.3 * (1.0 + breathPhase * 0.5);

  // === COLOR ===
  // Apply mood color with ethereal luminosity
  vec3 baseColor = vColor * breathLuminosity;

  // Bright white edge highlight (crystal refraction look)
  vec3 edgeColor = vec3(1.0, 0.98, 0.96);
  vec3 colorWithEdge = mix(baseColor, edgeColor, fresnel * 0.6);

  // Subtle inner color glow
  vec3 glowColor = vColor * 1.3;
  colorWithEdge += glowColor * innerGlow * 0.4;

  // Add subtle iridescence based on normal direction
  float iridescence = sin(dot(vNormal, vec3(1.0, 0.5, 0.2)) * 3.0 + time * 0.5) * 0.5 + 0.5;
  colorWithEdge += vec3(0.1, 0.05, 0.15) * iridescence * fresnel * 0.3;

  // Slight color shift for depth - warmer at edges
  vec3 warmShift = vec3(0.02, 0.01, -0.01);
  colorWithEdge += warmShift * fresnel;

  // Final alpha: solid edges, transparent center
  float alpha = baseAlpha;

  // Boost overall visibility slightly
  alpha = clamp(alpha * 1.1, 0.0, 1.0);

  gl_FragColor = vec4(colorWithEdge, alpha);
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
    transparent: true,
    depthWrite: false, // Required for proper transparency sorting
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide, // Show both sides for glass effect
  });
}
