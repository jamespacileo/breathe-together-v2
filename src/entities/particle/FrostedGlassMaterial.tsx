/**
 * FrostedGlassMaterial - TSL-based shader material for icosahedral shards
 *
 * Features:
 * - Soft fresnel rim glow (edge lighting like the globe)
 * - Breathing luminosity pulse (subtle brightness variation)
 * - Per-instance mood colors with gentle saturation boost
 * - Refraction effect using viewportSharedTexture (captures background)
 * - Subtle inner glow on exhale phase
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 * Uses viewportSharedTexture for refraction without manual FBO passes.
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
  refract,
  screenUV,
  sub,
  transformedNormalWorld,
  uniform,
  vec3,
  vec4,
  viewportSharedTexture,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

/**
 * Creates a TSL-based frosted glass material for icosahedral shards
 *
 * Returns a MeshBasicNodeMaterial with:
 * - Fresnel rim glow (soft edge lighting)
 * - Breathing luminosity (synced brightness pulse)
 * - Per-instance color support (via instanceColor attribute)
 * - Refraction via viewportSharedTexture
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 */
export function createFrostedGlassMaterial(instanced = true): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.side = FrontSide;
  material.transparent = true;

  // Uniforms
  const breathPhaseUniform = uniform(0);
  const timeUniform = uniform(0);
  const iorUniform = uniform(1.3); // Index of refraction

  // Store uniforms for external access
  material.userData.breathPhase = breathPhaseUniform;
  material.userData.time = timeUniform;
  material.userData.ior = iorUniform;

  // Build color node using TSL
  const colorNode = Fn(() => {
    // Get normal and view direction
    const normal = transformedNormalWorld;
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Get instance color (from InstancedMesh.setColorAt)
    // Falls back to warm neutral if not instanced
    const instanceCol = instanced ? attribute('instanceColor') : vec3(0.85, 0.75, 0.65);

    // Fresnel rim effect - soft edge glow
    const fresnelBase = max(dot(normal, viewDir), 0.0);
    const fresnel = pow(sub(1.0, fresnelBase), 2.5);

    // Breathing luminosity pulse - subtle brightness shift
    const breathLuminosity = add(1.0, mul(breathPhaseUniform, 0.12));

    // Subtle saturation boost based on viewing angle
    const facingBoost = mul(fresnelBase, 0.08);

    // === REFRACTION using viewportSharedTexture ===
    // Calculate refracted UV coordinates
    const eyeVector = normalize(sub(positionWorld, cameraPosition));
    const refractedDir = refract(eyeVector, normal, sub(1.0, iorUniform));
    const refractedUV = add(screenUV, mul(refractedDir.xy, 0.04));

    // Sample background through refraction
    const refractedBackground = viewportSharedTexture(refractedUV).rgb;

    // Apply mood color with luminosity
    const baseColor = mul(instanceCol, breathLuminosity);

    // Mix in a warm white rim glow
    const rimColor = vec3(0.98, 0.96, 0.94);
    const colorWithRim = mix(baseColor, rimColor, mul(fresnel, 0.25));

    // Subtle inner luminance
    const innerGlowAmount = mul(
      sub(1.0, fresnel),
      mul(0.05, add(1.0, mul(breathPhaseUniform, 0.3))),
    );
    const colorWithGlow = add(colorWithRim, mul(vec3(1.0, 0.98, 0.95), innerGlowAmount));

    // Slight desaturation toward edges for atmospheric feel
    const luminance = dot(colorWithGlow, vec3(0.299, 0.587, 0.114));
    const desaturated = vec3(luminance, luminance, luminance);
    const gemColor = mix(desaturated, colorWithGlow, add(0.85, facingBoost));

    // === BLEND gem color with refracted background ===
    // Gem body (65%) with refraction (35%) for crystalline depth
    const tintedRefraction = mul(refractedBackground, mix(vec3(1.0, 1.0, 1.0), instanceCol, 0.35));
    const finalColor = mix(tintedRefraction, gemColor, 0.65);

    // Clamp to prevent over-brightness
    return vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  })();

  material.colorNode = colorNode;

  return material;
}
