/**
 * AtmosphericFog - Depth-based atmospheric perspective effect
 *
 * Adds a subtle fog that:
 * - Makes distant objects appear hazier (atmospheric scattering)
 * - Shifts colors toward the background at distance (aerial perspective)
 * - Creates depth cue without obscuring the scene
 *
 * Uses exponential fog for natural falloff with soft edge fade.
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface AtmosphericFogProps {
  /** Fog color - should match background for seamless blend @default '#f0ebe6' */
  color?: string;
  /** Fog density (exponential) - lower = more gradual @default 0.015 */
  density?: number;
  /** Enable fog effect @default true */
  enabled?: boolean;
}

/**
 * AtmosphericFog - Applies exponential fog for depth perception
 *
 * Uses Three.js built-in FogExp2 for performance.
 * The fog color should match the background gradient for seamless integration.
 */
export function AtmosphericFog({
  color = '#f0ebe6',
  density = 0.015,
  enabled = true,
}: AtmosphericFogProps) {
  const { scene } = useThree();

  // Create fog object
  const fog = useMemo(() => {
    return new THREE.FogExp2(color, density);
  }, [color, density]);

  // Apply/remove fog when enabled changes
  useEffect(() => {
    if (enabled) {
      scene.fog = fog;
    } else {
      scene.fog = null;
    }

    return () => {
      scene.fog = null;
    };
  }, [scene, fog, enabled]);

  // Update fog color dynamically
  useEffect(() => {
    if (fog) {
      fog.color.set(color);
      fog.density = density;
    }
  }, [fog, color, density]);

  return null;
}

/**
 * DistanceColorShift - Adds atmospheric perspective color shift
 *
 * This is a post-processing effect that shifts distant object colors
 * toward the atmosphere color, simulating Rayleigh scattering.
 *
 * For now, we rely on the built-in fog + the depth layers for this effect.
 * A full implementation would require modifying the RefractionPipeline.
 */
export function DistanceColorShift() {
  // This component is a placeholder for future enhancement
  // The depth layers and built-in fog already provide good atmospheric perspective
  return null;
}

export default AtmosphericFog;
