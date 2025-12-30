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
import { createFresnelMaterial } from '../../lib/shaders';
import { breathPhase, sphereScale } from '../breath/traits';

// ============================================================================
// LAYER ANIMATION CURVES
// ============================================================================

/**
 * Core layer scale curve - stiffer expansion (delayed early growth)
 */
function computeCoreScaleCurve(breathPhase: number, stiffness: number): number {
  return 0.5 + 0.15 * breathPhase ** stiffness;
}

/**
 * Aura layer scale curve - elastic balloon-fill expansion
 */
function computeAuraScaleCurve(breathPhase: number, elasticity: number): number {
  return 0.8 + 2.5 * breathPhase ** elasticity;
}

/**
 * Entrance animation curve - easeOutCubic (smooth deceleration, no overshoot)
 * Provides gentle, reverent arrival suitable for meditation
 */
function computeEntranceScale(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  // easeOutCubic: smooth deceleration without playful overshoot
  return 1 - (1 - progress) ** 3;
}

interface BreathingSphereProps {
  // ====================================================================
  // CORE LAYER (Inner gem with refractive material)
  // ====================================================================

  /**
   * Core layer visibility toggle.
   *
   * Enables/disables the inner gem-like refractive core.
   *
   * **When to adjust:** Disable for simpler aesthetic, enable for depth and visual interest
   * **Interacts with:** coreScale, coreStiffness, coreColorExhale, coreColorInhale
   *
   * @group "Core Layer"
   * @type boolean
   * @default true (production baseline: visible refractive center)
   */
  coreEnabled?: boolean;

  /**
   * Core layer color at exhale (cool/calming phase).
   *
   * Inner gem color during exhale phase. Independent from main/aura colors.
   *
   * **When to adjust:** Create visual harmony or contrast with mainColorExhale
   * **Typical range:** Cool blues, teals, cyans for meditation aesthetic
   * **Interacts with:** coreColorInhale, mainColorExhale, mainOpacity
   *
   * @group "Core Layer"
   * @type color
   * @default #b8e2e8 (production baseline: cool sky blue)
   */
  coreColorExhale?: string;

  /**
   * Core layer color at inhale (warm/energetic phase).
   *
   * Inner gem color during inhale phase. Independent from main/aura colors.
   *
   * **When to adjust:** Create visual harmony or contrast with mainColorInhale
   * **Typical range:** Warm ambers, golds, peaches for energetic aesthetic
   * **Interacts with:** coreColorExhale, mainColorInhale, mainOpacity
   *
   * @group "Core Layer"
   * @type color
   * @default #ffe0b0 (production baseline: warm peach)
   */
  coreColorInhale?: string;

  /**
   * Core layer size relative to main sphere (multiplier).
   *
   * Controls size of inner gem relative to main breathing sphere. Lower values create
   * small gem-like center, higher values fill more of sphere interior.
   *
   * **When to adjust:** Small gem (0.2-0.3), standard core (0.4), large core (0.5-0.6)
   * **Typical range:** Tiny (0.2) → Standard (0.4, balanced) → Large (0.6) → Fills (0.8)
   * **Interacts with:** coreStiffness, mainOpacity, scaleRange
   * **Performance note:** No impact; computed per-frame
   *
   * @group "Core Layer"
   * @type slider
   * @min 0.1
   * @max 0.8
   * @step 0.05
   * @default 0.4 (production baseline: visible gem-like center)
   */
  coreScale?: number;

  /**
   * Core layer expansion curve exponent (breathing stiffness).
   *
   * Controls how quickly inner core responds to breathing. Higher values create stiff,
   * delayed expansion (cubic-like curve). Lower values create fluid, immediate expansion.
   *
   * **When to adjust:** Fluid core (1.0), balanced core (3.0), stiff core (6.0)
   * **Typical range:** Fluid (1.0, immediate) → Standard (3.0, cubic) → Stiff (6.0, delayed)
   * **Interacts with:** scaleRange, coreScale, auraElasticity
   * **Performance note:** No impact; computed per-frame
   *
   * @group "Core Layer"
   * @type slider
   * @min 0.5
   * @max 8.0
   * @step 0.5
   * @default 3.0 (production baseline: cubic-like stiff expansion)
   */
  coreStiffness?: number;

  // ====================================================================
  // MAIN LAYER (Primary breathing sphere with fresnel glow)
  // ====================================================================

