import { useMemo } from 'react';
import * as THREE from 'three';
import { calculateGMST, calculateSunPosition, celestialToCartesian } from '../lib/astronomy';

/**
 * useSunDirection - Hook to calculate the normalized sun direction vector
 * based on real astronomical positioning.
 *
 * @param radius - Optional radius for the cartesian conversion (default: 1)
 * @returns THREE.Vector3 - Normalized direction from origin to sun
 */
export function useSunDirection(radius = 1) {
  return useMemo(() => {
    const now = new Date();
    const gmst = calculateGMST(now);
    const sunData = calculateSunPosition(now);
    const [x, y, z] = celestialToCartesian(sunData.ra, sunData.dec, radius, gmst);
    return new THREE.Vector3(x, y, z).normalize();
  }, [radius]);
}
