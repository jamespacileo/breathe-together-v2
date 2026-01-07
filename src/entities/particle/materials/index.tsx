/**
 * Shard Materials
 *
 * Unified material implementation for particle shards.
 */

import * as THREE from 'three';
import { VISUAL_OPACITY } from '../../../constants';

/**
 * Unified shard material (single option)
 * Glassy body that relies on edge glow instancing for definition.
 */
export function createShardMaterial(): THREE.Material {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.02,
    transmission: 1.0,
    thickness: 0.5,
    transparent: true,
    opacity: VISUAL_OPACITY.SHARD_GLASS,
    envMapIntensity: 0.8,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    side: THREE.FrontSide,
    depthWrite: false,
    vertexColors: true,
  });
}
