/**
 * BreathingSphere - Central sphere that scales with breathing
 * Inversely animated compared to particles (shrinks on exhale, grows on inhale)
 * Features a fresnel edge glow that intensifies with breathing
 * Entrance animation: scales from 0 with smooth overshoot
 */
import { MeshTransmissionMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  SPHERE_ANIMATION_DEFAULTS,
  SPHERE_LAYER_SCALE,
  SPHERE_VISUAL_DEFAULTS,
} from '../../constants';
import { createFresnelMaterial } from '../../lib/shaders';
import { breathPhase, sphereScale } from '../breath/traits';

interface BreathingSphereProps {
  /**
   * Sphere color at exhale (cool/calming phase).
   *
   * Main and aura layers lerp between exhale→inhale colors during breathing cycle.
   * Controls the cool tone at the end of exhalation.
   *
   * **When to adjust:** Cooler blues/teals for meditation, warmer tones for energy
   * **Typical range:** Cool Teal (#4A8A9A, default) → Neutral → Warm Orange
   * **Interacts with:** sphereColorInhale (breathing color journey)
   * **Performance note:** No impact; computed per-frame
   *
   * @type color
   * @default "#4A8A9A"
   */
  sphereColorExhale?: string;

  /**
   * Sphere color at inhale (warm/energetic phase).
   *
   * Controls the warm tone at the peak of inhalation. Complements exhale color
   * to create a breathing color journey.
   *
   * **When to adjust:** Warmer oranges/golds for vitality, cooler tones for calm
   * **Typical range:** Cool Blue → Neutral → Warm Gold (#D4A574, default)
   * **Interacts with:** sphereColorExhale (defines the color arc)
   * **Performance note:** No impact; computed per-frame
   *
   * @type color
   * @default "#D4A574"
   */
  sphereColorInhale?: string;

  /**
   * Sphere material opacity (transparency).
   *
   * Controls how transparent the breathing sphere appears. Lower = more ethereal and subtle,
   * higher = more solid and commanding presence.
   *
   * **When to adjust:** Increase for focus/attention, decrease for calm/ambient feel
   * **Typical range:** Ethereal (0.05) → Balanced (0.12, default) → Present (0.25) → Solid (0.4+)
   * **Interacts with:** sphereColorExhale/Inhale, backgroundColor (contrast), bloomIntensity
   * **Performance note:** No impact; material property only
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.12
   */
  sphereOpacity?: number;

  /**
   * Minimum sphere scale at exhale (tightest contraction).
   *
   * Controls the smallest size the sphere reaches at end of exhalation.
   * Lower = more dramatic breathing effect, higher = subtle breathing.
   *
   * **When to adjust:** Lower (0.2-0.3) for dramatic effect, higher (0.5-0.7) for subtle
   * **Typical range:** Dramatic (0.2) → Balanced (0.3, default) → Subtle (0.6)
   * **Interacts with:** sphereScaleMax (together define breathing range)
   * **Performance note:** No impact; computed per-frame
   *
   * @min 0.1
   * @max 1.0
   * @step 0.05
   * @default 0.3
   */
  sphereScaleMin?: number;

  /**
   * Maximum sphere scale at inhale (full expansion).
   *
   * Controls the largest size the sphere reaches at peak inhalation.
   * Defines the upper bound of the breathing motion.
   *
   * **When to adjust:** Higher (0.8-1.0) for expansive effect, lower (0.4-0.6) for restrained
   * **Typical range:** Restrained (0.5) → Balanced (0.7, default) → Expansive (1.0)
   * **Interacts with:** sphereScaleMin (together define breathing range)
   * **Performance note:** No impact; computed per-frame
   *
   * @min 0.1
   * @max 2.0
   * @step 0.05
   * @default 0.7
   */
  sphereScaleMax?: number;

  /**
   * Core layer responsiveness curve (stiffness).
   *
   * Exponent for the core expansion curve: breathPhase^sphereCoreStiffness.
   * Higher = stiffer/slower early expansion (cubic-like), lower = elastic/instant expansion.
   * Affects the dense inner core's breathing behavior.
   *
   * **When to adjust:** Higher (3-5) for stiff/delayed response, lower (0.5-1) for elastic/quick
   * **Typical range:** Elastic (0.5) → Balanced (2.0) → Stiff (3.0, default) → Very Stiff (4.0)
   * **Interacts with:** sphereMainResponsiveness, sphereAuraElasticity (layer coordination)
   * **Performance note:** No impact; computed per-frame
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 3.0
   */
  sphereCoreStiffness?: number;

