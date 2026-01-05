/**
 * DepthFog - Atmospheric fog with warm-to-cool color shift
 *
 * Creates depth perception through fog that:
 * - Uses exponential falloff for natural appearance
 * - Shifts from warm cream (near) to cool blue-gray (far)
 * - Can be disabled for specific visual styles
 *
 * Note: This component manages scene.fog directly and should
 * be rendered early in the scene graph.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

export interface DepthFogProps {
  /**
   * Enable depth fog
   * @default true
   */
  enabled?: boolean;
  /**
   * Near fog color (warm)
   * @default '#f5f0e8'
   */
  nearColor?: string;
  /**
   * Far fog color (cool)
   * @default '#d4dce8'
   */
  farColor?: string;
  /**
   * Distance where fog starts
   * @default 8
   */
  near?: number;
  /**
   * Distance where fog is fully dense
   * @default 150
   */
  far?: number;
  /**
   * Fog density (0-1, affects exponential fog)
   * @default 0.015
   */
  density?: number;
  /**
   * Use exponential fog (true) or linear (false)
   * @default true
   */
  exponential?: boolean;
}

/**
 * DepthFog - Creates atmospheric perspective through fog
 *
 * Applies scene-level fog with color shifting from warm to cool
 * tones as distance increases, enhancing depth perception.
 */
export const DepthFog = memo(function DepthFog({
  enabled = true,
  nearColor = SCENE_DEPTH.FOG.COLOR_NEAR,
  farColor = SCENE_DEPTH.FOG.COLOR_FAR,
  near = SCENE_DEPTH.FOG.NEAR,
  far = SCENE_DEPTH.FOG.FAR,
  density = SCENE_DEPTH.FOG.DENSITY,
  exponential = true,
}: DepthFogProps) {
  const { scene } = useThree();
  const fogRef = useRef<THREE.Fog | THREE.FogExp2 | null>(null);
  const nearColorRef = useRef(new THREE.Color(nearColor));
  const farColorRef = useRef(new THREE.Color(farColor));

  // Setup fog
  useEffect(() => {
    if (!enabled) {
      scene.fog = null;
      return;
    }

    // Create fog based on type
    if (exponential) {
      fogRef.current = new THREE.FogExp2(nearColor, density);
    } else {
      fogRef.current = new THREE.Fog(nearColor, near, far);
    }

    scene.fog = fogRef.current;

    // Cleanup
    return () => {
      scene.fog = null;
    };
  }, [enabled, exponential, nearColor, near, far, density, scene]);

  // Update fog colors
  useEffect(() => {
    nearColorRef.current.set(nearColor);
    farColorRef.current.set(farColor);
  }, [nearColor, farColor]);

  // Animate fog color based on camera distance (optional enhancement)
  // This creates a subtle color shift as the camera moves
  useFrame(({ camera }) => {
    if (!fogRef.current || !enabled) return;

    // Calculate camera distance from origin
    const distance = camera.position.length();

    // Interpolate fog color based on distance
    // Closer = warmer, farther = cooler
    const t = THREE.MathUtils.smoothstep(distance, 5, 20);
    const currentColor = new THREE.Color().lerpColors(nearColorRef.current, farColorRef.current, t);

    fogRef.current.color.copy(currentColor);
  });

  // This component doesn't render anything visible
  return null;
});

export default DepthFog;
