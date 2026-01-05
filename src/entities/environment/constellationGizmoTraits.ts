/**
 * Koota traits for constellation gizmo state management.
 *
 * These traits enable fast state updates for constellation debug visualization,
 * allowing real-time position tracking of stars and constellation centroids.
 */

import { trait } from 'koota';
import * as THREE from 'three';

/**
 * Trait for individual star gizmo data
 */
export const StarGizmoData = trait({
  /** Star identifier */
  id: '' as string,
  /** Star name for display */
  name: '' as string,
  /** Constellation this star belongs to */
  constellation: '' as string,
  /** Star apparent magnitude (lower = brighter) */
  magnitude: 0 as number,
  /** Current 3D position (updated each frame) */
  position: () => new THREE.Vector3(),
  /** Star brightness (0-1, derived from magnitude) */
  brightness: 1 as number,
});

/**
 * Trait for constellation centroid data
 */
export const ConstellationGizmoData = trait({
  /** Constellation identifier */
  id: '' as string,
  /** Display name (e.g., "Big Dipper") */
  name: '' as string,
  /** Latin/scientific name (e.g., "Ursa Major") */
  latinName: '' as string,
  /** Centroid position (average of all star positions) */
  centroid: () => new THREE.Vector3(),
  /** Number of stars in this constellation */
  starCount: 0 as number,
  /** Bounding sphere radius */
  boundingRadius: 0 as number,
});

/**
 * Trait for celestial sphere reference frame
 */
export const CelestialFrameData = trait({
  /** Current GMST (Greenwich Mean Sidereal Time) in radians */
  gmst: 0 as number,
  /** Celestial sphere radius */
  radius: 25 as number,
  /** Last update timestamp */
  lastUpdate: 0 as number,
});
