import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { IntroPhase } from './types';

interface CinematicFogProps {
  /** Current intro phase */
  phase: IntroPhase;
  /** Progress within phase (0-1) */
  progress: number;
  /** Fog color (default: dark warm gray) */
  color?: string;
}

/**
 * Cinematic fog that clears as the intro progresses.
 *
 * Creates a dense fog during early phases that gradually lifts
 * to reveal the scene, like morning mist clearing.
 */
export function CinematicFog({ phase, progress, color = '#1a1816' }: CinematicFogProps) {
  const { scene } = useThree();
  const initialized = useRef(false);

  useFrame(() => {
    // Initialize fog if not exists
    if (!scene.fog) {
      scene.fog = new THREE.Fog(color, 0, 10);
      initialized.current = true;
    }

    // Calculate target fog values based on phase
    let targetNear: number;
    let targetFar: number;

    switch (phase) {
      case 'void':
        // Completely fogged out
        targetNear = 0;
        targetFar = 5;
        break;
      case 'reveal':
        // Progressive clearing as globe appears
        targetNear = progress * 22;
        targetFar = 5 + progress * 45;
        break;
      case 'cta':
        // Mostly clear, slight atmospheric haze
        targetNear = 22 + progress * 10;
        targetFar = 50 + progress * 20;
        break;
      case 'complete':
        // Fog disabled (or very distant)
        targetNear = 100;
        targetFar = 200;
        break;
      default:
        targetNear = 100;
        targetFar = 200;
    }

    // Smooth lerp fog values
    const lerpFactor = 0.03;
    const fog = scene.fog as THREE.Fog;
    fog.near += (targetNear - fog.near) * lerpFactor;
    fog.far += (targetFar - fog.far) * lerpFactor;
  });

  // Cleanup fog on unmount
  // Note: We don't remove the fog here as other components might use it
  // The fog will naturally fade to nothing in 'complete' phase

  return null;
}

export default CinematicFog;
