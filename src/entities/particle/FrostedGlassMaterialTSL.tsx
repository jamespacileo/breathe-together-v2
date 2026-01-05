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
 * - Uses shared TSL nodes for consistency across the app
 *
 * Note: This is an experimental alternative to FrostedGlassMaterial.
 * Use FrostedGlassMaterial (GLSL) for production until TSL is fully stable.
 *
 * @see https://threejs.org/docs/pages/TSL.html
 * @see https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';

// TSL imports - these work with both WebGL and WebGPU renderers
import { add, color, float, mix, mul, uniform, vec3, vertexColor } from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';

// Shared TSL nodes - reusable shader patterns
import {
  BREATHING_PRESETS,
  createBreathingLuminosityNode,
  createFresnelNode,
  createInnerGlowBreathingNode,
  createInvertedFresnelNode,
  FRESNEL_PRESETS,
} from '../../lib/tsl';

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
 * Now uses shared TSL nodes from src/lib/tsl/ for:
 * - Fresnel calculations (createFresnelNode)
 * - Breathing luminosity (createBreathingLuminosityNode)
 * - Inner glow effects (createInnerGlowBreathingNode)
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
    fresnelIntensity = FRESNEL_PRESETS.frostedGlass.intensity,
    fresnelPower = FRESNEL_PRESETS.frostedGlass.power,
    rimColor = '#faf8f5',
    breathIntensity = BREATHING_PRESETS.standard.intensity,
  },
  ref,
) {
  // Create uniforms for animated values
  // biome-ignore lint/correctness/useExhaustiveDependencies: Uniforms must be created once and updated via .value property, not recreated on prop changes
  const uniforms = useMemo(
    () => ({
      uBreathPhase: uniform(float(breathPhase)),
    }),
    [],
  );

  // Create the material with TSL nodes
  const material = useMemo(() => {
    // Use shared fresnel node instead of inline calculation
    const fresnel = createFresnelNode(fresnelPower);

    // Base color - use instance color if available, otherwise fallback
    // vertexColor() returns the per-instance color from InstancedMesh
    const instanceCol = instanced ? vertexColor() : color(baseColor);

    // Use shared breathing luminosity node
    const breathLuminosity = createBreathingLuminosityNode(uniforms.uBreathPhase, breathIntensity);

    // Apply luminosity to base color
    const litColor = mul(instanceCol, breathLuminosity);

    // Mix in rim glow using fresnel
    const rimCol = color(rimColor);
    const colorWithRim = mix(litColor, rimCol, mul(fresnel, float(fresnelIntensity)));

    // Subtle inner glow using shared node
    const invertedFresnel = createInvertedFresnelNode(fresnelPower);
    const innerGlowIntensity = createInnerGlowBreathingNode(
      uniforms.uBreathPhase,
      BREATHING_PRESETS.innerGlow.baseIntensity,
      BREATHING_PRESETS.innerGlow.breathBoost,
    );
    const innerGlow = mul(invertedFresnel, innerGlowIntensity);
    const innerGlowColor = vec3(1.0, 0.98, 0.95);

    // Final color with inner glow
    const finalColor = add(colorWithRim, mul(innerGlowColor, innerGlow));

    // Create the material
    const mat = new MeshStandardNodeMaterial();
    mat.colorNode = finalColor;
    mat.roughnessNode = float(0.4);
    mat.metalnessNode = float(0.1);

    return mat;
  }, [instanced, baseColor, rimColor, fresnelIntensity, fresnelPower, breathIntensity, uniforms]);

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
 * Now uses shared TSL nodes for consistent effects across the app.
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
    fresnelIntensity = FRESNEL_PRESETS.frostedGlass.intensity,
    fresnelPower = FRESNEL_PRESETS.frostedGlass.power,
    rimColor = '#faf8f5',
    breathIntensity = BREATHING_PRESETS.standard.intensity,
  } = options;

  // Uniform for breath phase
  const uBreathPhase = useMemo(() => uniform(float(0)), []);

  // Create the material using shared nodes
  const material = useMemo(() => {
    // Use shared fresnel node
    const fresnel = createFresnelNode(fresnelPower);

    // Base color
    const instanceCol = instanced ? vertexColor() : color(baseColor);

    // Use shared breathing luminosity
    const breathLuminosity = createBreathingLuminosityNode(uBreathPhase, breathIntensity);
    const litColor = mul(instanceCol, breathLuminosity);

    // Rim glow
    const rimCol = color(rimColor);
    const colorWithRim = mix(litColor, rimCol, mul(fresnel, float(fresnelIntensity)));

    // Inner glow using shared nodes
    const invertedFresnel = createInvertedFresnelNode(fresnelPower);
    const innerGlowIntensity = createInnerGlowBreathingNode(
      uBreathPhase,
      BREATHING_PRESETS.innerGlow.baseIntensity,
      BREATHING_PRESETS.innerGlow.breathBoost,
    );
    const innerGlow = mul(invertedFresnel, innerGlowIntensity);
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
