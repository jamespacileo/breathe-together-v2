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
import { useUniformValue } from '../../hooks/useUniformValue';
// Shared TSL nodes - reusable shader patterns
import {
  BREATHING_PRESETS,
  createAbsoluteFresnelNode,
  createBreathingLuminosityNode,
  createBreathingOpacityNode,
  createBreathingPulseNode,
  createFresnelNode,
  createValueNoiseNode,
  FRESNEL_PRESETS,
} from '../../lib/tsl';

type UniformWithValue<T> = { value: T };

function setUniformValue<T>(uniformNode: unknown, value: T): void {
  (uniformNode as UniformWithValue<T>).value = value;
}

function updateUniformValue<T>(uniformNode: unknown, updater: (current: T) => T): void {
  const uniform = uniformNode as UniformWithValue<T>;
  uniform.value = updater(uniform.value);
}

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
          setUniformValue<number>(uBreathPhase, phase);
        },
        material,
      }),
      [material, uBreathPhase],
    );

    // Update breath phase from props
    useUniformValue(uBreathPhase, breathPhase);

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
        setUniformValue<number>(uBreathPhase, phase);
      },
      material,
    }),
    [material, uBreathPhase],
  );

  useUniformValue(uBreathPhase, breathPhase);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
});

/**
 * Props for the mist material
 */
export interface MistMaterialTSLProps {
  /** Mist color */
  mistColor?: string;
  /** Current breath phase (0-1) */
  breathPhase?: number;
}

/**
 * MistMaterialTSL - Animated noise haze layer
 *
 * Creates a subtle misty haze effect using multi-octave noise and breathing synchronization.
 * Features:
 * - Multi-octave value noise (3 layers at different frequencies)
 * - Animated UV with time offset for drifting effect
 * - Fresnel edge glow (softer than main globe fresnel)
 * - Breathing modulation (0.6 to 1.0 range)
 *
 * GLSL equivalent (from earthGlobe/index.tsx):
 * ```glsl
 * float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 1.5);
 * vec2 uv = vUv * 4.0 + time * 0.02;
 * float n = noise(uv) * 0.5 + noise(uv * 2.0) * 0.3 + noise(uv * 4.0) * 0.2;
 * float breath = 0.6 + breathPhase * 0.4;
 * float alpha = fresnel * n * 0.15 * breath;
 * ```
 */
export const MistMaterialTSL = forwardRef<
  { setBreathPhase: (phase: number) => void; material: MeshBasicNodeMaterial | null },
  MistMaterialTSLProps
>(function MistMaterialTSL({ mistColor = '#f0ebe6', breathPhase = 0 }, ref) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Uniforms must be created once and updated via .value property, not recreated on prop changes
  const uBreathPhase = useMemo(() => uniform(float(breathPhase)), []);
  const uTime = useMemo(() => uniform(float(0)), []);

  const material = useMemo(() => {
    // ═══════════════════════════════════════════════════════════════
    // Fresnel effect for edge glow (softer power than globe: 1.5)
    // GLSL: float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 1.5);
    // TSL: Use shared fresnel utility
    // ═══════════════════════════════════════════════════════════════
    const fresnel = createFresnelNode(1.5); // Softer power for mist

    // ═══════════════════════════════════════════════════════════════
    // Animated UV for drifting mist effect
    // GLSL: vec2 uv = vUv * 4.0 + time * 0.02;
    // ═══════════════════════════════════════════════════════════════
    const uvCoord = uv();
    const uvAnimated = add(mul(uvCoord, float(4.0)), mul(uTime, float(0.02)));

    // ═══════════════════════════════════════════════════════════════
    // Multi-octave noise (3 layers with decreasing amplitude)
    // GLSL: float n = noise(uv) * 0.5 + noise(uv * 2.0) * 0.3 + noise(uv * 4.0) * 0.2;
    // TSL: Use shared value noise utility
    // ═══════════════════════════════════════════════════════════════
    const n1 = createValueNoiseNode(uvAnimated); // First octave
    const n2 = createValueNoiseNode(mul(uvAnimated, float(2.0))); // Second octave (2x frequency)
    const n3 = createValueNoiseNode(mul(uvAnimated, float(4.0))); // Third octave (4x frequency)

    // Combine octaves with decreasing weights
    const noise = add(add(mul(n1, float(0.5)), mul(n2, float(0.3))), mul(n3, float(0.2)));

    // ═══════════════════════════════════════════════════════════════
    // Breathing modulation
    // GLSL: float breath = 0.6 + breathPhase * 0.4;
    // TSL: Use shared breathing opacity utility
    // ═══════════════════════════════════════════════════════════════
    const breath = createBreathingOpacityNode(uBreathPhase, 0.6, 1.0); // 0.6 to 1.0 range

    // ═══════════════════════════════════════════════════════════════
    // Combine all effects for final alpha
    // GLSL: float alpha = fresnel * n * 0.15 * breath;
    // ═══════════════════════════════════════════════════════════════
    const alpha = mul(mul(mul(fresnel, noise), float(0.15)), breath);

    // Create material
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color(mistColor);
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = 0; // FrontSide

    return mat;
  }, [mistColor, uBreathPhase, uTime]);

  useImperativeHandle(
    ref,
    () => ({
      setBreathPhase: (phase: number) => {
        setUniformValue<number>(uBreathPhase, phase);
      },
      material,
    }),
    [material, uBreathPhase],
  );

  // Update uniforms from props
  useUniformValue(uBreathPhase, breathPhase);

  // Animate time uniform
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const delta = (time - lastTime) / 1000; // Convert to seconds
      lastTime = time;

      updateUniformValue<number>(uTime, (current) => current + delta);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [uTime]);

  // Cleanup
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

    // Subtle top-down lighting for mist volume
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

  // Mist material using shared nodes
  const uTime = useMemo(() => uniform(float(0)), []);
  const mistMaterial = useMemo(() => {
    const fresnel = createFresnelNode(1.5);
    const uvCoord = uv();
    const uvAnimated = add(mul(uvCoord, float(4.0)), mul(uTime, float(0.02)));

    const n1 = createValueNoiseNode(uvAnimated);
    const n2 = createValueNoiseNode(mul(uvAnimated, float(2.0)));
    const n3 = createValueNoiseNode(mul(uvAnimated, float(4.0)));
    const noise = add(add(mul(n1, float(0.5)), mul(n2, float(0.3))), mul(n3, float(0.2)));

    const breath = createBreathingOpacityNode(uBreathPhase, 0.6, 1.0);
    const alpha = mul(mul(mul(fresnel, noise), float(0.15)), breath);

    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color('#f0ebe6');
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = 0;
    return mat;
  }, [uBreathPhase, uTime]);

  // Animate time uniform for mist
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      updateUniformValue<number>(uTime, (current) => current + delta);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [uTime]);

  // Cleanup
  useEffect(() => {
    return () => {
      globeMaterial.dispose();
      glowMaterial.dispose();
      mistMaterial.dispose();
    };
  }, [globeMaterial, glowMaterial, mistMaterial]);

  return {
    globeMaterial,
    glowMaterial,
    mistMaterial,
    updateBreathPhase: (phase: number) => {
      setUniformValue<number>(uBreathPhase, phase);
    },
  };
}

export default GlobeMaterialTSL;
