/**
 * ChromaticGlassMaterial - Prism-effect glass with RGB separation
 *
 * Features chromatic dispersion for premium look:
 * - RGB channel separation at edges (like real prism)
 * - Rainbow edge highlights
 * - Subtle mood color in center
 * - Physically-inspired but stylized
 *
 * Based on Context7 caustics example approach
 * Performance: Single-pass shader compatible with InstancedMesh
 */

import * as THREE from 'three';

const chromaticVertexShader = /* glsl */ `
#include <common>
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vFresnel;

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

  // Pre-compute fresnel
  vec3 viewDir = normalize(vViewPosition);
  vFresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

  gl_Position = projectionMatrix * mvPosition;
}
`;

const chromaticFragmentShader = /* glsl */ `
uniform float breathPhase;
uniform float time;
uniform float chromaticStrength;  // How much RGB separation (0-1)

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vFresnel;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // Chromatic aberration - RGB channels separate at edges
  // Offset increases with fresnel (more separation at edges)
  float chromaticOffset = vFresnel * chromaticStrength * 0.15;

  // Simulate refraction by offsetting RGB channels
  // Red shifts one way, blue shifts the other, green stays centered
  float r = mix(1.0, vColor.r, 0.2 - chromaticOffset);
  float g = mix(1.0, vColor.g, 0.2);
  float b = mix(1.0, vColor.b, 0.2 + chromaticOffset);

  vec3 chromaticColor = vec3(r, g, b);

  // Add rainbow edge glow from chromatic dispersion
  vec3 rainbowEdge = vec3(
    vFresnel * (0.8 + 0.2 * sin(time * 0.5)),
    vFresnel * (0.6 + 0.2 * sin(time * 0.5 + 2.0)),
    vFresnel * (0.9 + 0.2 * sin(time * 0.5 + 4.0))
  ) * chromaticStrength * 0.3;

  // Center has subtle mood color
  vec3 centerColor = mix(vec3(1.0), vColor, 0.15);

  // Blend center and chromatic edge
  vec3 blendedColor = mix(centerColor, chromaticColor, vFresnel * 0.6);

  // Add rainbow edge
  vec3 finalColor = blendedColor + rainbowEdge;

  // Breathing pulse
  float breathHighlight = 1.0 + breathPhase * 0.1;
  finalColor *= breathHighlight;

  // Transparency with fresnel
  float alpha = mix(0.08, 0.45, vFresnel);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

/**
 * Create chromatic dispersion glass material
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 * @param chromaticStrength - RGB separation strength 0-1 (default: 0.6)
 */
export function createChromaticGlassMaterial(
  instanced = true,
  chromaticStrength = 0.6,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      chromaticStrength: { value: chromaticStrength },
    },
    vertexShader: chromaticVertexShader,
    fragmentShader: chromaticFragmentShader,
    defines: instanced ? { USE_INSTANCING_COLOR: '' } : {},
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}
