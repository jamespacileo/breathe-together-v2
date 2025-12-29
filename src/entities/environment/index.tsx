/**
 * Environment - Organic space background with stars, nebula, floor, and warm-cool pulsing light.
 * Exposes a minimal set of props for Triplex.
 */
import { Environment as DreiEnvironment, Sky, Sparkles, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Color } from 'three';
import { VISUALS } from '../../constants';
import { createNebulaMaterial } from '../../lib/shaders';
import { breathPhase, crystallization } from '../breath/traits';

interface EnvironmentProps {
  /**
   * Environment mood preset
   *
   * - **meditation**: Calm, grounded, subtle stars
   * - **cosmic**: Deep space, dense starfield, nebula
   * - **minimal**: Clean, no stars, subtle floor
   * - **studio**: Neutral lighting, balanced atmosphere
   *
   * @group "Configuration"
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   */
  preset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density (stars, sparkles, nebula opacity)
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

const ENVIRONMENT_PRESETS = {
  meditation: {
    enableStars: true,
    starsCount: 3000,
    enableFloor: true,
    floorOpacity: 0.3,
    enableSparkles: true,
    sparklesCount: 50,
    dreiPreset: 'dawn' as const,
    useSky: false, // Experimental: set to true to enable procedural sky
  },
  cosmic: {
    enableStars: true,
    starsCount: 8000,
    enableFloor: false,
    floorOpacity: 0,
    enableSparkles: true,
    sparklesCount: 200,
    dreiPreset: 'night' as const,
    useSky: false,
  },
  minimal: {
    enableStars: false,
    starsCount: 0,
    enableFloor: true,
    floorOpacity: 0.1,
    enableSparkles: false,
    sparklesCount: 0,
    dreiPreset: 'studio' as const,
    useSky: false,
  },
  studio: {
    enableStars: true,
    starsCount: 1000,
    enableFloor: true,
    floorOpacity: 0.5,
    enableSparkles: true,
    sparklesCount: 100,
    dreiPreset: 'studio' as const,
    useSky: false,
  },
} as const;

const STARS_RADIUS = 100;
const STARS_DEPTH = 50;
const STARS_FACTOR = 4;
const LIGHT_POSITION: [number, number, number] = [0, 5, 5];
const LIGHT_COLOR_EXHALE = '#4a7b8a'; // Deep teal-blue (calming, cool)
const LIGHT_COLOR_INHALE = '#f0c090'; // Soft peach-gold (warm, energizing)
const LIGHT_DISTANCE = 20;
const LIGHT_DECAY = 2;
const FLOOR_POSITION_Y = -4;
const FLOOR_SIZE = 100;
const NEBULA_POSITION_Z = -50;
const NEBULA_SCALE = 60;
const FOG_ENABLED = false; // Experimental: set to true to enable breath-synchronized fog

export function Environment({ preset = 'meditation', atmosphere = 0.5 }: EnvironmentProps = {}) {
  const config = ENVIRONMENT_PRESETS[preset];
  const nebulaColors = NEBULA_COLORS[preset];
  const lightRef = useRef<THREE.PointLight>(null);
  const nebulaRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Group>(null); // Drei Stars is wrapped in a group
  const breathPhaseRef = useRef(0); // Track breath phase for Sky component
  const world = useWorld();

  const colorInhale = new Color(LIGHT_COLOR_INHALE);
  const colorExhale = new Color(LIGHT_COLOR_EXHALE);

  // Create nebula shader material with preset-specific colors
  const nebulaMaterial = useMemo(() => {
    return createNebulaMaterial(nebulaColors.exhale, nebulaColors.inhale);
  }, [nebulaColors]);

  useFrame((state, delta) => {
    try {
      const breathEntity = world.queryFirst(breathPhase, crystallization);
      if (!breathEntity || !world.has(breathEntity)) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const cryst = breathEntity.get(crystallization)?.value ?? 0;

      // Store phase for Sky component rendering
      breathPhaseRef.current = phase;

      // 1. Animate light intensity, color, and position
      if (lightRef.current) {
        lightRef.current.intensity = (0.3 + phase * 0.9) * atmosphere;
        // Smooth color lerp (Inhale = Warm, Exhale = Cool)
        lightRef.current.color.copy(colorExhale).lerp(colorInhale, phase);
        // Animated position: rise on inhale (y: 5→7), lower on exhale (y: 7→5)
        lightRef.current.position.y = 5 + phase * 2;
      }

      // 2. Animate Nebula shader uniforms
      if (nebulaRef.current?.material instanceof THREE.ShaderMaterial) {
        const shaderMat = nebulaRef.current.material;
        shaderMat.uniforms.uTime.value += delta * 0.1;
        shaderMat.uniforms.uBreathPhase.value = phase;
        shaderMat.uniforms.uAtmosphere.value = atmosphere;
      }

      // 3. Modulate Star speed based on stillness (crystallization)
      if (starsRef.current) {
        starsRef.current.rotation.y += delta * 0.05 * (1 - cryst);
      }

      // 4. Animate fog density (breath-synchronized)
      if (FOG_ENABLED && state.scene.fog instanceof THREE.Fog) {
        // Exhale: denser fog (intimate, closing in) - near=5, far=15
        // Inhale: clearer fog (expansive, opening up) - near=8, far=30
        state.scene.fog.near = 5 + phase * 3;
        state.scene.fog.far = 15 + phase * 15;
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }
  });

  return (
    <>
      {/* Breath-synchronized fog (experimental feature) */}
      {FOG_ENABLED && <fog attach="fog" args={['#1a2830', 5, 20]} />}

      {/* HDR Environment for realistic reflections */}
      <DreiEnvironment preset={config.dreiPreset} environmentIntensity={0.5} />

      {/* Atmospheric sparkles (dust/pollen) */}
      {config.enableSparkles && (
        <Sparkles
          count={Math.floor(config.sparklesCount * atmosphere * 2)}
          scale={15}
          size={2}
          speed={0.4}
          opacity={0.2 * atmosphere}
          color="#e8c4a4"
        />
      )}

      {/* Organic nebula background with breath-synchronized shader */}
      <mesh ref={nebulaRef} position={[0, 0, NEBULA_POSITION_Z]} scale={NEBULA_SCALE}>
        <planeGeometry args={[1, 1]} />
        <primitive object={nebulaMaterial} attach="material" />
      </mesh>

      {/* Procedural Sky (meditation preset experimental feature) */}
      {config.useSky && (
        <Sky
          sunPosition={[
            Math.sin(breathPhaseRef.current * Math.PI) * 5, // Horizontal arc: left to right on inhale
            2 + breathPhaseRef.current ** 0.5 * 3, // Vertical rise: 2→5 on inhale
            -10, // Fixed depth
          ]}
          turbidity={8} // Clear meditation sky
          rayleigh={1.5} // Subtle atmospheric scattering
          mieCoefficient={0.005} // Soft light diffusion
          mieDirectionalG={0.8} // Directional light
        />
      )}

      {/* Star field (shown when Sky is disabled) */}
      {config.enableStars && !config.useSky && (
        <group ref={starsRef}>
          <Stars
            radius={STARS_RADIUS}
            depth={STARS_DEPTH}
            count={Math.floor(config.starsCount * atmosphere * 2)}
            factor={STARS_FACTOR}
            saturation={0.2}
            fade
            speed={1}
          />
        </group>
      )}

      <pointLight
        ref={lightRef}
        position={LIGHT_POSITION}
        color={LIGHT_COLOR_EXHALE}
        distance={LIGHT_DISTANCE}
        decay={LIGHT_DECAY}
      />

      {config.enableFloor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_POSITION_Y, 0]} receiveShadow>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <meshStandardMaterial
            color="#0a0a1a"
            transparent
            opacity={config.floorOpacity}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}
    </>
  );
}
