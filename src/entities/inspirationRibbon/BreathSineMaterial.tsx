/**
 * BreathSineMaterial - Custom shader material for the inspiration ribbon
 *
 * Features:
 * - Sine wave vertex distortion (organic rippling motion)
 * - Breath-synced opacity (fade in/out with breathing phases)
 * - Horizontal texture scrolling
 * - Frosted glass aesthetic matching particle shards
 *
 * Inspired by: https://cydstumpel.nl/ ribbon banner effect
 */

import * as THREE from 'three';

// Vertex shader with sine wave displacement
const vertexShader = `
uniform float time;
uniform float breathPhase;
uniform float waveAmplitude;
uniform float waveFrequency;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  // Sine wave displacement along the height (Y axis in local space)
  // Creates organic rippling effect
  float waveOffset = uv.x * waveFrequency * 6.28318; // 2π for full cycles
  float timeOffset = time * 0.5;

  // Multi-frequency waves for more organic feel
  float wave1 = sin(waveOffset + timeOffset) * waveAmplitude;
  float wave2 = sin(waveOffset * 2.0 - timeOffset * 0.7) * waveAmplitude * 0.3;
  float wave3 = sin(waveOffset * 0.5 + timeOffset * 0.3) * waveAmplitude * 0.5;

  // Combine waves with breath modulation
  // More wave movement during exhale, calmer during inhale
  float breathWaveModulation = 0.5 + (1.0 - breathPhase) * 0.5;
  float totalWave = (wave1 + wave2 + wave3) * breathWaveModulation;

  // Apply displacement radially outward (perpendicular to cylinder surface)
  vec3 displacedPosition = position;
  displacedPosition.y += totalWave;

  vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader with frosted glass aesthetic
const fragmentShader = `
uniform float opacity;
uniform float breathPhase;
uniform float time;
uniform vec3 baseColor;
uniform vec3 glowColor;
uniform sampler2D map;
uniform float textureOffset;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Sample texture with horizontal scrolling
  vec2 scrolledUv = vec2(vUv.x + textureOffset, vUv.y);
  vec4 texColor = texture2D(map, scrolledUv);

  // Fresnel rim effect for soft edge glow
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);

  // Breathing luminosity pulse
  float breathLuminosity = 1.0 + breathPhase * 0.15;

  // Mix base color with texture
  // Text areas (high alpha) show text color, background shows base color
  vec3 textColor = mix(baseColor, glowColor, texColor.a * 0.8);
  textColor *= breathLuminosity;

  // Add rim glow
  vec3 rimColor = vec3(0.98, 0.96, 0.94);
  vec3 finalColor = mix(textColor, rimColor, fresnel * 0.2);

  // Final opacity combines base opacity, texture alpha, and breath
  float textOpacity = texColor.a * 0.9 + 0.1; // Text visible, background subtle
  float finalOpacity = opacity * textOpacity;

  gl_FragColor = vec4(finalColor, finalOpacity);
}
`;

export interface BreathSineMaterialUniforms {
  time: { value: number };
  breathPhase: { value: number };
  opacity: { value: number };
  waveAmplitude: { value: number };
  waveFrequency: { value: number };
  baseColor: { value: THREE.Color };
  glowColor: { value: THREE.Color };
  map: { value: THREE.Texture | null };
  textureOffset: { value: number };
}

/**
 * Creates a breath-synced sine wave material for the inspiration ribbon
 *
 * @param map - Text texture to apply to the ribbon
 * @param options - Material configuration options
 */
export function createBreathSineMaterial(
  map: THREE.Texture | null = null,
  options: {
    baseColor?: string;
    glowColor?: string;
    waveAmplitude?: number;
    waveFrequency?: number;
  } = {},
): THREE.ShaderMaterial {
  const {
    baseColor = '#f5f0e8', // Warm cream (matches background)
    glowColor = '#d4a574', // Soft gold (Monument Valley accent)
    waveAmplitude = 0.02, // Subtle wave height
    waveFrequency = 3.0, // Wave cycles across ribbon
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      breathPhase: { value: 0 },
      opacity: { value: 1 },
      waveAmplitude: { value: waveAmplitude },
      waveFrequency: { value: waveFrequency },
      baseColor: { value: new THREE.Color(baseColor) },
      glowColor: { value: new THREE.Color(glowColor) },
      map: { value: map },
      textureOffset: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false, // Prevent z-fighting with other transparent objects
  });
}