  /**
   * Main layer visibility toggle.
   *
   * Enables/disables the primary breathing sphere layer.
   *
   * **When to adjust:** Disable for core/aura-only aesthetic
   * **Interacts with:** mainOpacity, mainFresnelBase, mainColorExhale, mainColorInhale
   *
   * @group "Main Layer"
   * @type boolean
   * @default true (production baseline: visible primary sphere)
   */
  mainEnabled?: boolean;

  /**
   * Main sphere color at exhale (cool/calming phase).
   *
   * Primary sphere color during exhale phase. Shared with aura layer.
   *
   * **When to adjust:** Create color harmony with background; cooler tones for calm
   * **Typical range:** Cool blues, teals, cyans for meditation aesthetic
   * **Interacts with:** mainColorInhale, coreColorExhale, mainOpacity
   *
   * @group "Main Layer"
   * @type color
   * @default #4A8A9A (production baseline: meditation teal-blue)
   */
  mainColorExhale?: string;

  /**
   * Main sphere color at inhale (warm/energetic phase).
   *
   * Primary sphere color during inhale phase. Shared with aura layer.
   *
   * **When to adjust:** Create color harmony with background; warmer tones for energy
   * **Typical range:** Warm ambers, golds, oranges for energetic aesthetic
   * **Interacts with:** mainColorExhale, coreColorInhale, mainOpacity
   *
   * @group "Main Layer"
   * @type color
   * @default #D4A574 (production baseline: warm amber-sand)
   */
  mainColorInhale?: string;

  /**
   * Main layer base material opacity (transparency).
   *
   * Controls base transparency of primary sphere layer before fresnel glow is added.
   * Higher opacity makes sphere more solid, lower allows environment to show through.
   *
   * **When to adjust:** Ethereal (0.05-0.08), subtle (0.12), prominent (0.2-0.3)
   * **Typical range:** Ethereal (0.05) → Standard (0.12, balanced) → Prominent (0.25) → Opaque (0.5)
   * **Interacts with:** mainFresnelBase, mainFresnelRange, auraOpacity, coreScale
   * **Performance note:** No impact; computed per-fragment in shader
   *
   * @group "Main Layer"
   * @type slider
   * @min 0.0
   * @max 1.0
   * @step 0.01
   * @default 0.12 (production baseline: subtle transparency with visible glow)
   */
  mainOpacity?: number;

  /**
   * Main layer fresnel glow base intensity.
   *
   * Base intensity of edge glow effect before breathing modulation. Higher base creates
   * always-visible glow, lower creates subtle highlights.
   *
   * **When to adjust:** Subtle glow (0.2-0.3), standard glow (0.5), intense glow (0.7-0.9)
   * **Typical range:** Subtle (0.2) → Standard (0.5, balanced) → Intense (0.8) → Blinding (1.2)
   * **Interacts with:** mainFresnelRange, mainOpacity, mainColorExhale, mainColorInhale
   * **Performance note:** No impact; computed per-fragment in shader
   *
   * @group "Main Layer"
   * @type slider
   * @min 0.0
   * @max 1.5
   * @step 0.05
   * @default 0.5 (production baseline: visible edge glow)
   */
  mainFresnelBase?: number;

  /**
   * Main layer fresnel glow breathing range.
   *
   * How much fresnel intensity increases from exhale to inhale. Added to base intensity.
   * Higher range creates dramatic breathing glow pulse.
   *
   * **When to adjust:** Subtle pulse (0.2-0.3), standard pulse (0.6), dramatic pulse (1.0-1.5)
   * **Typical range:** Subtle (0.2) → Standard (0.6, balanced) → Dramatic (1.0) → Extreme (1.5)
   * **Interacts with:** mainFresnelBase, mainOpacity, auraOpacityRange
   * **Performance note:** No impact; computed per-fragment in shader
   *
   * @group "Main Layer"
   * @type slider
   * @min 0.0
   * @max 2.0
   * @step 0.1
   * @default 0.6 (production baseline: noticeable breathing glow modulation)
   */
  mainFresnelRange?: number;

  /**
   * Main layer noise displacement intensity.
   *
   * Controls organic surface wobble and distortion of the main sphere surface.
   * Creates living, breathing quality. Higher values produce more dramatic psychedelic distortion.
   *
   * **When to adjust:** Smooth meditation (0.02-0.03), standard organic (0.05), wobbling (0.1-0.15)
   * **Typical range:** Smooth (0.02) → Standard (0.05, balanced) → Wobble (0.1) → Psychedelic (0.15)
   * **Interacts with:** auraNoiseIntensity, mainOpacity, mainFresnelBase
   * **Performance note:** No impact; computed in vertex shader
   *
   * @group "Main Layer"
   * @type slider
   * @min 0.0
   * @max 0.2
   * @step 0.01
   * @default 0.05 (production baseline: subtle organic wobble)
   */
  mainNoiseIntensity?: number;

