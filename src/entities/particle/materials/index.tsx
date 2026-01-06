/**
 * Shard Material Variants
 *
 * Provides multiple material implementations for particle shards:
 * - frosted: Original FrostedGlassMaterial with custom refraction shader
 * - transmission: drei MeshTransmissionMaterial for realistic glass
 * - simple: Simple transparent MeshPhysicalMaterial fallback
 */

import * as THREE from 'three';
import { createFrostedGlassMaterial } from '../FrostedGlassMaterial';
import { createBubbleGlassMaterial } from './BubbleGlassMaterial';
import { createCelShadedGlassMaterial } from './CelShadedGlassMaterial';
import { createChromaticGlassMaterial } from './ChromaticGlassMaterial';
import { createPolishedGlassMaterial } from './PolishedGlassMaterial';
import { createTransmissionMaterial } from './TransmissionMaterial';

export type ShardMaterialType =
  | 'frosted'
  | 'transmission'
  | 'simple'
  | 'polished'
  | 'cel'
  | 'bubble'
  | 'chromatic';

export interface MaterialVariant {
  material: THREE.Material;
  needsBreathPhaseUpdate: boolean;
  needsTimeUpdate: boolean;
  usesRefractionPipeline: boolean;
}

/**
 * Create frosted glass material (original custom shader)
 */
export function createFrostedMaterial(): MaterialVariant {
  return {
    material: createFrostedGlassMaterial(true),
    needsBreathPhaseUpdate: true,
    needsTimeUpdate: true,
    usesRefractionPipeline: true,
  };
}

/**
 * Create simple transparent material (MeshPhysicalMaterial)
 * Vibrant colored glass with excellent facet visibility
 */
export function createSimpleMaterial(): MaterialVariant {
  const material = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.85, // Higher opacity for better color visibility
    metalness: 0.0, // Non-metallic for true glass
    roughness: 0.15, // Slight diffusion for better facet contrast
    envMapIntensity: 0.8, // Reduced to let colors shine
    clearcoat: 0.9, // High clearcoat for glossy finish
    clearcoatRoughness: 0.1, // Subtle roughness on coat
    reflectivity: 0.3, // Lower to emphasize color over reflections
    side: THREE.FrontSide,
    depthWrite: true,
    vertexColors: true,
    // Emissive boost for self-illumination (helps colors pop in dark scenes)
    emissiveIntensity: 0.2,
  });

  return {
    material,
    needsBreathPhaseUpdate: false,
    needsTimeUpdate: false,
    usesRefractionPipeline: false,
  };
}

/**
 * Create transmission glass material (custom shader with glass properties)
 * Simplified glass shader with mood color tinting
 */
export function createTransmissionGlassMaterial(): MaterialVariant {
  const material = createTransmissionMaterial({
    roughness: 0.1,
  });

  return {
    material,
    needsBreathPhaseUpdate: false, // Glass shader doesn't use breath phase
    needsTimeUpdate: false, // Glass shader doesn't use time
    usesRefractionPipeline: false,
  };
}

/**
 * Create polished glass material (custom shader)
 * Refined glass with Schlick's Fresnel and sharp specular highlights
 */
export function createPolishedMaterial(): MaterialVariant {
  return {
    material: createPolishedGlassMaterial(true),
    needsBreathPhaseUpdate: true,
    needsTimeUpdate: true,
    usesRefractionPipeline: false,
  };
}

/**
 * Create cel-shaded glass material (toon bands)
 * Stylized cartoon aesthetic with discrete visibility bands
 */
export function createCelMaterial(): MaterialVariant {
  return {
    material: createCelShadedGlassMaterial(true, 3.0),
    needsBreathPhaseUpdate: true,
    needsTimeUpdate: true,
    usesRefractionPipeline: false,
  };
}

/**
 * Create bubble glass material (candy/playful)
 * High saturation playful aesthetic with thick rim glow
 */
export function createBubbleMaterial(): MaterialVariant {
  return {
    material: createBubbleGlassMaterial(true),
    needsBreathPhaseUpdate: true,
    needsTimeUpdate: true,
    usesRefractionPipeline: false,
  };
}

/**
 * Create chromatic glass material (prism effect)
 * RGB separation at edges for rainbow highlights
 */
export function createChromaticMaterial(): MaterialVariant {
  return {
    material: createChromaticGlassMaterial(true, 0.6),
    needsBreathPhaseUpdate: true,
    needsTimeUpdate: true,
    usesRefractionPipeline: false,
  };
}

/**
 * Factory function to create material by type
 */
export function createShardMaterial(type: ShardMaterialType): MaterialVariant {
  switch (type) {
    case 'frosted':
      return createFrostedMaterial();
    case 'simple':
      return createSimpleMaterial();
    case 'transmission':
      return createTransmissionGlassMaterial();
    case 'polished':
      return createPolishedMaterial();
    case 'cel':
      return createCelMaterial();
    case 'bubble':
      return createBubbleMaterial();
    case 'chromatic':
      return createChromaticMaterial();
    default:
      console.warn(`Unknown material type: ${type}, using polished`);
      return createPolishedMaterial();
  }
}
