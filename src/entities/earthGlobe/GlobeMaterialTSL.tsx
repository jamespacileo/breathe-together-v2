/**
 * GlobeMaterialTSL - TSL (Three.js Shading Language) based globe materials
 *
 * This is the TSL equivalent of the globe shaders, using node-based shaders
 * that compile to both WebGL (GLSL) and WebGPU (WGSL).
 *
 * Features:
 * - Textured globe with fresnel rim glow
 * - Breathing-synchronized brightness modulation
 * - Top-down lighting effect
 * - Atmosphere glow material
 *
 * Note: This is an experimental alternative to the GLSL shaders.
 * Use the standard GLSL shaders in index.tsx for production until TSL is fully stable.
 *
 * Benefits of TSL over raw GLSL:
 * - Extends material instead of replacing (cleaner than ShaderMaterial)
 * - Same code compiles to WebGL2 and WebGPU
 * - Type-safe node composition
 * - Easier to maintain and modify
 * - Uses shared TSL nodes for consistency across the app
 *
 * @see https://threejs.org/docs/pages/TSL.html
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import type * as THREE from 'three';

// TSL imports
import {
  add,
  color,
  float,
  mix,
  mul,
  normalView,
  smoothstep,
  texture,
  uniform,
  uv,
  vec3,
} from 'three/tsl';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';

// Shared TSL nodes - reusable shader patterns
import {
  BREATHING_PRESETS,
  createAbsoluteFresnelNode,
  createBreathingLuminosityNode,
  createBreathingPulseNode,
  createFresnelNode,
  FRESNEL_PRESETS,
} from '../../lib/tsl';
import { setUniformValue } from '../../types/tsl';

// Re-export shared patterns for convenience
export {
  BREATHING_PRESETS,
  createAbsoluteFresnelNode,
  createBreathingLuminosityNode,
  createBreathingPulseNode,
  createFresnelNode,
  FRESNEL_PRESETS,
} from '../../lib/tsl';

/**
 * Props for the TSL globe material
 */
export interface GlobeMaterialTSLProps {
  /** Earth texture */
  earthTexture: THREE.Texture;
  /** Current breath phase (0-1) */
  breathPhase?: number;
}

/**
 * Ref handle for controlling material uniforms
 */
export interface GlobeMaterialTSLRef {
  /** Update breath phase uniform */
  setBreathPhase: (phase: number) => void;
  /** Get the underlying material */
  material: MeshStandardNodeMaterial | null;
}

/**
 * GlobeMaterialTSL - Node-based material for the earth globe
 *
 * Now uses shared TSL nodes from src/lib/tsl/ for:
 * - Fresnel calculations (createFresnelNode)
 * - Breathing modulation (createBreathingLuminosityNode)
 *
 * Features:
 * - Earth texture with fresnel rim glow
 * - Breathing brightness modulation
 * - Subtle top-down lighting
 */
export const GlobeMaterialTSL = forwardRef<GlobeMaterialTSLRef, GlobeMaterialTSLProps>(
  function GlobeMaterialTSL({ earthTexture, breathPhase = 0 }, ref) {
    // Create uniform for animated breath phase
    // biome-ignore lint/correctness/useExhaustiveDependencies: Uniforms must be created once and updated via .value property, not recreated on prop changes
    const uBreathPhase = useMemo(() => uniform(float(breathPhase)), []);

    // Create the material with TSL nodes
    const material = useMemo(() => {
      // Sample earth texture
      const texColor = texture(earthTexture, uv());

      // Use shared fresnel node for atmospheric rim glow
      const fresnel = createFresnelNode(FRESNEL_PRESETS.atmosphere.power);

      // Rim color - muted warm cream
      const rimColor = vec3(0.94, 0.9, 0.86);

      // Use shared breathing luminosity for subtle brightness shift
      const breathMod = createBreathingLuminosityNode(
        uBreathPhase,
        BREATHING_PRESETS.subtle.intensity,
      );
      const litTexColor = mul(texColor.rgb, breathMod);

      // Blend texture with fresnel rim - very subtle
      const colorWithRim = mix(
        litTexColor,
        rimColor,
        mul(fresnel, float(FRESNEL_PRESETS.atmosphere.intensity)),
      );

      // Subtle top-down lighting using normalView
      const topLight = mul(smoothstep(float(-0.2), float(0.8), normalView.y), float(0.05));
      const topLightColor = vec3(0.98, 0.95, 0.92);
      const finalColor = add(colorWithRim, mul(topLightColor, topLight));

      // Create material
      const mat = new MeshStandardNodeMaterial();
      mat.colorNode = finalColor;
      mat.roughnessNode = float(0.6);
      mat.metalnessNode = float(0.0);

      return mat;
    }, [earthTexture, uBreathPhase]);

    // Expose ref handle
    useImperativeHandle(
      ref,
      () => ({
        setBreathPhase: (phase: number) => {
          setUniformValue(uBreathPhase, phase);
        },
        material,
      }),
      [material, uBreathPhase],
    );

    // Update breath phase from props
    useEffect(() => {
      setUniformValue(uBreathPhase, breathPhase);
    }, [breathPhase, uBreathPhase]);

    // Cleanup
    useEffect(() => {
      return () => {
        material.dispose();
      };
    }, [material]);

    return <primitive object={material} attach="material" />;
  },
);

