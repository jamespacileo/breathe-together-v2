/**
 * BubbleGlassMaterial - Playful candy/bubble glass shader for icosahedral shards
 *
 * Features high-saturation playful aesthetic:
 * - 70% mood color saturation (very visible)
 * - Thick bright rim glow
 * - Simple transparency (not physically accurate)
 * - Fun, playful look for casual meditation
 *
 * Performance: Single-pass shader compatible with InstancedMesh
 */

import * as THREE from 'three';

const bubbleVertexShader = /* glsl */ `
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
  vFresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);

  gl_Position = projectionMatrix * mvPosition;
}
`;

const bubbleFragmentShader = /* glsl */ `
uniform float breathPhase;
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vFresnel;

void main() {
  // High saturation mood color (70% mix)
  vec3 candyColor = mix(vec3(1.0), vColor, 0.7);

  // Brighten colors for candy effect
  vec3 boostedColor = candyColor * 1.3;

  // Thick bright rim glow
  vec3 rimGlow = vColor * vFresnel * 0.8;

  // Simple transparency with fresnel boost
  float alpha = mix(0.15, 0.55, vFresnel);

  // Breathing pulse with more intensity
  float breathHighlight = 1.0 + breathPhase * 0.15;

  // Combine candy color with rim glow
  vec3 finalColor = (boostedColor + rimGlow) * breathHighlight;

  // Subtle shimmer effect using time
  float shimmer = sin(time * 3.0 + gl_FragCoord.x * 0.1 + gl_FragCoord.y * 0.1) * 0.05 + 1.0;
  finalColor *= shimmer;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

/**
 * Create bubble/candy glass material with high saturation
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 */
export function createBubbleGlassMaterial(instanced = true): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
    },
    vertexShader: bubbleVertexShader,
    fragmentShader: bubbleFragmentShader,
    defines: instanced ? { USE_INSTANCING_COLOR: '' } : {},
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}
