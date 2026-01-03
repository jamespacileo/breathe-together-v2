/**
 * BloomRevealMaterial - Custom shader for breath-synchronized text reveal
 *
 * Creates a radial bloom effect where text materializes from the center outward
 * during inhale, holds fully visible, then dissolves into particles during exhale.
 *
 * Uniforms:
 * - uRevealProgress: 0→1 controls radial reveal (0=hidden, 1=fully visible)
 * - uDissolveProgress: 0→1 controls particle dissolution (0=solid, 1=dissolved)
 * - uColor: text color
 * - uGlowColor: bloom glow color
 * - uGlowIntensity: intensity of the bloom glow effect
 */

import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uRevealProgress;
  uniform float uDissolveProgress;
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform float uGlowIntensity;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vPosition;

  // Pseudo-random function for dissolution noise
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Smooth noise for organic dissolution
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Calculate distance from center for radial reveal
    vec2 center = vec2(0.5, 0.5);
    float distFromCenter = length(vUv - center);

    // Radial reveal: progress 0→1 reveals from center outward
    // Max distance from center is ~0.707 (corner), normalize to that
    float maxDist = 0.707;
    float normalizedDist = distFromCenter / maxDist;

    // Soft edge for reveal (smoothstep for anti-aliasing)
    float revealEdge = smoothstep(uRevealProgress, uRevealProgress - 0.15, normalizedDist);

    // Dissolution effect using noise
    float noiseScale = 8.0;
    float dissolveNoise = noise(vUv * noiseScale + uTime * 0.5);

    // Dissolution threshold increases with progress
    float dissolveThreshold = uDissolveProgress * 1.2;
    float dissolveMask = smoothstep(dissolveThreshold - 0.1, dissolveThreshold, dissolveNoise);

    // Combine reveal and dissolution
    float finalAlpha = revealEdge * dissolveMask;

    // Glow effect at the reveal edge
    float glowEdgeDist = abs(normalizedDist - uRevealProgress);
    float glow = exp(-glowEdgeDist * 15.0) * uGlowIntensity * (1.0 - uDissolveProgress);

    // Mix base color with glow
    vec3 finalColor = mix(uColor, uGlowColor, glow * 0.5);
    finalColor += uGlowColor * glow * 0.3;

    // Output with alpha
    gl_FragColor = vec4(finalColor, finalAlpha);

    // Discard fully transparent pixels for performance
    if (finalAlpha < 0.01) discard;
  }
`;

export interface BloomRevealMaterialUniforms {
  uRevealProgress: { value: number };
  uDissolveProgress: { value: number };
  uColor: { value: THREE.Color };
  uGlowColor: { value: THREE.Color };
  uGlowIntensity: { value: number };
  uTime: { value: number };
}

/**
 * Creates a bloom reveal shader material for breath-synchronized text
 *
 * @param color - Base text color (default: warm white)
 * @param glowColor - Bloom glow color (default: gold accent)
 * @param glowIntensity - Intensity of the bloom glow (default: 0.6)
 */
export function createBloomRevealMaterial(
  color = '#f5f0e6',
  glowColor = '#c9a06c',
  glowIntensity = 0.6,
): THREE.ShaderMaterial & { uniforms: BloomRevealMaterialUniforms } {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uRevealProgress: { value: 0 },
      uDissolveProgress: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uGlowColor: { value: new THREE.Color(glowColor) },
      uGlowIntensity: { value: glowIntensity },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return material as THREE.ShaderMaterial & { uniforms: BloomRevealMaterialUniforms };
}
