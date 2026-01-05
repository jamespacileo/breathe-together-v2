/**
 * DepthFog - Exponential fog with warm-to-cool color shift
 *
 * Creates atmospheric perspective through:
 * - Near objects: Warm cream tones
 * - Far objects: Cool blue-gray tones
 *
 * Uses Three.js FogExp2 for exponential falloff that looks more natural
 * than linear fog for vast environments.
 */

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface DepthFogProps {
  /** Enable/disable fog */
  enabled?: boolean;
  /** Fog density (higher = thicker fog) */
  density?: number;
  /** Fog color */
  color?: string;
}

export function DepthFog({ enabled = true, density, color }: DepthFogProps) {
  const { scene } = useThree();
  const { DENSITY, FAR_COLOR } = SCENE_DEPTH.FOG;

  const finalDensity = density ?? DENSITY;
  const finalColor = color ?? FAR_COLOR;

  useEffect(() => {
    if (!enabled) {
      scene.fog = null;
      return;
    }

    // Use exponential fog for more natural falloff
    scene.fog = new THREE.FogExp2(finalColor, finalDensity);

    return () => {
      scene.fog = null;
    };
  }, [enabled, finalDensity, finalColor, scene]);

  return null;
}
