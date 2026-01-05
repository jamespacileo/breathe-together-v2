/**
 * FrostedGlassMaterialTSL - TSL (Three.js Shading Language) based material
 *
 * This is the TSL equivalent of FrostedGlassMaterial, using node-based shaders
 * that compile to both WebGL (GLSL) and WebGPU (WGSL).
 *
 * Features:
 * - Soft fresnel rim glow (edge lighting)
 * - Breathing luminosity pulse
 * - Per-instance colors via vertex colors
 * - Subtle inner glow during exhale
 *
 * Benefits of TSL over raw GLSL:
 * - Extends material instead of replacing (cleaner than ShaderMaterial)
 * - Same code compiles to WebGL2 and WebGPU
 * - Type-safe node composition
 * - Easier to maintain and modify
 *
 * Note: This is an experimental alternative to FrostedGlassMaterial.
 * Use FrostedGlassMaterial (GLSL) for production until TSL is fully stable.
 *
 * @see https://threejs.org/docs/pages/TSL.html
 * @see https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';

// TSL imports - these work with both WebGL and WebGPU renderers
import {
  add,
  cameraPosition,
  color,
  dot,
  float,
  mix,
  mul,
  normalize,
  normalView,
  positionWorld,
  pow,
  sub,
  max as tslMax,
  uniform,
  vec3,
  vertexColor,
} from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';

/**
 * Props for the TSL frosted glass material
 */
export interface FrostedGlassMaterialTSLProps {
  /** Current breath phase (0-1) for luminosity animation */
  breathPhase?: number;
  /** Whether the material is used with instanced mesh */
  instanced?: boolean;
  /** Base color (fallback when no instance color) */
  baseColor?: string;
  /** Fresnel rim intensity (0-1) */
  fresnelIntensity?: number;
  /** Fresnel rim power (higher = tighter edge glow) */
  fresnelPower?: number;
  /** Rim glow color */
  rimColor?: string;
  /** Breathing luminosity multiplier */
  breathIntensity?: number;
}

/**
 * Ref handle for controlling material uniforms
 */
export interface FrostedGlassMaterialTSLRef {
  /** Update breath phase uniform */
  setBreathPhase: (phase: number) => void;
  /** Get the underlying material */
  material: MeshStandardNodeMaterial | null;
}

/**
 * FrostedGlassMaterialTSL - Node-based material with fresnel and breathing effects
 *
 * Usage:
 * ```tsx
 * <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
 *   <FrostedGlassMaterialTSL breathPhase={0.5} instanced />
 * </instancedMesh>
 * ```
 */
export const FrostedGlassMaterialTSL = forwardRef<
  FrostedGlassMaterialTSLRef,
  FrostedGlassMaterialTSLProps
