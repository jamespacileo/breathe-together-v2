/**
 * Environment - Organic space background with stars, nebula, floor, and warm-cool pulsing light.
 * Exposes a minimal set of props for Triplex.
 */
import { Environment as DreiEnvironment, Sparkles, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import * as THREE from 'three';
import { Color } from 'three';
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

const ENVIRONMENT_PRESETS = {
  meditation: {
    enableStars: true,
    starsCount: 3000,
    enableFloor: true,
    floorOpacity: 0.3,
    enableSparkles: true,
    sparklesCount: 50,
    dreiPreset: 'dawn' as const,
  },
  cosmic: {
    enableStars: true,
    starsCount: 8000,
    enableFloor: false,
    floorOpacity: 0,
    enableSparkles: true,
    sparklesCount: 200,
    dreiPreset: 'night' as const,
  },
  minimal: {
    enableStars: false,
    starsCount: 0,
    enableFloor: true,
    floorOpacity: 0.1,
    enableSparkles: false,
    sparklesCount: 0,
    dreiPreset: 'studio' as const,
  },
  studio: {
    enableStars: true,
    starsCount: 1000,
    enableFloor: true,
    floorOpacity: 0.5,
    enableSparkles: true,
    sparklesCount: 100,
    dreiPreset: 'studio' as const,
  },
} as const;

const STARS_RADIUS = 100;
const STARS_DEPTH = 50;
const STARS_FACTOR = 4;
const LIGHT_POSITION: [number, number, number] = [0, 5, 5];
const LIGHT_COLOR_EXHALE = '#6ba8a8'; // Cool teal-green (calming)
const LIGHT_COLOR_INHALE = '#e8c4a4'; // Warm peach-sand (energizing)
const LIGHT_DISTANCE = 20;
const LIGHT_DECAY = 2;
const FLOOR_POSITION_Y = -4;
const FLOOR_SIZE = 100;
const NEBULA_POSITION_Z = -50;
const NEBULA_SCALE = 60;

export function Environment({ preset = 'meditation', atmosphere = 0.5 }: EnvironmentProps = {}) {
  const config = ENVIRONMENT_PRESETS[preset];
  const lightRef = useRef<THREE.PointLight>(null);
  const nebulaRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Group>(null); // Drei Stars is wrapped in a group
  const world = useWorld();

  const colorInhale = new Color(LIGHT_COLOR_INHALE);
  const colorExhale = new Color(LIGHT_COLOR_EXHALE);

  useFrame((_state, delta) => {
    try {
      const breathEntity = world.queryFirst(breathPhase, crystallization);
      if (!breathEntity || !world.has(breathEntity)) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const cryst = breathEntity.get(crystallization)?.value ?? 0;

      // 1. Animate light intensity and color
      if (lightRef.current) {
        lightRef.current.intensity = (0.3 + phase * 0.9) * atmosphere;
        // Smooth color lerp (Inhale = Warm, Exhale = Cool)
        lightRef.current.color.copy(colorExhale).lerp(colorInhale, phase);
      }

      // 2. Animate Nebula (Pulse scale and opacity)
      if (nebulaRef.current) {
        const nebulaScale = NEBULA_SCALE * (1 + phase * 0.1); // 10% pulse
        nebulaRef.current.scale.set(nebulaScale, nebulaScale, 1);
        if (nebulaRef.current.material instanceof THREE.MeshBasicMaterial) {
          nebulaRef.current.material.opacity = (0.4 + phase * 0.2) * atmosphere;
        }
      }

      // 3. Modulate Star speed based on stillness (crystallization)
      if (starsRef.current) {
        starsRef.current.rotation.y += delta * 0.05 * (1 - cryst);
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }
  });

  return (
    <>
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

      {/* Organic nebula background with subtle atmospheric depth */}
      <mesh ref={nebulaRef} position={[0, 0, NEBULA_POSITION_Z]} scale={NEBULA_SCALE}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1a2830" transparent opacity={0.5 * atmosphere} />
      </mesh>

      {config.enableStars && (
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
