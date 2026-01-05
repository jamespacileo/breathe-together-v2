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
 *
 * @see https://threejs.org/docs/pages/TSL.html
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import type * as THREE from 'three';

// TSL imports
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
  smoothstep,
  sub,
  texture,
  abs as tslAbs,
  max as tslMax,
  uniform,
  uv,
  vec3,
} from 'three/tsl';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';

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
      // View direction for fresnel
      const viewDir = normalize(sub(cameraPosition, positionWorld));

      // Sample earth texture
      const texColor = texture(earthTexture, uv());

      // Fresnel rim for atmospheric glow
      // pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0)
      const fresnel = pow(
        sub(float(1.0), tslMax(dot(normalView, viewDir), float(0.0))),
        float(4.0),
      );

      // Rim color - muted warm cream
      const rimColor = vec3(0.94, 0.9, 0.86);

      // Breathing modulation - subtle brightness shift
      // breathMod = 1.0 + breathPhase * 0.06
      const breathMod = add(float(1.0), mul(uBreathPhase, float(0.06)));
      const litTexColor = mul(texColor.rgb, breathMod);

      // Blend texture with fresnel rim - very subtle
      const colorWithRim = mix(litTexColor, rimColor, mul(fresnel, float(0.18)));

      // Subtle top-down lighting
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
          // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
          (uBreathPhase as any).value = phase;
        },
        material,
      }),
      [material, uBreathPhase],
    );

    // Update breath phase from props
    useEffect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
      (uBreathPhase as any).value = breathPhase;
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
 */
export const GlowMaterialTSL = forwardRef<
  { setBreathPhase: (phase: number) => void; material: MeshBasicNodeMaterial | null },
  GlowMaterialTSLProps
>(function GlowMaterialTSL({ glowColor = '#efe5da', glowIntensity = 0.25, breathPhase = 0 }, ref) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Uniforms must be created once and updated via .value property, not recreated on prop changes
  const uBreathPhase = useMemo(() => uniform(float(breathPhase)), []);

  const material = useMemo(() => {
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel with softer edges and tighter falloff
    const fresnel = pow(sub(float(1.0), tslAbs(dot(normalView, viewDir))), float(3.5));

    // Breathing pulse
    const pulse = add(float(1.0), mul(uBreathPhase, float(0.2)));
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
        // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
        (uBreathPhase as any).value = phase;
      },
      material,
    }),
    [material, uBreathPhase],
  );

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
    (uBreathPhase as any).value = breathPhase;
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
 * Note: Simplified version without mist layer (noise function had TSL typing issues)
 */
export function useGlobeMaterialsTSL(earthTexture: THREE.Texture) {
  const uBreathPhase = useMemo(() => uniform(float(0)), []);

  // Main globe material
  const globeMaterial = useMemo(() => {
    const viewDir = normalize(sub(cameraPosition, positionWorld));
    const texColor = texture(earthTexture, uv());
    const fresnel = pow(sub(float(1.0), tslMax(dot(normalView, viewDir), float(0.0))), float(4.0));
    const rimColor = vec3(0.94, 0.9, 0.86);
    const breathMod = add(float(1.0), mul(uBreathPhase, float(0.06)));
    const litTexColor = mul(texColor.rgb, breathMod);
    const colorWithRim = mix(litTexColor, rimColor, mul(fresnel, float(0.18)));
    const topLight = mul(smoothstep(float(-0.2), float(0.8), normalView.y), float(0.05));
    const topLightColor = vec3(0.98, 0.95, 0.92);
    const finalColor = add(colorWithRim, mul(topLightColor, topLight));

    const mat = new MeshStandardNodeMaterial();
    mat.colorNode = finalColor;
    mat.roughnessNode = float(0.6);
    mat.metalnessNode = float(0.0);
    return mat;
  }, [earthTexture, uBreathPhase]);

  // Glow material
  const glowMaterial = useMemo(() => {
    const viewDir = normalize(sub(cameraPosition, positionWorld));
    const fresnel = pow(sub(float(1.0), tslAbs(dot(normalView, viewDir))), float(3.5));
    const pulse = add(float(1.0), mul(uBreathPhase, float(0.2)));
    const alpha = mul(mul(fresnel, float(0.25)), pulse);

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
      // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
      (uBreathPhase as any).value = phase;
    },
  };
}

export default GlobeMaterialTSL;