>(function FrostedGlassMaterialTSL(
  {
    breathPhase = 0,
    instanced = true,
    baseColor = '#d9c4b0',
    fresnelIntensity = 0.25,
    fresnelPower = 2.5,
    rimColor = '#faf8f5',
    breathIntensity = 0.12,
  },
  ref,
) {
  // Create uniforms for animated values
  // biome-ignore lint/correctness/useExhaustiveDependencies: Uniforms must be created once and updated via .value property, not recreated on prop changes
  const uniforms = useMemo(
    () => ({
      uBreathPhase: uniform(float(breathPhase)),
      uFresnelIntensity: uniform(float(fresnelIntensity)),
      uFresnelPower: uniform(float(fresnelPower)),
      uBreathIntensity: uniform(float(breathIntensity)),
    }),
    [],
  );

  // Create the material with TSL nodes
  const material = useMemo(() => {
    // View direction for fresnel calculation
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel rim effect - soft edge glow
    // fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), power)
    const fresnel = pow(
      sub(float(1.0), tslMax(dot(normalView, viewDir), float(0.0))),
      uniforms.uFresnelPower,
    );

    // Base color - use instance color if available, otherwise fallback
    // vertexColor() returns the per-instance color from InstancedMesh
    const instanceCol = instanced ? vertexColor() : color(baseColor);

    // Breathing luminosity pulse
    // luminosity = 1.0 + breathPhase * breathIntensity
    const breathLuminosity = add(float(1.0), mul(uniforms.uBreathPhase, uniforms.uBreathIntensity));

    // Apply luminosity to base color
    const litColor = mul(instanceCol, breathLuminosity);

    // Mix in rim glow
    const rimCol = color(rimColor);
    const colorWithRim = mix(litColor, rimCol, mul(fresnel, uniforms.uFresnelIntensity));

    // Subtle inner glow - very gentle glow from within
    // innerGlow = (1.0 - fresnel) * 0.05 * (1.0 + breathPhase * 0.3)
    const innerGlowBase = mul(sub(float(1.0), fresnel), float(0.05));
    const innerGlowBreath = add(float(1.0), mul(uniforms.uBreathPhase, float(0.3)));
    const innerGlow = mul(innerGlowBase, innerGlowBreath);
    const innerGlowColor = vec3(1.0, 0.98, 0.95);

    // Final color with inner glow
    const finalColor = add(colorWithRim, mul(innerGlowColor, innerGlow));

    // Create the material
    const mat = new MeshStandardNodeMaterial();
    mat.colorNode = finalColor;
    mat.roughnessNode = float(0.4);
    mat.metalnessNode = float(0.1);

    return mat;
  }, [instanced, baseColor, rimColor, uniforms]);

  // Expose ref handle
  useImperativeHandle(
    ref,
    () => ({
      setBreathPhase: (phase: number) => {
        // TSL uniforms accept numbers at runtime despite strict typing
        // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
        (uniforms.uBreathPhase as any).value = phase;
      },
      material,
    }),
    [material, uniforms],
  );

  // Update breath phase from props
  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
    (uniforms.uBreathPhase as any).value = breathPhase;
  }, [breathPhase, uniforms]);

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
});

/**
 * Hook for using TSL material with useFrame updates
 *
 * Usage:
 * ```tsx
 * const { material, updateBreathPhase } = useFrostedGlassTSL();
 *
 * useFrame(() => {
 *   const phase = getBreathPhase();
 *   updateBreathPhase(phase);
 * });
 *
 * return <mesh material={material} />;
 * ```
 */
export function useFrostedGlassTSL(
  options: Omit<FrostedGlassMaterialTSLProps, 'breathPhase'> = {},
) {
  const {
    instanced = true,
    baseColor = '#d9c4b0',
    fresnelIntensity = 0.25,
    fresnelPower = 2.5,
    rimColor = '#faf8f5',
    breathIntensity = 0.12,
  } = options;

  // Uniform for breath phase
  const uBreathPhase = useMemo(() => uniform(float(0)), []);

  // Create the material
  const material = useMemo(() => {
    // View direction for fresnel calculation
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel rim effect
    const fresnel = pow(
      sub(float(1.0), tslMax(dot(normalView, viewDir), float(0.0))),
      float(fresnelPower),
    );

    // Base color
    const instanceCol = instanced ? vertexColor() : color(baseColor);

    // Breathing luminosity
    const breathLuminosity = add(float(1.0), mul(uBreathPhase, float(breathIntensity)));
    const litColor = mul(instanceCol, breathLuminosity);

    // Rim glow
    const rimCol = color(rimColor);
    const colorWithRim = mix(litColor, rimCol, mul(fresnel, float(fresnelIntensity)));

    // Inner glow
    const innerGlowBase = mul(sub(float(1.0), fresnel), float(0.05));
    const innerGlowBreath = add(float(1.0), mul(uBreathPhase, float(0.3)));
    const innerGlow = mul(innerGlowBase, innerGlowBreath);
    const innerGlowColor = vec3(1.0, 0.98, 0.95);
    const finalColor = add(colorWithRim, mul(innerGlowColor, innerGlow));

    const mat = new MeshStandardNodeMaterial();
    mat.colorNode = finalColor;
    mat.roughnessNode = float(0.4);
    mat.metalnessNode = float(0.1);

    return mat;
  }, [
    instanced,
    baseColor,
    fresnelIntensity,
    fresnelPower,
    rimColor,
    breathIntensity,
    uBreathPhase,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return {
    material,
    updateBreathPhase: (phase: number) => {
      // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
      (uBreathPhase as any).value = phase;
    },
  };
}

export default FrostedGlassMaterialTSL;
