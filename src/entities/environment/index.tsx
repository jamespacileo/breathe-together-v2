/**
 * Environment - Organic space background with stars, nebula, floor, and warm-cool pulsing light.
 * Exposes a minimal set of props for Triplex.
 */
import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import type * as THREE from 'three';
import { breathPhase } from '../breath/traits';

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
  lightIntensityMin = 0.5,
  lightIntensityRange = 1.5,
}: EnvironmentProps = {}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const world = useWorld();

  useFrame(() => {
    if (!lightRef.current) return;

    const breathEntity = world.queryFirst(breathPhase);
    const phase = breathEntity?.get(breathPhase)?.value ?? 0;

    // Animate light intensity with breathing
    lightRef.current.intensity = lightIntensityMin + phase * lightIntensityRange;

    // Animate light color with breathing phase (cool exhale → warm inhale)
    lightRef.current.color.setStyle(phase < 0.5 ? LIGHT_COLOR_EXHALE : LIGHT_COLOR_INHALE);
  });

  return (
    <>
      {/* Organic nebula background with earthy-cosmic gradient - subtle atmospheric depth */}
      <mesh position={[0, 0, NEBULA_POSITION_Z]} scale={NEBULA_SCALE}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#16201a" transparent opacity={0.3} />
      </mesh>

      {enableStars && (
        <Stars
          radius={STARS_RADIUS}
          depth={STARS_DEPTH}
          count={starsCount}
          factor={STARS_FACTOR}
          saturation={0.2}
          fade
          speed={1}
        />
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
