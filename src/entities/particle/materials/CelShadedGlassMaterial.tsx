/**
 * CelShadedGlassMaterial - Stylized toon-band glass shader for icosahedral shards
 *
 * Features cel-shaded aesthetic with distinct visibility bands:
 * - Stepped fresnel (3-4 distinct bands) for cartoon look
 * - Clear mood color visibility in each band
 * - Hard-edged transitions for Monument Valley/Journey aesthetic
 * - Breathing luminosity pulse synced to breath cycle
 *
 * Performance: Single-pass shader compatible with InstancedMesh
 */

import * as THREE from 'three';

const celVertexShader = /* glsl */ `
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

  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(1.0);
  #endif

  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const celFragmentShader = /* glsl */ `
uniform float breathPhase;
uniform float time;
uniform float bandCount;  // Number of cel-shading bands (3-4)

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // Raw fresnel (0-1)
  float rawFresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);

  // Step fresnel into discrete bands for cel-shading
  float steppedFresnel = floor(rawFresnel * bandCount) / bandCount;

  // Define 3 distinct bands: center, mid, edge
  // Band 0: 0.00-0.33 (center, very transparent)
  // Band 1: 0.33-0.66 (mid, medium opacity)
  // Band 2: 0.66-1.00 (edge, high visibility)

  float band = steppedFresnel;

  // Transparency per band
  float alpha;
  if (band < 0.34) {
    alpha = 0.05;  // Very transparent center
  } else if (band < 0.67) {
    alpha = 0.25;  // Medium transparency
  } else {
    alpha = 0.65;  // High visibility edge
  }

  // Color intensity per band (mood color mix)
  float colorMix;
  if (band < 0.34) {
    colorMix = 0.08;  // Subtle color center
  } else if (band < 0.67) {
    colorMix = 0.35;  // Medium color
  } else {
    colorMix = 0.75;  // Strong color at edges
  }

  // Apply mood color tint
  vec3 bandColor = mix(vec3(1.0), vColor, colorMix);

  // Breathing luminosity pulse
  float breathHighlight = 1.0 + breathPhase * 0.12;

  // Edge glow for band definition
  vec3 edgeGlow = vColor * step(0.66, band) * 0.4;

  // Final color
  vec3 finalColor = (bandColor + edgeGlow) * breathHighlight;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

/**
 * Create cel-shaded glass material with distinct toon bands
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 * @param bandCount - Number of cel-shading bands (default: 3)
 */
export function createCelShadedGlassMaterial(
  instanced = true,
  bandCount = 3.0,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      bandCount: { value: bandCount },
    },
    vertexShader: celVertexShader,
    fragmentShader: celFragmentShader,
    defines: instanced ? { USE_INSTANCING_COLOR: '' } : {},
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}
