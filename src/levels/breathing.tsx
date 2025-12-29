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
import { VISUALS } from '../constants';
import { BreathingSphere } from '../entities/breathingSphere';
import { Environment } from '../entities/environment';
import { ParticleRenderer, ParticleSpawner } from '../entities/particle';
import type { BreathingLevelProps } from '../types/sceneProps';

export function BreathingLevel({
  // Visual defaults (literal values - Triplex compatible)
  backgroundColor = '#0a0f1a',
  sphereColor = '#d4a574',
  sphereOpacity = 0.12,
  sphereDetail = 3, // Smoother (was 2) - matches BreathingSphere component

  // Lighting defaults
  ambientIntensity = 0.15,
  ambientColor = '#a8b8d0',
  keyIntensity = 0.2,
  keyColor = '#e89c5c',

  // Environment defaults
  preset = 'studio',
  enableSparkles = true,
  sparklesCount = 100,
  starsCount = 5000,
  floorColor = '#0a0a1a',
  enableStars = true,
  enableFloor = true,
  floorOpacity = 0.5,
  enablePointLight = true,
  lightIntensityMin = 0.3, // Gentle base - matches Environment component
  lightIntensityRange = 0.9, // Peak at 1.2, reduced from 3.0 - matches Environment component

  // Post-processing defaults
  bloomIntensity = 0.5,
  bloomThreshold = 1.0,
  bloomSmoothing = 0.1,

  // Particle defaults
  particleCount = 300,
}: Partial<BreathingLevelProps> = {}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />

      {/* Refined layered lighting (all props editable in Triplex) */}
      {/* Replaced Lighting component with direct light elements */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <pointLight position={[10, 10, 10]} intensity={keyIntensity} color={keyColor} />
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
        preset={preset}
        enableSparkles={enableSparkles}
        sparklesCount={sparklesCount}
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
          intensity={bloomIntensity}
          luminanceThreshold={bloomThreshold}
          luminanceSmoothing={bloomSmoothing}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
