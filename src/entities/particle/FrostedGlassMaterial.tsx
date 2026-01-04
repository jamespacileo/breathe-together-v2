/**
 * FrostedGlassMaterial - Enhanced shader material for icosahedral shards
 *
 * Features subtle visual effects that users won't consciously notice but will feel:
 * - Soft fresnel rim glow (edge lighting like the globe)
 * - Breathing luminosity pulse (subtle brightness variation)
 * - Per-instance mood colors with gentle saturation boost
 * - Subtle inner glow on exhale phase
 *
 * For the refraction effect to work:
 * 1. Mesh must have userData.useRefraction = true
 * 2. InstancedMesh must have instanceColor attribute set
 * 3. RefractionPipeline must be present in the scene tree
 *
 * Performance: Uses InstancedMesh for single draw call (300+ particles = 1 draw call)
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 */

import { FrontSide } from 'three';
import {
  add,
  attribute,
  cameraPosition,
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
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

/**
 * Creates an enhanced frosted glass shader material for icosahedral shards
 *
 * Returns a NodeMaterial with:
 * - Fresnel rim glow (soft edge lighting)
 * - Breathing luminosity (synced brightness pulse)
 * - Per-instance color support (via instanceColor attribute)
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 */
export function createFrostedGlassMaterial(instanced = true) {
  const material = new MeshBasicNodeMaterial();
  material.side = FrontSide; // Icosahedra are convex - backfaces never visible. Saves 50% fragment processing

  // Uniforms for animation
  const breathPhaseUniform = uniform(0);
  const timeUniform = uniform(0);

  // Store uniforms for external access via userData
  material.userData.breathPhase = breathPhaseUniform;
  material.userData.time = timeUniform;

  // Build shader using TSL nodes
  const colorNode = Fn(() => {
    // Get world normal (transformed)
    const normal = transformedNormalWorld;

    // Calculate view direction from world position to camera
    const worldPos = positionWorld;
    const viewDir = normalize(sub(cameraPosition, worldPos));

    // Fresnel rim effect - soft edge glow
    // fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5)
    const fresnel = pow(sub(1.0, max(dot(normal, viewDir), 0.0)), 2.5);

    // Breathing luminosity pulse - subtle brightness shift
    // breathLuminosity = 1.0 + breathPhase * 0.12
    const breathLuminosity = add(1.0, mul(breathPhaseUniform, 0.12));

    // Subtle saturation boost based on viewing angle
    // facingBoost = max(dot(normal, viewDir), 0.0) * 0.08
    const facingBoost = mul(max(dot(normal, viewDir), 0.0), 0.08);

    // Get instance color or fallback to warm neutral
    // In TSL, instance colors come from the instanceColor attribute
    const baseColor = instanced ? attribute('instanceColor', 'vec3') : vec3(0.85, 0.75, 0.65);

    // Apply mood color with luminosity
    // colorWithLuminosity = baseColor * breathLuminosity
    const colorWithLuminosity = mul(baseColor, breathLuminosity);

    // Mix in a warm white rim glow (like the globe)
    // rimColor = vec3(0.98, 0.96, 0.94)
    // colorWithRim = mix(colorWithLuminosity, rimColor, fresnel * 0.25)
    const rimColor = vec3(0.98, 0.96, 0.94);
    const colorWithRim = mix(colorWithLuminosity, rimColor, mul(fresnel, 0.25));

    // Subtle inner luminance - very gentle glow from within
    // innerGlow = (1.0 - fresnel) * 0.05 * (1.0 + breathPhase * 0.3)
    const innerGlow = mul(mul(sub(1.0, fresnel), 0.05), add(1.0, mul(breathPhaseUniform, 0.3)));
    const innerGlowColor = vec3(1.0, 0.98, 0.95);
    const colorWithInnerGlow = add(colorWithRim, mul(innerGlowColor, innerGlow));

    // Slight desaturation toward edges for atmospheric feel
    // desaturated = vec3(dot(colorWithInnerGlow, vec3(0.299, 0.587, 0.114)))
    const luminance = dot(colorWithInnerGlow, vec3(0.299, 0.587, 0.114));
    const desaturated = vec3(luminance, luminance, luminance);

    // finalColor = mix(desaturated, colorWithInnerGlow, 0.85 + facingBoost)
    const finalColor = mix(desaturated, colorWithInnerGlow, add(0.85, facingBoost));

    return finalColor;
  })();

  material.colorNode = colorNode;

  // Provide uniforms-like interface for backward compatibility
  // This allows existing code that uses material.uniforms to still work
  Object.defineProperty(material, 'uniforms', {
    get() {
      return {
        breathPhase: { value: breathPhaseUniform.value },
        time: { value: timeUniform.value },
      };
    },
    set(val: { breathPhase?: { value: number }; time?: { value: number } }) {
      if (val.breathPhase !== undefined) {
        breathPhaseUniform.value = val.breathPhase.value;
      }
      if (val.time !== undefined) {
        timeUniform.value = val.time.value;
      }
    },
  });

  return material;
}