  // ====================================================================
  // AURA LAYER (Outer atmospheric glow)
  // ====================================================================

  /**
   * Aura layer visibility toggle.
   *
   * Enables/disables the outer atmospheric glow layer.
   *
   * **When to adjust:** Disable for core/main-only aesthetic
   * **Interacts with:** auraScale, auraOpacity, auraElasticity
   *
   * @group "Aura Layer"
   * @type boolean
   * @default true (production baseline: visible atmospheric halo)
   */
  auraEnabled?: boolean;

  /**
   * Aura layer size relative to main sphere (multiplier).
   *
   * Controls how far outer glow extends beyond main sphere. Higher values create
   * expansive atmospheric halo effect.
   *
   * **When to adjust:** Tight halo (1.2-1.3), standard aura (1.5), expansive glow (2.0-2.5)
   * **Typical range:** Tight (1.2) → Standard (1.5, balanced) → Expansive (2.0) → Huge (3.0)
   * **Interacts with:** auraElasticity, auraOpacity, scaleRange
   * **Performance note:** No impact; computed per-frame
   *
   * @group "Aura Layer"
   * @type slider
   * @min 1.0
   * @max 3.0
   * @step 0.1
   * @default 1.5 (production baseline: visible atmospheric halo)
   */
  auraScale?: number;

  /**
   * Aura layer base opacity.
   *
   * Base transparency of outer aura layer before breathing modulation. Very subtle by design.
   *
   * **When to adjust:** Barely visible (0.01), subtle (0.02), prominent (0.05-0.08)
   * **Typical range:** Barely visible (0.01) → Standard (0.02, subtle) → Prominent (0.05) → Dense (0.1)
   * **Interacts with:** auraOpacityRange, mainOpacity, auraScale
   * **Performance note:** No impact; computed per-fragment in shader
   *
   * @group "Aura Layer"
   * @type slider
   * @min 0.0
   * @max 0.2
   * @step 0.005
   * @default 0.02 (production baseline: very subtle atmospheric presence)
   */
  auraOpacity?: number;

  /**
   * Aura layer breathing opacity range.
   *
   * How much opacity increases from exhale to inhale. Added to base opacity.
   * Creates pulsing atmospheric glow effect during breathing.
   *
   * **When to adjust:** Subtle pulse (0.02-0.03), standard pulse (0.05), dramatic pulse (0.1-0.15)
   * **Typical range:** Subtle (0.02) → Standard (0.05, balanced) → Dramatic (0.1) → Extreme (0.2)
   * **Interacts with:** auraOpacity, auraScale, mainFresnelRange
   * **Performance note:** No impact; computed per-fragment in shader
   *
   * @group "Aura Layer"
   * @type slider
   * @min 0.0
   * @max 0.3
   * @step 0.01
   * @default 0.05 (production baseline: noticeable breathing opacity pulse)
   */
  auraOpacityRange?: number;

  /**
   * Aura layer elasticity (balloon-fill breathing response).
   *
   * Controls how quickly outer aura responds to breathing. Lower values create bouncy,
   * rapid balloon-like expansion. Higher values create delayed, elastic expansion.
   *
   * **When to adjust:** Bouncy aura (0.2), balanced aura (0.5), delayed aura (1.5)
   * **Typical range:** Bouncy (0.2, rapid) → Standard (0.5, balanced) → Delayed (1.5) → Glacial (3.0)
   * **Interacts with:** scaleRange, auraScale, coreStiffness
   * **Performance note:** No impact; computed per-frame
   *
   * @group "Aura Layer"
   * @type slider
   * @min 0.1
   * @max 3.0
   * @step 0.1
   * @default 0.5 (production baseline: elastic balloon-fill effect)
   */
  auraElasticity?: number;

  /**
   * Aura layer noise displacement intensity.
   *
   * Controls organic wobble and distortion of the outer atmospheric layer.
   * Typically 2-3x main layer intensity for emphasis and visible effect.
   *
   * **When to adjust:** Subtle (0.05-0.08), standard (0.125), dramatic (0.2-0.3)
   * **Typical range:** Subtle (0.05) → Standard (0.125, 2.5x main) → Dramatic (0.25) → Extreme (0.4)
   * **Interacts with:** mainNoiseIntensity, auraScale, auraOpacity
   * **Performance note:** No impact; computed in vertex shader
   *
   * @group "Aura Layer"
   * @type slider
   * @min 0.0
   * @max 0.4
   * @step 0.01
   * @default 0.125 (production baseline: 2.5x main layer for atmospheric emphasis)
   */
  auraNoiseIntensity?: number;

