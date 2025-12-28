/**
 * BreathingSphere - Central sphere that scales with breathing
 * Inversely animated compared to particles (shrinks on exhale, grows on inhale)
 * Features a fresnel edge glow that intensifies with breathing
 * Entrance animation: scales from 0 with smooth overshoot
 */
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
   * **When to adjust:** Change overall hue of the breathing orb
   *
   * @type color
   * @default "#4dd9e8"
   */
  color?: string;

  /**
   * Sphere transparency.
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.15
   */
  opacity?: number;

  /**
   * Geometry detail for the icosahedron sphere (0-4).
   *
   * @min 0
   * @max 4
   * @step 1
   * @default 2
   */
  detail?: number;
}

export function BreathingSphere({
  color,
  opacity = VISUALS.SPHERE_OPACITY,
  detail = DEFAULT_SPHERE_CONFIG.geometry.mainGeometryDetail,
}: BreathingSphereProps = {}) {
  const config = useMemo(
    () => ({
      ...DEFAULT_SPHERE_CONFIG,
      visuals: {
        ...DEFAULT_SPHERE_CONFIG.visuals,
        opacity,
      },
      geometry: {
        ...DEFAULT_SPHERE_CONFIG.geometry,
        mainGeometryDetail: detail,
      },
    }),
    [opacity, detail],
  );

  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const entranceStartTimeRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const materialRef = useRef(createFresnelMaterial(0.05));
  const coreMaterialRef = useRef(
    new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.75,
      emissive: new THREE.Color('#a8d8e0'),
      emissiveIntensity: 0.4,
      shininess: 100,
      blending: THREE.NormalBlending,
    }),
  );
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
        coreColorExhale: new THREE.Color('#a8d8e0'), // Saturated cool blue
        coreColorInhale: new THREE.Color('#ffe8c8'), // Saturated warm cream
      };
    }

    const baseColor = new THREE.Color(color);
    const exhale = baseColor.clone().lerp(new THREE.Color(0, 0, 0), 0.35);
    const inhale = baseColor.clone().lerp(new THREE.Color(1, 1, 1), 0.15);
    return {
      exhaleColor: exhale,
      inhaleColor: inhale,
      coreColorExhale: new THREE.Color('#a8d8e0'),
      coreColorInhale: new THREE.Color('#ffe8c8'),
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

    // 1. Core: Solid, dense center. Stiff expansion (late bloom).
    const coreCurve = 0.7 + 0.3 * breathPhaseValue ** 2.5;
    const finalCoreScale = VISUALS.SPHERE_SCALE_MIN * coreCurve * config.layers.coreScale;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(finalCoreScale * entranceScale);
      coreMaterialRef.current.opacity =
        (config.layers.coreOpacityBase + breathPhaseValue * config.layers.coreOpacityRange) *
        entranceScale;
      // Soft warm glow: core color + emissive both transition with breath (cool exhale → warm inhale)
      const coreColor = coreColorExhale.clone().lerp(coreColorInhale, breathPhaseValue);
      coreMaterialRef.current.color.copy(coreColor);
      coreMaterialRef.current.emissive.copy(coreColor);
      coreMaterialRef.current.emissiveIntensity = 0.3 + breathPhaseValue * 0.3;
    }

    // 2. Main: Standard response.
    meshRef.current.scale.setScalar(targetScale * entranceScale);

    // 3. Aura: Elastic, airy outer shell. Early expansion (filling up).
    const auraCurve = 1.0 + 1.2 * breathPhaseValue ** 0.5;
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
    <group>
      {/* Main Sphere with organic displacement */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, detail]} />
        <primitive object={materialRef.current} attach="material" />
      </mesh>

      {/* Inner Core - Glowing center */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={coreMaterialRef.current} attach="material" />
      </mesh>

      {/* Outer Aura - Soft atmospheric glow */}
      <mesh ref={auraRef}>
        <icosahedronGeometry args={[1, detail]} />
        <primitive object={auraMaterialRef.current} attach="material" />
      </mesh>
    </group>
  );
}
