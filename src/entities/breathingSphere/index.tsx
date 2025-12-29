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
   * @group "Appearance"
   * @type color
   */
  colorExhale?: string;

  /**
   * Sphere color at inhale (warm/energetic phase).
   * @group "Appearance"
   * @type color
   */
  colorInhale?: string;

  /**
   * Sphere material opacity (transparency).
   * @group "Appearance"
   * @min 0
   * @max 1
   * @step 0.01
   */
  opacity?: number;

  /**
   * Breathing expansion range.
   * @group "Animation"
   * @min 0.1
   * @max 1.0
   * @step 0.05
   */
  scaleRange?: number;
}

export function BreathingSphere({
  colorExhale = '#4A8A9A',
  colorInhale = '#D4A574',
  opacity = 0.12,
  scaleRange = 0.4,
}: BreathingSphereProps = {}) {
  // Internal constants for hardcoded values
  const sphereScaleMin = 0.3;
  const sphereScaleMax = sphereScaleMin + scaleRange;
  const sphereCoreStiffness = 3.0;
  const sphereAuraElasticity = 0.5;
  const sphereDetail = 3;

  // Use simplified animation and visual defaults
  const config = useMemo(
    () => ({
      animation: SPHERE_ANIMATION_DEFAULTS,
      layers: SPHERE_LAYER_SCALE,
      visuals: {
        opacity: opacity,
        ...SPHERE_VISUAL_DEFAULTS,
      },
    }),
    [opacity],
  );

  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const entranceStartTimeRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const materialRef = useRef(createFresnelMaterial(0.05));
  // biome-ignore lint/suspicious/noExplicitAny: MeshTransmissionMaterial doesn't export its instance type easily
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
      exhaleColor: new THREE.Color(colorExhale),
      inhaleColor: new THREE.Color(colorInhale),
      coreColorExhale: new THREE.Color('#b8e2e8'), // Fixed cool tone
      coreColorInhale: new THREE.Color('#ffe0b0'), // Fixed warm tone
    };
  }, [colorExhale, colorInhale]);

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
          entranceStartTimeRef.current + config.animation.entranceDelayMs / 1000;
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
        config.visuals.fresnelIntensityBase +
        breathPhaseValue * config.visuals.fresnelIntensityRange;
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
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
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
