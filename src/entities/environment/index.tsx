/**
 * Environment - Organic space background with stars, nebula, floor, and warm-cool pulsing light.
 * Exposes a minimal set of props for Triplex.
 */
import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import * as THREE from 'three';
import { Color } from 'three';
import { breathPhase, crystallization } from '../breath/traits';

interface EnvironmentProps {
  /**
   * Enable stars background.
   *
   * @default true
   */
  enableStars?: boolean;

  /**
   * Number of stars in starfield.
   *
   * @min 1000
   * @max 10000
   * @step 500
   * @default 5000
   */
  starsCount?: number;

  /**
   * Enable floor plane.
   *
   * @default true
   */
  enableFloor?: boolean;

  /**
   * Floor plane color.
   *
   * @type color
   * @default "#0a0a1a"
   */
  floorColor?: string;

  /**
   * Floor material opacity.
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.5
   */
  floorOpacity?: number;

  /**
   * Enable pulsing point light.
   *
   * @default true
   */
  enablePointLight?: boolean;

  /**
   * Base point light intensity (non-breathing).
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 0.5
   */
  lightIntensityMin?: number;

  /**
   * Point light breathing modulation range.
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 1.5
   */
  lightIntensityRange?: number;
}

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

export function Environment({
  enableStars = true,
  enableFloor = true,
  enablePointLight = true,
  starsCount = 5000,
  floorColor = '#0a0a1a',
  floorOpacity = 0.5,
  lightIntensityMin = 1.0, // Doubled from 0.5
  lightIntensityRange = 3.0, // Doubled from 1.5 (total range: 1.0-4.0)
}: EnvironmentProps = {}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const nebulaRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<any>(null); // Drei Stars doesn't export its type easily
  const world = useWorld();

  const colorInhale = new Color(LIGHT_COLOR_INHALE);
  const colorExhale = new Color(LIGHT_COLOR_EXHALE);

  useFrame((_state, delta) => {
    const breathEntity = world.queryFirst(breathPhase, crystallization);
    const phase = breathEntity?.get(breathPhase)?.value ?? 0;
    const cryst = breathEntity?.get(crystallization)?.value ?? 0;

    // 1. Animate light intensity and color
    if (lightRef.current) {
      lightRef.current.intensity = lightIntensityMin + phase * lightIntensityRange;
      // Smooth color lerp (Inhale = Warm, Exhale = Cool)
      lightRef.current.color.copy(colorExhale).lerp(colorInhale, phase);
    }

    // 2. Animate Nebula (Pulse scale and opacity)
    if (nebulaRef.current) {
      const nebulaScale = NEBULA_SCALE * (1 + phase * 0.1); // 10% pulse
      nebulaRef.current.scale.set(nebulaScale, nebulaScale, 1);
      if (nebulaRef.current.material instanceof THREE.MeshBasicMaterial) {
        nebulaRef.current.material.opacity = 0.4 + phase * 0.2; // 0.4 -> 0.6
      }
    }

    // 3. Modulate Star speed based on stillness (crystallization)
    // Less movement during "Hold" phases
    if (starsRef.current) {
      // starsRef.current is the group containing the points
      // Drei stars update logic is internal, but we can scale their time if we were using a custom shader.
      // Since it's a Drei component, we might just be limited to the speed prop.
      // However, starsRef.current.rotation.y is a simple way to add some motion.
      starsRef.current.rotation.y += delta * 0.05 * (1 - cryst);
    }
  });

  return (
    <>
      {/* Organic nebula background with subtle atmospheric depth */}
      <mesh ref={nebulaRef} position={[0, 0, NEBULA_POSITION_Z]} scale={NEBULA_SCALE}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1a2830" transparent opacity={0.5} />
      </mesh>

      {enableStars && (
        <group ref={starsRef}>
          <Stars
            radius={STARS_RADIUS}
            depth={STARS_DEPTH}
            count={starsCount}
            factor={STARS_FACTOR}
            saturation={0.2}
            fade
            speed={1}
          />
        </group>
      )}

      {enablePointLight && (
        <pointLight
          ref={lightRef}
          position={LIGHT_POSITION}
          color={LIGHT_COLOR_EXHALE}
          distance={LIGHT_DISTANCE}
          decay={LIGHT_DECAY}
        />
      )}

      {enableFloor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_POSITION_Y, 0]} receiveShadow>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <meshStandardMaterial
            color={floorColor}
            transparent
            opacity={floorOpacity}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}
    </>
  );
}