  // ====================================================================
  // GLOBAL BREATHING (Affects all layers)
  // ====================================================================

  /**
   * Breathing expansion range for entire sphere system.
   *
   * Controls how much sphere system expands/contracts during breathing. Range is added
   * to minimum scale (0.3). All three layers scale proportionally.
   *
   * **When to adjust:** Subtle breathing (0.2), standard breathing (0.4), dramatic breathing (0.7)
   * **Typical range:** Subtle (0.2) → Standard (0.4, balanced) → Dramatic (0.7) → Extreme (1.0)
   * **Interacts with:** coreStiffness, auraElasticity, coreScale, auraScale
   * **Performance note:** No impact; computed per-frame
   *
   * @group "Global Breathing"
   * @type slider
   * @min 0.1
   * @max 1.0
   * @step 0.05
   * @default 0.4 (production baseline: balanced breathing motion)
   */
  scaleRange?: number;
}

export function BreathingSphere({
  // Core Layer
  coreEnabled = true,
  coreColorExhale = '#b8e2e8',
  coreColorInhale = '#ffe0b0',
  coreScale = 0.4,
  coreStiffness = 1.5,
  // Main Layer
  mainEnabled = true,
  mainColorExhale = '#4A8A9A',
  mainColorInhale = '#D4A574',
  mainOpacity = 0.12,
  mainFresnelBase = 0.5,
  mainFresnelRange = 0.6,
  mainNoiseIntensity = 0.05,
  // Aura Layer
  auraEnabled = true,
  auraScale = 1.5,
  auraOpacity = 0.06,
  auraOpacityRange = 0.08,
  auraElasticity = 0.5,
  auraNoiseIntensity = 0.125,
  // Global
  scaleRange = 0.4,
}: BreathingSphereProps = {}) {
  // Internal scale constants
  const sphereScaleMin = 0.3;
  const sphereScaleMax = sphereScaleMin + scaleRange;

  // Animation constants (entrance timing)
  const animationDefaults = useMemo(
    () => ({
      entranceDelayMs: 200,
      entranceDurationMs: 800,
    }),
    [],
  );

  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const entranceStartTimeRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // biome-ignore lint/suspicious/noExplicitAny: MeshTransmissionMaterial doesn't export its instance type easily
  const coreMaterialRef = useRef<any>(null);

  // Track entrance animation
  useEffect(() => {
    setMounted(true);
  }, []);

  const world = useWorld();

  // Pre-allocate colors for lerping to avoid GC pressure
  const { mainExhaleColor, mainInhaleColor, coreExhaleColor, coreInhaleColor } = useMemo(() => {
    return {
      mainExhaleColor: new THREE.Color(mainColorExhale),
      mainInhaleColor: new THREE.Color(mainColorInhale),
      coreExhaleColor: new THREE.Color(coreColorExhale),
      coreInhaleColor: new THREE.Color(coreColorInhale),
    };
  }, [mainColorExhale, mainColorInhale, coreColorExhale, coreColorInhale]);

  // Create materials with proper noise intensity configuration
  const { materialRef, auraMaterialRef } = useMemo(() => {
    return {
      materialRef: { current: createFresnelMaterial(mainNoiseIntensity) },
      auraMaterialRef: { current: createFresnelMaterial(auraNoiseIntensity) },
    };
  }, [mainNoiseIntensity, auraNoiseIntensity]);

  // Cleanup Three.js materials on unmount or dependency change
  useEffect(() => {
    return () => {
      materialRef.current?.dispose();
      auraMaterialRef.current?.dispose();
    };
  }, [materialRef, auraMaterialRef]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex animation loop with multiple material properties and transitions
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    try {
      // Initialize entrance start time on first frame
      if (mounted && entranceStartTimeRef.current === null) {
        entranceStartTimeRef.current = state.clock.elapsedTime;
      }

      // Get current breath state from entity via query
      const breathEntity = world.queryFirst(sphereScale, breathPhase);
      if (!breathEntity || !world.has(breathEntity)) return;

      const breathPhaseValue = breathEntity.get(breathPhase)?.value ?? 0;

      // Calculate target scale directly from min/max using breath phase
      const targetScale = sphereScaleMin + breathPhaseValue * (sphereScaleMax - sphereScaleMin);

      // Calculate entrance animation
      let entranceScale = 1;
      if (entranceStartTimeRef.current !== null) {
        const entranceStart =
          entranceStartTimeRef.current + animationDefaults.entranceDelayMs / 1000;
        const entranceEnd = entranceStart + animationDefaults.entranceDurationMs / 1000;
        const currentTime = state.clock.elapsedTime;

        if (currentTime < entranceEnd) {
          // Entrance in progress - ease-out with overshoot
          const entranceProgress = Math.min(
            (currentTime - entranceStart) / (animationDefaults.entranceDurationMs / 1000),
            1,
          );
          entranceScale = computeEntranceScale(entranceProgress);
        }
      }

      // Update uniforms
      const time = state.clock.elapsedTime;
      const color = materialRef.current.uniforms.uColor.value
        .copy(mainExhaleColor)
        .lerp(mainInhaleColor, breathPhaseValue);

      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uBreathPhase.value = breathPhaseValue;
      materialRef.current.uniforms.uChromaticAberration.value = 0.02; // Hardcoded

      // Fresnel glow with breathing-based intensity modulation
      const fresnelValue = mainFresnelBase + breathPhaseValue * mainFresnelRange;
      materialRef.current.uniforms.uFresnelIntensity.value = fresnelValue;
      materialRef.current.uniforms.uOpacity.value = mainOpacity;
      materialRef.current.uniforms.uEmissiveIntensity.value = 0.0 + breathPhaseValue * 0.08;

      // 1. Core: Solid, dense center with configurable stiffness
      // Higher stiffness = stiffer/slower early expansion (cubic-like)
      if (coreEnabled && coreRef.current && coreMaterialRef.current) {
        const coreCurve = computeCoreScaleCurve(breathPhaseValue, coreStiffness);
        const finalCoreScale = sphereScaleMin * coreCurve * coreScale;
        coreRef.current.scale.setScalar(finalCoreScale * entranceScale);

        // Update core material with breathing color
        const coreColor = coreExhaleColor.clone().lerp(coreInhaleColor, breathPhaseValue);
        coreMaterialRef.current.color.copy(coreColor);

        // Fixed material properties (breathing color modulation only)
        coreMaterialRef.current.transmission = 1.0;
        coreMaterialRef.current.thickness = 1.5 * (0.2 + breathPhaseValue * 0.8);
        coreMaterialRef.current.chromaticAberration = 0.02;
        coreMaterialRef.current.roughness = 0.1 + (1.0 - breathPhaseValue) * 0.2;
      }

      // 2. Main: Standard response
      if (mainEnabled && meshRef.current) {
        meshRef.current.scale.setScalar(targetScale * entranceScale);
      }

      // 3. Aura: Elastic outer shell with configurable elasticity
      // Lower elasticity = bouncy/balloon-fill effect, higher = delayed/stiff
      if (auraEnabled && auraRef.current) {
        const auraCurve = computeAuraScaleCurve(breathPhaseValue, auraElasticity);
        const finalAuraScale = sphereScaleMin * auraCurve * auraScale;
        auraRef.current.scale.setScalar(finalAuraScale * entranceScale);

        // Update Aura Shader Uniforms
        const auraMaterial = auraMaterialRef.current as THREE.ShaderMaterial;
        auraMaterial.uniforms.uTime.value = time;
        auraMaterial.uniforms.uBreathPhase.value = breathPhaseValue;
        auraMaterial.uniforms.uColor.value.copy(color);
        // Aura opacity with breathing modulation
        auraMaterial.uniforms.uOpacity.value =
          (auraOpacity + breathPhaseValue * auraOpacityRange) * entranceScale;
        // Boost fresnel glow for more visible atmospheric presence
        auraMaterial.uniforms.uFresnelIntensity.value = fresnelValue * 0.7;
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }
  });

  return (
    <group name="Breathing Sphere Group">
      {/* Main Sphere with organic displacement */}
      {mainEnabled && (
        <mesh name="Main Sphere" ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <primitive object={materialRef.current} attach="material" />
        </mesh>
      )}

      {/* Inner Core - Refractive gem-like center */}
      {coreEnabled && (
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
      )}

      {/* Outer Aura - Soft atmospheric glow */}
      {auraEnabled && (
        <mesh name="Outer Aura" ref={auraRef}>
          <icosahedronGeometry args={[1, 3]} />
          <primitive object={auraMaterialRef.current} attach="material" />
        </mesh>
      )}
    </group>
  );
}
