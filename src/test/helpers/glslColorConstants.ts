/**
 * GLSL Color Constants
 *
 * Canonical color values extracted from GLSL shader source files.
 * These serve as ground truth for TSL migration validation.
 *
 * Color sources:
 * - BackgroundGradient.tsx: Monument Valley sky gradient
 * - FrostedGlassMaterial.tsx: Particle shard rim and inner glow
 * - earthGlobe/index.tsx: Globe atmosphere and glow layers
 */

/**
 * GLSL color constants extracted from shader source files
 * These are the canonical values that TSL migration must preserve
 */
export const GLSL_COLORS = {
  // From BackgroundGradient.tsx
  background: {
    skyTop: { vec3: [0.96, 0.94, 0.91], hex: '#f5f0e8' },
    skyMid: { vec3: [0.98, 0.95, 0.9], hex: '#faf2e6' },
    horizon: { vec3: [0.99, 0.94, 0.88], hex: '#fcf0e0' },
    warmGlow: { vec3: [0.98, 0.92, 0.85], hex: '#faebd9' },
    cloudColor: { vec3: [1.0, 0.99, 0.97], hex: '#fffcf7' },
  },

  // From FrostedGlassMaterial.tsx
  frostedGlass: {
    fallbackColor: { vec3: [0.85, 0.75, 0.65], hex: '#d9bfa6' },
    rimColor: { vec3: [0.98, 0.96, 0.94], hex: '#faf5f0' },
    innerGlow: { vec3: [1.0, 0.98, 0.95], hex: '#fffaf2' },
    // Shader parameters
    fresnelPower: 2.5,
    breathingIntensity: 0.12,
    innerGlowBase: 0.05,
    innerGlowBreathBoost: 0.3,
  },

  // From earthGlobe/index.tsx
  globe: {
    rimColor: { vec3: [0.94, 0.9, 0.86], hex: '#f0e6db' },
    topLightColor: { vec3: [0.98, 0.95, 0.92], hex: '#faf2eb' },
    glowColor: '#efe5da',
    mistColor: '#f0ebe6',
    atmosphereLayers: ['#f8d0a8', '#b8e8d4', '#c4b8e8'],
    ringColor: '#e8c4b8',
    sparklesColor: '#f8d0a8',
  },
} as const;
