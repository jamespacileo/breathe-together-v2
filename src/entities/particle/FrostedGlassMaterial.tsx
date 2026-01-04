/**
 * KurzgesagtCellMaterial - Vibrant cell-like shader for space-themed shards
 *
 * Inspired by Kurzgesagt's "Immune" book illustrations:
 * - Solid vibrant colors with flat shading
 * - Soft radial gradient from bright center to slightly darker edges
 * - Crisp highlight rim for depth (Kurzgesagt's signature cell edge)
 * - Subtle faceted shading for geometric feel
 *
 * CRITICAL: Uses Three.js colorspace_fragment for proper sRGB output!
 * Without this, colors appear washed out/desaturated due to linear->sRGB conversion.
 *
 * References:
 * - https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
 * - https://threejs.org/manual/en/color-management.html
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
varying vec3 vLocalPosition;

void main() {
  // Use instance color from InstancedMesh (set via setColorAt)
  // NOTE: instanceColor is already in linear-sRGB space (THREE.Color auto-converts)
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.16, 0.71, 0.96); // Fallback: Kurzgesagt presence blue (linear approx)
  #endif

  // Store local position for faceted shading
  vLocalPosition = position;

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

// Fragment shader - Kurzgesagt cell look with proper sRGB output
// Key: flat vibrant base + radial gradient + crisp rim highlight
const shardFragmentShader = `
#include <common>
#include <color_pars_fragment>

uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // === FRESNEL FOR EDGE DETECTION ===
  float NdotV = max(dot(normal, viewDir), 0.0);
  float fresnel = pow(1.0 - NdotV, 3.0);

  // === KURZGESAGT FLAT SHADING BASE ===
  // Start with the pure vibrant color (already in linear space from THREE.Color)
  vec3 baseColor = vColor;

  // === FACETED SHADING ===
  // Subtle variation based on face normal for geometric feel
  // This creates the low-poly look without complex lighting
  float facetShade = 0.92 + normal.y * 0.08; // Faces pointing up are slightly brighter
  baseColor *= facetShade;

  // === RADIAL GRADIENT (Kurzgesagt cell style) ===
  // Cells have brighter centers, slightly darker toward edges
  // This creates depth without complex lighting
  float centerBright = 1.0 - fresnel * 0.12;
  baseColor *= centerBright;

  // === BREATHING GLOW ===
  // Subtle luminosity pulse synced to breath (0.95 to 1.05 range - very subtle)
  float breathGlow = 0.95 + breathPhase * 0.1;
  baseColor *= breathGlow;

  // === CRISP RIM HIGHLIGHT (Kurzgesagt signature) ===
  // Cells have a bright edge highlight that makes them pop
  // Use a lighter, more saturated version of the base color
  vec3 rimColor = vColor * 1.4 + vec3(0.2); // Brighter + slight white addition
  rimColor = clamp(rimColor, 0.0, 1.5); // Allow slight HDR for bloom

  // Sharp rim blend - Kurzgesagt uses distinct edges, not soft gradients
  float rimMask = smoothstep(0.3, 0.7, fresnel);
  vec3 finalColor = mix(baseColor, rimColor, rimMask * 0.5);

  // === SUBTLE SPECULAR HIGHLIGHT ===
  // A tiny bright spot for that polished cell look
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3)); // Sun direction
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
  finalColor += vColor * spec * 0.15;

  // === OPACITY ===
  // Fully opaque for solid cell look (Kurzgesagt cells are solid, not transparent)
  float alpha = 0.95;

  // Output with proper color space conversion
  // This is CRITICAL - without it, colors appear washed out!
  gl_FragColor = vec4(finalColor, alpha);

  // Convert from linear working space to sRGB output space
  #include <colorspace_fragment>
}
`;

/**
 * Creates a vibrant Kurzgesagt-style cell material for shards
 *
 * Key features:
 * - PROPER sRGB color output (fixes washed-out colors)
 * - Flat shading with radial gradient (brighter center)
 * - Crisp rim highlights (Kurzgesagt signature edge glow)
 * - Subtle faceted shading for geometric look
 * - Breathing-synchronized brightness
 *
 * The material uses Three.js colorspace_fragment to properly convert
 * from linear working space to sRGB display space. Without this,
 * colors appear desaturated/washed out.
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
    depthWrite: true,
    side: THREE.FrontSide,
  });
}
