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
   * Enable stars background (distant starfield).
   *
   * **When to adjust:** Disable for minimal aesthetic, enable for cosmic depth
   * **Interacts with:** preset (environment affects star colors)
   *
   * @default true
   */
  enableStars?: boolean;

  /**
   * Number of stars in starfield.
   *
   * Higher = denser starfield with more depth cues.
   *
   * **When to adjust:** Lower for performance on mobile, higher for immersion on desktop
   * **Typical range:** Sparse (1000) → Balanced (5000, default) → Dense (10000)
   * **Interacts with:** enableStars (only applies if enabled)
   * **Performance note:** Linear cost; 5000→10000 doubles initialization
   *
   * @min 1000
   * @max 10000
   * @step 500
   * @default 5000
   */
  starsCount?: number;

  /**
   * Enable grounding floor plane (reflection receiver).
   *
   * **When to adjust:** Disable for floating/weightless aesthetic, enable for grounding
   * **Interacts with:** floorColor, floorOpacity (appearance if enabled)
   *
   * @default true
   */
  enableFloor?: boolean;

  /**
   * Floor plane color (acts as environmental anchor).
   *
   * **When to adjust:** Match background for continuity, or contrast for definition
   * **Typical range:** Match background → Slightly lighter/darker → Strong contrast
   * **Interacts with:** backgroundColor, enableFloor, floorOpacity
   *
   * @type color
   * @default "#0a0a1a"
   */
  floorColor?: string;

  /**
   * Floor material opacity (blends with background).
   *
   * Lower = subtle grounding, higher = visible plane.
   *
   * **When to adjust:** Lower for minimal presence, higher for clear horizon
   * **Typical range:** Subtle (0.2) → Balanced (0.5, default) → Visible (0.8)
   * **Interacts with:** floorColor, backgroundColor (blending)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.5
   */
  floorOpacity?: number;

  /**
   * Enable atmospheric point light (breathing-synchronized glow).
   *
   * Pulsing warm-cool light that changes with breathing cycle.
   *
   * **When to adjust:** Disable for flatness, enable for warmth and breathing feedback
   * **Interacts with:** lightIntensityMin, lightIntensityRange
   *
   * @default true
   */
  enablePointLight?: boolean;

  /**
   * Point light base intensity (non-breathing component).
   *
   * **When to adjust:** Raise for always-visible glow, lower for subtle effect
   * **Typical range:** Subtle (0.1) → Gentle (0.3, default) → Bright (0.8)
   * **Interacts with:** lightIntensityRange (total intensity = min + phase*range)
   * **Performance note:** No impact; single light
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 0.3
   */
  lightIntensityMin?: number;

  /**
   * Point light breathing modulation amplitude.
   *
   * Range of intensity change during breath cycle. Higher = more pulsing effect.
   * Total intensity = lightIntensityMin + (breathPhase * lightIntensityRange).
   *
   * **When to adjust:** Increase for breathing feedback, decrease for steadiness
   * **Typical range:** Subtle (0.3) → Balanced (0.9, default) → Strong (2.0)
   * **Interacts with:** lightIntensityMin, enablePointLight
   * **Performance note:** No impact; single light
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 0.9
   */
  lightIntensityRange?: number;

  /**
   * Environment preset for global reflections and lighting.
   *
   * HDR environment affects how the sphere appears (reflections, ambient color).
   * Different presets create different moods: studio=neutral, sunset=warm, night=cool.
   *
   * **When to adjust:** Match desired time-of-day or mood
   * **Typical range:** studio (neutral, production) → sunset (warm, energetic) → night (cool, calm)
   * **Interacts with:** All lighting colors (environment influences perceived saturation)
   *
   * @default "studio"
   */
  preset?:
    | 'apartment'
    | 'city'
    | 'dawn'
    | 'forest'
    | 'lobby'
    | 'night'
    | 'park'
    | 'studio'
    | 'sunset'
    | 'warehouse';

  /**
   * Enable atmospheric sparkles (floating particles/dust effect).
   *
   * **When to adjust:** Enable for magical/ethereal mood, disable for clean aesthetic
   * **Interacts with:** sparklesCount (density if enabled)
   *
   * @default true
   */
  enableSparkles?: boolean;

  /**
   * Number of atmospheric sparkles.
   *
   * Simulates floating dust, pollen, or magical particles.
   *
   * **When to adjust:** Lower for subtle depth cues, higher for magical atmosphere
   * **Typical range:** Sparse (10) → Balanced (100, default) → Dense (500)
   * **Interacts with:** enableSparkles (only applies if enabled)
   * **Performance note:** Minimal impact; simple particle system
   *
   * @min 10
   * @max 500
   * @step 10
   * @default 100
   */
  sparklesCount?: number;
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
  enableSparkles = true,
  sparklesCount = 100,
  starsCount = 5000,
  floorColor = '#0a0a1a',
  floorOpacity = 0.5,
  lightIntensityMin = 0.3, // Gentle base (reduced from 1.0)
  lightIntensityRange = 0.9, // Peak at 1.2 (reduced from 3.0, total range: 0.3-1.2)
  preset = 'studio',
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
      {/* HDR Environment for realistic reflections */}
      <DreiEnvironment preset={preset} environmentIntensity={0.5} />

      {/* Atmospheric sparkles (dust/pollen) */}
      {enableSparkles && (
        <Sparkles
          count={sparklesCount}
          scale={15}
          size={2}
          speed={0.4}
          opacity={0.2}
          color="#e8c4a4"
        />
      )}

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
