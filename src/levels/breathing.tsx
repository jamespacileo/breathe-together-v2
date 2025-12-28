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

import {
  ENVIRONMENT_DEFAULTS,
  getDefaultValues,
  LIGHTING_DEFAULTS,
  VISUAL_DEFAULTS,
} from '../config/sceneDefaults';
import { BreathingSphere } from '../entities/breathingSphere';
import { Environment } from '../entities/environment';
import { Lighting } from '../entities/lighting';
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
      <Lighting
        ambientIntensity={ambientIntensity}
        ambientColor={ambientColor}
        keyIntensity={keyIntensity}
        keyColor={keyColor}
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

      {/* Temporarily disabled to debug flickering issues
			<EffectComposer multisampling={4} stencilBuffer={false}>
				<Bloom
					intensity={1.0}
					luminanceThreshold={1.0}
					luminanceSmoothing={0.9}
					mipmapBlur
				/>
			</EffectComposer>
			*/}
    </>
  );
}
