import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../../constants';
import { createGradientMaterial, createNebulaMaterial } from '../../lib/shaders';
import { breathPhase } from '../breath/traits';

export interface BackdropProps {
  /**
   * Backdrop mood preset
   * @group "Configuration"
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   */
  preset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density (nebula opacity)
   * @group "Configuration"
   * @min 0
   * @max 1
   * @step 0.1
   */
  atmosphere?: number;
}

const NEBULA_COLORS = {
  meditation: {
    exhale: VISUALS.NEBULA_COLOR_EXHALE_MEDITATION,
    inhale: VISUALS.NEBULA_COLOR_INHALE_MEDITATION,
  },
  cosmic: {
    exhale: VISUALS.NEBULA_COLOR_EXHALE_COSMIC,
    inhale: VISUALS.NEBULA_COLOR_INHALE_COSMIC,
  },
  minimal: {
    exhale: VISUALS.NEBULA_COLOR_EXHALE_MINIMAL,
    inhale: VISUALS.NEBULA_COLOR_INHALE_MINIMAL,
  },
  studio: {
    exhale: VISUALS.NEBULA_COLOR_EXHALE_STUDIO,
    inhale: VISUALS.NEBULA_COLOR_INHALE_STUDIO,
  },
} as const;

const GRADIENT_COLORS = {
  meditation: {
    bottomExhale: VISUALS.GRADIENT_BOTTOM_EXHALE_MEDITATION,
    topExhale: VISUALS.GRADIENT_TOP_EXHALE_MEDITATION,
    bottomInhale: VISUALS.GRADIENT_BOTTOM_INHALE_MEDITATION,
    topInhale: VISUALS.GRADIENT_TOP_INHALE_MEDITATION,
  },
  cosmic: {
    bottomExhale: VISUALS.GRADIENT_BOTTOM_EXHALE_COSMIC,
    topExhale: VISUALS.GRADIENT_TOP_EXHALE_COSMIC,
    bottomInhale: VISUALS.GRADIENT_BOTTOM_INHALE_COSMIC,
    topInhale: VISUALS.GRADIENT_TOP_INHALE_COSMIC,
  },
  minimal: {
    bottomExhale: VISUALS.GRADIENT_BOTTOM_EXHALE_MINIMAL,
    topExhale: VISUALS.GRADIENT_TOP_EXHALE_MINIMAL,
    bottomInhale: VISUALS.GRADIENT_BOTTOM_INHALE_MINIMAL,
    topInhale: VISUALS.GRADIENT_TOP_INHALE_MINIMAL,
  },
  studio: {
    bottomExhale: VISUALS.GRADIENT_BOTTOM_EXHALE_STUDIO,
    topExhale: VISUALS.GRADIENT_TOP_EXHALE_STUDIO,
    bottomInhale: VISUALS.GRADIENT_BOTTOM_INHALE_STUDIO,
    topInhale: VISUALS.GRADIENT_TOP_INHALE_STUDIO,
  },
} as const;

const NEBULA_POSITION_Z = -50;
const NEBULA_SCALE = 60;
const GRADIENT_POSITION_Z = -100;
const GRADIENT_SCALE = 100;

export function Backdrop({ preset = 'meditation', atmosphere = 0.5 }: BackdropProps) {
  const nebulaColors = NEBULA_COLORS[preset];
  const gradientColors = GRADIENT_COLORS[preset];
  const nebulaRef = useRef<THREE.Mesh>(null);
  const gradientRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  const nebulaMaterial = useMemo(() => {
    return createNebulaMaterial(nebulaColors.exhale, nebulaColors.inhale);
  }, [nebulaColors]);

  const gradientMaterial = useMemo(() => {
    return createGradientMaterial(
      gradientColors.bottomExhale,
      gradientColors.topExhale,
      gradientColors.bottomInhale,
      gradientColors.topInhale,
    );
  }, [gradientColors]);

  useFrame((_state, delta) => {
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity || !world.has(breathEntity)) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;

      if (nebulaRef.current?.material instanceof THREE.ShaderMaterial) {
        const shaderMat = nebulaRef.current.material;
        shaderMat.uniforms.uTime.value += delta * 0.1;
        shaderMat.uniforms.uBreathPhase.value = phase;
        shaderMat.uniforms.uAtmosphere.value = atmosphere;
      }

      if (gradientRef.current?.material instanceof THREE.ShaderMaterial) {
        const shaderMat = gradientRef.current.material;
        shaderMat.uniforms.uBreathPhase.value = phase;
      }
    } catch (_e) {
      // Silently catch ECS errors
    }
  });

  return (
    <>
      <mesh ref={gradientRef} position={[0, 0, GRADIENT_POSITION_Z]} scale={GRADIENT_SCALE}>
        <planeGeometry args={[1, 1]} />
        <primitive object={gradientMaterial} attach="material" />
      </mesh>

      <mesh ref={nebulaRef} position={[0, 0, NEBULA_POSITION_Z]} scale={NEBULA_SCALE}>
        <planeGeometry args={[1, 1]} />
        <primitive object={nebulaMaterial} attach="material" />
      </mesh>
    </>
  );
}