  /**
   * Main layer responsiveness curve (linear response).
   *
   * Exponent for main sphere expansion: breathPhase^sphereMainResponsiveness.
   * 1.0 = linear response (default), higher = slower early expansion, lower = faster
   * Affects the primary visible sphere's breathing behavior.
   *
   * **When to adjust:** 1.0 for linear, 2-3 for cubic (delayed start), 0.5 for sqrt (early burst)
   * **Typical range:** Elastic (0.5) → Linear (1.0, default) → Cubic (2.0) → Very Stiff (3.0)
   * **Interacts with:** sphereCoreStiffness, sphereAuraElasticity (creates layered breathing)
   * **Performance note:** No impact; computed per-frame
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 1.0
   */
  sphereMainResponsiveness?: number;

  /**
   * Aura layer elasticity (ballistic expansion).
   *
   * Exponent for aura expansion: breathPhase^sphereAuraElasticity.
   * Lower = more elastic/bouncy (early large expansion), higher = delayed/stiff.
   * Affects the outer ethereal aura's breathing behavior for "balloon fill" effect.
   *
   * **When to adjust:** Lower (0.3-0.5) for bouncy balloon effect, higher (1.5-3) for restrained
   * **Typical range:** Bouncy (0.3) → Elastic (0.5, default) → Linear (1.0) → Stiff (2.0)
   * **Interacts with:** sphereCoreStiffness, sphereMainResponsiveness (creates breathing personality)
   * **Performance note:** No impact; computed per-frame
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 0.5
   */
  sphereAuraElasticity?: number;

  /**
   * Aura geometry detail (icosahedron subdivision level).
   *
   * Higher values = smoother spherical appearance with more polygons.
   * Affects visual quality and performance of the outer aura layer.
   *
   * **When to adjust:** Lower (0-1) for mobile/performance, higher (3-4) for desktop/quality
   * **Typical range:** Angular (0) → Balanced (2, default) → Smooth (3) → Very Smooth (4)
   * **Interacts with:** particleCount (both affect overall scene geometry budget)
   * **Performance note:** Linear geometry cost; each level quadruples face count
   *
   * @min 0
   * @max 4
   * @step 1
   * @default 3
   */
  sphereDetail?: number;
}

