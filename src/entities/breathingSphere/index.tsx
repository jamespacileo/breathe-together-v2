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
import { DEFAULT_SPHERE_CONFIG, VISUALS } from '../../constants';
import { createFresnelMaterial } from '../../lib/shaders';
import { breathPhase, sphereScale } from '../breath/traits';

interface BreathingSphereProps {
  /**
   * Sphere base color (breath-modulated).
   *
   * Main hue of the breathing orb. Color lightly shifts between exhale (darker, more saturated)
   * and inhale (lighter, warmer). If not provided, uses default warm-cool progression.
   *
   * @group "Material"
   * @label "Base Color"
   * @type color
   * @default "#d4a574"
   */
  color?: string;

  /**
   * Sphere material opacity (transparency).
   *
   * Controls how transparent the breathing sphere appears. Lower = more ethereal and subtle,
   * higher = more solid and commanding presence.
   *
   * @group "Material"
   * @label "Opacity"
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.12
   */
  opacity?: number;

  /**
   * Base intensity of the edge glow (Fresnel effect).
   *
   * @group "Material"
   * @label "Glow Intensity"
   * @min 0
   * @max 2
   * @step 0.1
   * @default 0.5
   */
  glowIntensity?: number;

  /**
   * How much the glow intensifies during the inhale phase.
   *
   * @group "Material"
   * @label "Glow Range"
   * @min 0
   * @max 2
   * @step 0.1
   * @default 0.6
   */
  glowRange?: number;

  /**
   * Speed of the organic surface displacement pulse.
   *
   * @group "Animation"
   * @label "Pulse Speed"
   * @min 0
   * @max 2
   * @step 0.1
   * @default 0.5
   */
  pulseSpeed?: number;

  /**
   * Strength of the organic surface displacement pulse.
   *
   * @group "Animation"
   * @label "Pulse Intensity"
   * @min 0
   * @max 0.5
   * @step 0.01
   * @default 0.05
   */
  pulseIntensity?: number;

  /**
   * How much light passes through the inner core.
   *
   * @group "Core"
   * @label "Transmission"
   * @min 0
   * @max 1
   * @step 0.1
   * @default 1.0
   */
  coreTransmission?: number;

  /**
   * Refractive thickness of the inner core material.
   *
   * @group "Core"
   * @label "Thickness"
   * @min 0
   * @max 5
   * @step 0.1
   * @default 1.5
   */
  coreThickness?: number;

  /**
   * Color fringing (rainbow effect) in the inner core.
   *
   * @group "Core"
   * @label "Chromatic Aberration"
   * @min 0
   * @max 0.5
   * @step 0.01
   * @default 0.06
   */
  coreChromaticAberration?: number;

  /**
   * Aura geometry detail (icosahedron subdivision level).
   *
   * Higher values = smoother spherical appearance with more polygons.
   *
   * @group "Geometry"
   * @label "Aura Detail"
   * @min 0
   * @max 4
   * @step 1
   * @default 3
   */
  detail?: number;
}