/**
 * Props for the glow material
 */
export interface GlowMaterialTSLProps {
  /** Glow color */
  glowColor?: string;
  /** Glow intensity */
  glowIntensity?: number;
  /** Current breath phase (0-1) */
  breathPhase?: number;
}

/**
 * GlowMaterialTSL - Additive blended fresnel glow for atmosphere effect
 *
 * Uses shared TSL nodes for consistent fresnel and breathing effects.
 */
export const GlowMaterialTSL = forwardRef<
  { setBreathPhase: (phase: number) => void; material: MeshBasicNodeMaterial | null },
  GlowMaterialTSLProps
>(function GlowMaterialTSL(
  { glowColor = '#efe5da', glowIntensity = FRESNEL_PRESETS.mist.intensity, breathPhase = 0 },
  ref,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Uniforms must be created once and updated via .value property, not recreated on prop changes
  const uBreathPhase = useMemo(() => uniform(float(breathPhase)), []);

  const material = useMemo(() => {
    // Use shared absolute fresnel (glows on both sides)
    const fresnel = createAbsoluteFresnelNode(FRESNEL_PRESETS.mist.power);

    // Use shared breathing pulse for glow animation
    const pulse = createBreathingPulseNode(uBreathPhase, 0.2);
    const alpha = mul(mul(fresnel, float(glowIntensity)), pulse);

    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color(glowColor);
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = 2; // AdditiveBlending

    return mat;
  }, [glowColor, glowIntensity, uBreathPhase]);

  useImperativeHandle(
    ref,
    () => ({
      setBreathPhase: (phase: number) => {
        setUniformValue(uBreathPhase, phase);
      },
      material,
    }),
    [material, uBreathPhase],
  );

  useEffect(() => {
    setUniformValue(uBreathPhase, breathPhase);
  }, [breathPhase, uBreathPhase]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
});

/**
 * Hook to create globe materials with automatic breath phase updates
 *
 * Uses shared TSL nodes for consistent effects.
 */
export function useGlobeMaterialsTSL(earthTexture: THREE.Texture) {
  const uBreathPhase = useMemo(() => uniform(float(0)), []);

  // Main globe material using shared nodes
  const globeMaterial = useMemo(() => {
    const texColor = texture(earthTexture, uv());
    const fresnel = createFresnelNode(FRESNEL_PRESETS.atmosphere.power);
    const rimColor = vec3(0.94, 0.9, 0.86);
    const breathMod = createBreathingLuminosityNode(
      uBreathPhase,
      BREATHING_PRESETS.subtle.intensity,
    );
    const litTexColor = mul(texColor.rgb, breathMod);
    const colorWithRim = mix(
      litTexColor,
      rimColor,
      mul(fresnel, float(FRESNEL_PRESETS.atmosphere.intensity)),
    );

    const topLight = mul(smoothstep(float(-0.2), float(0.8), normalView.y), float(0.05));
    const topLightColor = vec3(0.98, 0.95, 0.92);
    const finalColor = add(colorWithRim, mul(topLightColor, topLight));

    const mat = new MeshStandardNodeMaterial();
    mat.colorNode = finalColor;
    mat.roughnessNode = float(0.6);
    mat.metalnessNode = float(0.0);
    return mat;
  }, [earthTexture, uBreathPhase]);

  // Glow material using shared nodes
  const glowMaterial = useMemo(() => {
    const fresnel = createAbsoluteFresnelNode(FRESNEL_PRESETS.mist.power);
    const pulse = createBreathingPulseNode(uBreathPhase, 0.2);
    const alpha = mul(mul(fresnel, float(FRESNEL_PRESETS.mist.intensity)), pulse);

    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color('#efe5da');
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = 2;
    return mat;
  }, [uBreathPhase]);

  // Cleanup
  useEffect(() => {
    return () => {
      globeMaterial.dispose();
      glowMaterial.dispose();
    };
  }, [globeMaterial, glowMaterial]);

  return {
    globeMaterial,
    glowMaterial,
    updateBreathPhase: (phase: number) => {
      setUniformValue(uBreathPhase, phase);
    },
  };
}

export default GlobeMaterialTSL;
