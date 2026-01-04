/**
 * Shared holographic materials for HolographicBreathUI components
 *
 * Provides consistent visual style across all holographic UI elements:
 * - Fresnel edge glow
 * - Breath-synchronized opacity
 * - Soft pastel color palette
 */

import * as THREE from 'three';

/**
 * Color palette for holographic UI elements
 * Matches the Monument Valley aesthetic
 */
export const HOLO_COLORS = {
  // Phase colors
  INHALE: '#7ec8c8', // Teal
  HOLD: '#e8e4e0', // Soft white
  EXHALE: '#d4a574', // Gold

  // Accent colors
  GLOW: '#7ec5c4', // Teal glow
  BASE: '#f8f6f4', // Warm white base

  // Ring colors with transparency
  RING_INHALE: '#7ec8c8',
  RING_HOLD: '#c9b896',
  RING_EXHALE: '#d4a574',
} as const;

/**
 * Holographic ring vertex shader
 */
export const ringVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Holographic ring fragment shader with breath sync and active state
 */
export const ringFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uBreathPhase;
uniform float uIsActive;
uniform float uProgress;
uniform float uFresnelPower;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  // Fresnel effect for edge glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uFresnelPower);

  // Subtle pulse when active
  float pulse = uIsActive > 0.5 ? 0.9 + 0.1 * sin(uTime * 3.0) : 1.0;

  // Progress fill effect (angular)
  float angle = atan(vUv.y - 0.5, vUv.x - 0.5) / (2.0 * 3.14159) + 0.5;
  float progressMask = smoothstep(uProgress - 0.02, uProgress, angle);

  // Base opacity with active boost
  float activeBoost = uIsActive * 0.4;
  float baseAlpha = (uOpacity + activeBoost) * pulse;

  // Combine with fresnel glow
  float alpha = baseAlpha + fresnel * 0.2 * uIsActive;

  // Progress visualization (brighter where filled)
  vec3 color = uColor;
  if (uIsActive > 0.5 && uProgress > 0.0) {
    float fillBrightness = progressMask * 0.3;
    color = mix(color, vec3(1.0), fillBrightness);
  }

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Glyph holographic vertex shader
 */
export const glyphVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Glyph holographic fragment shader
 */
export const glyphFragmentShader = `
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uOpacity;
uniform float uIsActive;
uniform float uFresnelPower;
uniform float uTime;
uniform float uBreathPhase;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Fresnel effect for edge glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uFresnelPower);

  // Pulse animation when active
  float pulse = uIsActive > 0.5 ? 0.85 + 0.15 * sin(uTime * 2.5) : 1.0;

  // Scale boost when active
  float activeBoost = uIsActive * 0.5;

  // Mix base color with glow at edges
  vec3 color = mix(uColor, uGlowColor, fresnel * 0.6 + uIsActive * 0.3);

  // Final opacity
  float alpha = (uOpacity + activeBoost) * pulse + fresnel * 0.15;

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Wave band vertex shader
 */
export const waveVertexShader = `
uniform float uBreathPhase;
uniform float uWaveOffset;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vY;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vY = position.y;

  // Subtle vertical wave displacement
  vec3 pos = position;
  float wave = sin(uBreathPhase * 3.14159 * 2.0 + uWaveOffset) * 0.02;
  pos.y += wave;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Wave band fragment shader
 */
export const waveFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uBreathPhase;
uniform float uPhaseType;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vY;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Breathing modulation
  float breathMod = 0.7 + uBreathPhase * 0.3;

  // Horizontal stripe pattern
  float stripe = smoothstep(0.3, 0.5, fract(vY * 20.0 + uTime * 0.1));

  // Base opacity with breathing
  float alpha = uOpacity * breathMod * (0.5 + stripe * 0.5) + fresnel * 0.1;

  gl_FragColor = vec4(uColor, alpha);
}
`;

/**
 * Create a holographic ring material
 */
export function createRingMaterial(color: string, isActive = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.15 },
      uBreathPhase: { value: 0 },
      uIsActive: { value: isActive ? 1.0 : 0.0 },
      uProgress: { value: 0 },
      uFresnelPower: { value: 2.0 },
      uTime: { value: 0 },
    },
    vertexShader: ringVertexShader,
    fragmentShader: ringFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/**
 * Create a holographic glyph material
 */
export function createGlyphMaterial(
  color: string,
  glowColor: string = HOLO_COLORS.GLOW,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uGlowColor: { value: new THREE.Color(glowColor) },
      uOpacity: { value: 0.7 },
      uIsActive: { value: 0.0 },
      uFresnelPower: { value: 2.0 },
      uTime: { value: 0 },
      uBreathPhase: { value: 0 },
    },
    vertexShader: glyphVertexShader,
    fragmentShader: glyphFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
