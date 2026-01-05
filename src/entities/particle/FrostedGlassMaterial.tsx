/**
 * FrostedGlassMaterial - TSL-based shader material for icosahedral shards
 *
 * Features:
 * - Soft fresnel rim glow (edge lighting like the globe)
 * - Breathing luminosity pulse (subtle brightness variation)
 * - Per-instance mood colors with muted pastel saturation
 * - Semi-transparent glass-like appearance
 * - Soft inner glow on inhale phase
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 * Simplified approach without viewportSharedTexture for reliable WebGPU rendering.
 *
 * Performance: Uses InstancedMesh for single draw call (300+ particles = 1 draw call)
 */

import { FrontSide } from 'three';
import {
  add,
  attribute,
  cameraPosition,
  clamp,
  dot,
  Fn,
  max,
  mix,
  mul,
  normalize,
  positionWorld,
  pow,
  sub,
  transformedNormalWorld,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

/**
 * Creates a TSL-based frosted glass material for icosahedral shards
 *
 * Returns a MeshBasicNodeMaterial with:
 * - Fresnel rim glow (soft edge lighting)
 * - Breathing luminosity (synced brightness pulse)
 * - Per-instance color support (via instanceColor attribute)
 * - Semi-transparent glass effect with soft edges
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 */
export function createFrostedGlassMaterial(instanced = true): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.side = FrontSide;
  material.transparent = true;
  material.depthWrite = false; // Proper transparency sorting

  // Uniforms
  const breathPhaseUniform = uniform(0);
  const timeUniform = uniform(0);

  // Store uniforms for external access
  material.userData.breathPhase = breathPhaseUniform;
  material.userData.time = timeUniform;

  // Build color node using TSL
  const colorNode = Fn(() => {
    // Get normal and view direction
    const normal = transformedNormalWorld;
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Get instance color (from InstancedMesh.setColorAt)
    // Falls back to warm neutral if not instanced
    const instanceCol = instanced ? attribute('instanceColor') : vec3(0.85, 0.75, 0.65);

    // Fresnel rim effect - strong edge glow for glass appearance
    const fresnelBase = max(dot(normal, viewDir), 0.0);
    const fresnel = pow(sub(1.0, fresnelBase), 2.0);

    // Breathing luminosity pulse - subtle brightness shift
    const breathLuminosity = add(1.0, mul(breathPhaseUniform, 0.15));

    // === DESATURATE for Monument Valley pastel aesthetic ===
    // Compute luminance and blend toward it for softer, more muted colors
    const luminance = dot(instanceCol, vec3(0.299, 0.587, 0.114));
    const desaturated = vec3(luminance, luminance, luminance);
    // Mix 60% original color with 40% grayscale for pastel effect
    const pastelColor = mix(desaturated, instanceCol, 0.6);

    // Apply luminosity with slight brightness boost
    const baseColor = mul(add(pastelColor, 0.15), breathLuminosity);

    // Strong warm white rim glow - key to glass appearance
    const rimColor = vec3(1.0, 0.98, 0.96);
    const colorWithRim = mix(baseColor, rimColor, mul(fresnel, 0.5));

    // Subtle inner glow that pulses with breathing
    const innerGlowAmount = mul(
      sub(1.0, fresnel),
      mul(0.1, add(1.0, mul(breathPhaseUniform, 0.4))),
    );
    const glowColor = vec3(1.0, 0.99, 0.97);
    const colorWithGlow = add(colorWithRim, mul(glowColor, innerGlowAmount));

    // Clamp color but keep it bright
    const finalColor = clamp(colorWithGlow, 0.0, 1.0);

    // Alpha: more opaque in center, more transparent at edges (glass effect)
    // Also slightly more transparent during exhale for breathing feel
    const baseAlpha = mix(0.85, 0.55, fresnel);
    const breathAlpha = sub(baseAlpha, mul(sub(1.0, breathPhaseUniform), 0.1));
    const alpha = clamp(breathAlpha, 0.45, 0.9);

    return vec4(finalColor, alpha);
  })();

  material.colorNode = colorNode;

  return material;
}