export function BreathingSphere({
  sphereColorExhale = '#4A8A9A',
  sphereColorInhale = '#D4A574',
  sphereOpacity = 0.12,
  sphereScaleMin = 0.3,
  sphereScaleMax = 0.7,
  sphereCoreStiffness = 3.0,
  sphereMainResponsiveness = 1.0,
  sphereAuraElasticity = 0.5,
  sphereDetail = 3,
}: BreathingSphereProps = {}) {
  // Use simplified animation and visual defaults
  const config = useMemo(
    () => ({
      animation: SPHERE_ANIMATION_DEFAULTS,
      layers: SPHERE_LAYER_SCALE,
      visuals: {
        opacity: sphereOpacity,
        ...SPHERE_VISUAL_DEFAULTS,
      },
    }),
    [sphereOpacity],
  );

  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const entranceStartTimeRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const materialRef = useRef(createFresnelMaterial(0.05));
  const coreMaterialRef = useRef<any>(null);
  const auraMaterialRef = useRef(createFresnelMaterial(0.05 * 2.5));

  // Track entrance animation
  useEffect(() => {
    setMounted(true);
  }, []);

  const world = useWorld();

  // Pre-allocate colors for lerping to avoid GC pressure
  const { exhaleColor, inhaleColor, coreColorExhale, coreColorInhale } = useMemo(() => {
    return {
      exhaleColor: new THREE.Color(sphereColorExhale),
      inhaleColor: new THREE.Color(sphereColorInhale),
      coreColorExhale: new THREE.Color('#b8e2e8'), // Fixed cool tone
      coreColorInhale: new THREE.Color('#ffe0b0'), // Fixed warm tone
    };
  }, [sphereColorExhale, sphereColorInhale]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex animation loop with multiple material properties and transitions
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    // Initialize entrance start time on first frame
    if (mounted && entranceStartTimeRef.current === null) {
      entranceStartTimeRef.current = state.clock.elapsedTime;
    }

    // Get current breath state from entity via query
    const breathEntity = world.queryFirst(sphereScale, breathPhase);
    if (!breathEntity) return;

    const breathPhaseValue = breathEntity.get(breathPhase)?.value ?? 0;

    // Calculate target scale directly from min/max using breath phase
    const targetScale = sphereScaleMin + breathPhaseValue * (sphereScaleMax - sphereScaleMin);

    // Calculate entrance animation
    let entranceScale = 1;
    if (entranceStartTimeRef.current !== null) {
      const entranceStart = entranceStartTimeRef.current + config.animation.entranceDelayMs / 1000;
      const entranceEnd = entranceStart + config.animation.entranceDurationMs / 1000;
      const currentTime = state.clock.elapsedTime;

      if (currentTime < entranceEnd) {
        // Entrance in progress - ease-out with overshoot
        const entranceProgress = Math.min(
          (currentTime - entranceStart) / (config.animation.entranceDurationMs / 1000),
          1,
        );
        // Back.out easing (overshoot effect)
        const c1 = 1.70158;
        const c3 = c1 + 1;
        entranceScale =
          entranceProgress === 0
            ? 0
            : 1 + c3 * (entranceProgress - 1) ** 3 + c1 * (entranceProgress - 1) ** 2;
        entranceScale = Math.max(0, entranceScale);
      }
    }

    // Update uniforms
    const time = state.clock.elapsedTime;
    const color = materialRef.current.uniforms.uColor.value
      .copy(exhaleColor)
      .lerp(inhaleColor, breathPhaseValue);

    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uBreathPhase.value = breathPhaseValue;
    materialRef.current.uniforms.uChromaticAberration.value = config.visuals.chromaticAberration;

    // Fixed glow with breathing-based intensity modulation
    const fresnelValue =
      config.visuals.fresnelIntensityBase + breathPhaseValue * config.visuals.fresnelIntensityRange;
    materialRef.current.uniforms.uFresnelIntensity.value = fresnelValue;
    materialRef.current.uniforms.uOpacity.value = config.visuals.opacity;
    materialRef.current.uniforms.uEmissiveIntensity.value = 0.0 + breathPhaseValue * 0.08;

    // 1. Core: Solid, dense center with configurable stiffness
    // Higher stiffness = stiffer/slower early expansion (cubic-like)
    const coreCurve = 0.5 + 0.15 * breathPhaseValue ** sphereCoreStiffness;
    const finalCoreScale = sphereScaleMin * coreCurve * config.layers.core;

    if (coreRef.current && coreMaterialRef.current) {
      coreRef.current.scale.setScalar(finalCoreScale * entranceScale);

      // Update core material with breathing color
      const coreColor = coreColorExhale.clone().lerp(coreColorInhale, breathPhaseValue);
      coreMaterialRef.current.color.copy(coreColor);

      // Fixed material properties (breathing color modulation only)
      coreMaterialRef.current.transmission = 1.0;
      coreMaterialRef.current.thickness = 1.5 * (0.2 + breathPhaseValue * 0.8);
      coreMaterialRef.current.chromaticAberration = 0.02;
      coreMaterialRef.current.roughness = 0.1 + (1.0 - breathPhaseValue) * 0.2;
    }

    // 2. Main: Standard response.
    if (meshRef.current) {
      meshRef.current.scale.setScalar(targetScale * entranceScale);
    }

    // 3. Aura: Elastic outer shell with configurable elasticity
    // Lower elasticity = bouncy/balloon-fill effect, higher = delayed/stiff
    const auraCurve = 0.8 + 2.5 * breathPhaseValue ** sphereAuraElasticity;
    const finalAuraScale = sphereScaleMin * auraCurve * config.layers.aura;

    if (auraRef.current) {
      auraRef.current.scale.setScalar(finalAuraScale * entranceScale);

      // Update Aura Shader Uniforms
      const auraMaterial = auraMaterialRef.current as THREE.ShaderMaterial;
      auraMaterial.uniforms.uTime.value = time;
      auraMaterial.uniforms.uBreathPhase.value = breathPhaseValue;
      auraMaterial.uniforms.uColor.value.copy(color);
      // Fixed aura opacity (0.02 base + 0.05 range)
      auraMaterial.uniforms.uOpacity.value = (0.02 + breathPhaseValue * 0.05) * entranceScale;
      auraMaterial.uniforms.uFresnelIntensity.value = fresnelValue * 0.5;
    }
  });

  return (
    <group name="Breathing Sphere Group">
      {/* Main Sphere with organic displacement */}
      <mesh name="Main Sphere" ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive object={materialRef.current} attach="material" />
      </mesh>

      {/* Inner Core - Refractive gem-like center */}
      <mesh name="Inner Core" ref={coreRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshTransmissionMaterial
          ref={coreMaterialRef}
          backside
          samples={16}
          resolution={512}
          transmission={1.0}
          roughness={0.2}
          thickness={1.5}
          chromaticAberration={0.02}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.5}
          temporalDistortion={0.1}
        />
      </mesh>

      {/* Outer Aura - Soft atmospheric glow */}
      <mesh name="Outer Aura" ref={auraRef}>
        <icosahedronGeometry args={[1, sphereDetail]} />
        <primitive object={auraMaterialRef.current} attach="material" />
      </mesh>
    </group>
  );
}