export function BreathingSphere({
  color,
  opacity = 0.12,
  glowIntensity = 0.5,
  glowRange = 0.6,
  pulseSpeed = 0.5,
  pulseIntensity = 0.05,
  coreTransmission = 1.0,
  coreThickness = 1.5,
  coreChromaticAberration = 0.06,
  detail = 3,
}: BreathingSphereProps = {}) {
  const config = useMemo(
    () => ({
      ...DEFAULT_SPHERE_CONFIG,
      visuals: {
        ...DEFAULT_SPHERE_CONFIG.visuals,
        opacity,
        fresnelIntensityBase: glowIntensity,
        fresnelIntensityRange: glowRange,
      },
      animation: {
        ...DEFAULT_SPHERE_CONFIG.animation,
        organicPulseSpeed: pulseSpeed,
        organicPulseIntensity: pulseIntensity,
      },
      geometry: {
        ...DEFAULT_SPHERE_CONFIG.geometry,
        mainGeometryDetail: detail,
      },
    }),
    [opacity, glowIntensity, glowRange, pulseSpeed, pulseIntensity, detail],
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
    if (!color) {
      return {
        exhaleColor: new THREE.Color(VISUALS.SPHERE_COLOR_EXHALE),
        inhaleColor: new THREE.Color(VISUALS.SPHERE_COLOR_INHALE),
        coreColorExhale: new THREE.Color('#b8e2e8'), // Matches SPHERE_COLOR_EXHALE
        coreColorInhale: new THREE.Color('#ffe0b0'), // Matches SPHERE_COLOR_INHALE
      };
    }

    const baseColor = new THREE.Color(color);
    const exhale = baseColor.clone().lerp(new THREE.Color(0, 0, 0), 0.35);
    const inhale = baseColor.clone().lerp(new THREE.Color(1, 1, 1), 0.15);
    return {
      exhaleColor: exhale,
      inhaleColor: inhale,
      coreColorExhale: new THREE.Color('#b8e2e8'),
      coreColorInhale: new THREE.Color('#ffe0b0'),
    };
  }, [color]);

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

    const targetScale = breathEntity.get(sphereScale)?.value ?? 1;
    const breathPhaseValue = breathEntity.get(breathPhase)?.value ?? 0;

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

    // Enhance glow pulsing with organic overlay
    let fresnelValue =
      config.visuals.fresnelIntensityBase + breathPhaseValue * config.visuals.fresnelIntensityRange;
    if (config.animation.enableOrganicPulse) {
      const organicPulse =
        Math.sin(time * config.animation.organicPulseSpeed) *
        config.animation.organicPulseIntensity;
      fresnelValue += organicPulse;
      fresnelValue = Math.max(
        config.visuals.fresnelIntensityBase * 0.5,
        Math.min(
          config.visuals.fresnelIntensityBase +
            config.visuals.fresnelIntensityRange +
            config.animation.organicPulseIntensity * 2,
          fresnelValue,
        ),
      );
    }
    materialRef.current.uniforms.uFresnelIntensity.value = fresnelValue;
    materialRef.current.uniforms.uOpacity.value = config.visuals.opacity;
    materialRef.current.uniforms.uEmissiveIntensity.value = 0.0 + breathPhaseValue * 0.08; // Even more subtle (max 0.08)

    // 1. Core: Solid, dense center. Stiffer, less expansion (hard core feel).
    // Starts smaller on exhale, minimal expansion on inhale.
    const coreCurve = 0.5 + 0.15 * breathPhaseValue ** 3.0;
    const finalCoreScale = VISUALS.SPHERE_SCALE_MIN * coreCurve * config.layers.coreScale;

    if (coreRef.current && coreMaterialRef.current) {
      coreRef.current.scale.setScalar(finalCoreScale * entranceScale);

      // Update transmission material properties
      const coreColor = coreColorExhale.clone().lerp(coreColorInhale, breathPhaseValue);
      coreMaterialRef.current.color.copy(coreColor);

      // Modulate transmission and thickness with breath
      coreMaterialRef.current.transmission = coreTransmission;
      coreMaterialRef.current.thickness = coreThickness * (0.2 + breathPhaseValue * 0.8);
      coreMaterialRef.current.chromaticAberration = coreChromaticAberration;
      coreMaterialRef.current.roughness = 0.1 + (1.0 - breathPhaseValue) * 0.2;
    }

    // 2. Main: Standard response.
    if (meshRef.current) {
      meshRef.current.scale.setScalar(targetScale * entranceScale);
    }

    // 3. Aura: Elastic, airy outer shell. Very large early expansion (balloon fill).
    // Much larger multiplier for that "balloon" feel.
    const auraCurve = 0.8 + 2.5 * breathPhaseValue ** 0.5;
    const finalAuraScale = VISUALS.SPHERE_SCALE_MIN * auraCurve * config.layers.auraScale;

    if (auraRef.current) {
      auraRef.current.scale.setScalar(finalAuraScale * entranceScale);

      // Update Aura Shader Uniforms
      const auraMaterial = auraMaterialRef.current as THREE.ShaderMaterial;
      auraMaterial.uniforms.uTime.value = time;
      auraMaterial.uniforms.uBreathPhase.value = breathPhaseValue;
      auraMaterial.uniforms.uColor.value.copy(color);
      auraMaterial.uniforms.uOpacity.value =
        (config.layers.auraOpacityBase + breathPhaseValue * config.layers.auraOpacityRange) *
        entranceScale;
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
          transmission={coreTransmission}
          roughness={0.2}
          thickness={coreThickness}
          chromaticAberration={coreChromaticAberration}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.5}
          temporalDistortion={0.1}
        />
      </mesh>

      {/* Outer Aura - Soft atmospheric glow */}
      <mesh name="Outer Aura" ref={auraRef}>
        <icosahedronGeometry args={[1, detail]} />
        <primitive object={auraMaterialRef.current} attach="material" />
      </mesh>
    </group>
  );
}
