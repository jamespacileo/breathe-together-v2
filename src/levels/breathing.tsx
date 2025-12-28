/**
 * BreathingLevel - Main breathing meditation scene
 * Combines breathing sphere and user presence visualization
 *
 * Triplex Integration (Dec 2024):
 * - All component props exposed as top-level props for easy visual editing
 * - Maintains flat prop structure for Triplex sidebar compatibility
 * - Advanced component props accessible by drilling into child components
 * - Breathing animation runs in background (breathSystem enabled in .triplex/providers.tsx)
 *
 * Uses centralized defaults from src/config/sceneDefaults.ts for single source of truth.
 */

import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import {
  ENVIRONMENT_DEFAULTS,
  getDefaultValues,
  LIGHTING_DEFAULTS,
  VISUAL_DEFAULTS,
} from '../config/sceneDefaults';
import { VISUALS } from '../constants';
import { BreathingSphere } from '../entities/breathingSphere';
import { Environment } from '../entities/environment';
import { ParticleRenderer, ParticleSpawner } from '../entities/particle';
import type { BreathingLevelProps } from '../types/sceneProps';

// Merge all visual, lighting, and environment defaults for convenient spreading
const DEFAULT_PROPS = {
  ...getDefaultValues(VISUAL_DEFAULTS),
  ...getDefaultValues(LIGHTING_DEFAULTS),
  ...getDefaultValues(ENVIRONMENT_DEFAULTS),
} as const;

export function BreathingLevel({
  // Visual defaults
  backgroundColor = DEFAULT_PROPS.backgroundColor,
  sphereColor = DEFAULT_PROPS.sphereColor,
  sphereOpacity = DEFAULT_PROPS.sphereOpacity,
  sphereDetail = DEFAULT_PROPS.sphereDetail,

  // Lighting defaults
  ambientIntensity = DEFAULT_PROPS.ambientIntensity,
  ambientColor = DEFAULT_PROPS.ambientColor,
  keyIntensity = DEFAULT_PROPS.keyIntensity,
  keyColor = DEFAULT_PROPS.keyColor,

  // Environment defaults
  starsCount = DEFAULT_PROPS.starsCount,
  floorColor = DEFAULT_PROPS.floorColor,
  enableStars = DEFAULT_PROPS.enableStars,
  enableFloor = DEFAULT_PROPS.enableFloor,
  floorOpacity = DEFAULT_PROPS.floorOpacity,
  enablePointLight = DEFAULT_PROPS.enablePointLight,
  lightIntensityMin = DEFAULT_PROPS.lightIntensityMin,
  lightIntensityRange = DEFAULT_PROPS.lightIntensityRange,

  // Particle defaults
  particleCount = DEFAULT_PROPS.particleCount,
}: Partial<BreathingLevelProps> = {}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />

      {/* Refined layered lighting (all props editable in Triplex) */}
      {/* Replaced Lighting component with direct light elements */}
      <ambientLight intensity={VISUALS.AMBIENT_LIGHT_INTENSITY} />
      <pointLight
        position={[10, 10, 10]}
        intensity={VISUALS.KEY_LIGHT_INTENSITY_MIN}
        color={VISUALS.KEY_LIGHT_COLOR}
      />
      <pointLight
        position={[-10, 5, -10]}
        intensity={VISUALS.FILL_LIGHT_INTENSITY}
        color={VISUALS.FILL_LIGHT_COLOR}
      />
      <pointLight
        position={[0, -5, 5]}
        intensity={VISUALS.RIM_LIGHT_INTENSITY}
        color={VISUALS.RIM_LIGHT_COLOR}
      />

      <Environment
        starsCount={starsCount}
        floorColor={floorColor}
        enableStars={enableStars}
        enableFloor={enableFloor}
        floorOpacity={floorOpacity}
        enablePointLight={enablePointLight}
        lightIntensityMin={lightIntensityMin}
        lightIntensityRange={lightIntensityRange}
      />

      <BreathingSphere color={sphereColor} opacity={sphereOpacity} detail={sphereDetail} />

      <ParticleSpawner totalCount={particleCount} />
      <ParticleRenderer totalCount={particleCount} />

      <EffectComposer multisampling={4} stencilBuffer={false} frameBufferType={HalfFloatType}>
        <Bloom
          intensity={0.15} // Slightly stronger, now that threshold is lower (was 0.1)
          luminanceThreshold={0.75} // Allows Fresnel glow to bloom (was 1.0)
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
