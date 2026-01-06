/**
 * FrostedPhysicalMaterial - Physical glass shader using MeshPhysicalMaterial
 *
 * Designed as a modern replacement for the legacy refraction pipeline:
 * - Uses transmission + roughness for frosted glass
 * - Supports InstancedMesh colors via vertexColors
 * - Plays nicely with R3F/postprocessing
 */

import * as THREE from 'three';

export interface FrostedPhysicalMaterialConfig {
  /** Base glass tint @default '#f7efe2' */
  color?: THREE.ColorRepresentation;
  /** Transmission amount (0-1) @default 0.62 */
  transmission?: number;
  /** Surface roughness (0-1) @default 0.32 */
  roughness?: number;
  /** Index of refraction (1-2.5) @default 1.35 */
  ior?: number;
  /** Thickness for volume scattering @default 0.75 */
  thickness?: number;
  /** Overall opacity @default 0.82 */
  opacity?: number;
  /** Environment intensity @default 1.0 */
  envMapIntensity?: number;
  /** Clearcoat intensity @default 0.85 */
  clearcoat?: number;
  /** Clearcoat roughness @default 0.22 */
  clearcoatRoughness?: number;
  /** Attenuation distance for color absorption @default 0.4 */
  attenuationDistance?: number;
  /** Attenuation color @default '#f0d8c0' */
  attenuationColor?: THREE.ColorRepresentation;
}

/**
 * Create a frosted physical glass material.
 *
 * @param instanced - Whether to enable vertexColors for InstancedMesh (default: true)
 */
export function createFrostedPhysicalMaterial(
  instanced = true,
  config: FrostedPhysicalMaterialConfig = {},
): THREE.MeshPhysicalMaterial {
  const {
    color = '#f7efe2',
    transmission = 0.62,
    roughness = 0.32,
    ior = 1.35,
    thickness = 0.75,
    opacity = 0.82,
    envMapIntensity = 1.0,
    clearcoat = 0.85,
    clearcoatRoughness = 0.22,
    attenuationDistance = 0.4,
    attenuationColor = '#f0d8c0',
  } = config;

  return new THREE.MeshPhysicalMaterial({
    color,
    transmission,
    roughness,
    ior,
    thickness,
    opacity,
    envMapIntensity,
    clearcoat,
    clearcoatRoughness,
    attenuationDistance,
    attenuationColor: new THREE.Color(attenuationColor),
    metalness: 0.0,
    specularIntensity: 0.8,
    specularColor: new THREE.Color('#fff5e8'),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    vertexColors: instanced,
  });
}
