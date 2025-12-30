import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { BackgroundGradient } from './BackgroundGradient';

interface EnvironmentProps {
  enabled?: boolean;
}

/**
 * Environment - Minimal Monument Valley lighting and background
 *
 * Refactored to use TSL BackgroundGradient.
 */
export function Environment({ enabled = true }: EnvironmentProps = {}) {
  const { scene } = useThree();

  // Add subtle fog to blend the horizon and clear background
  useEffect(() => {
    scene.fog = new THREE.Fog(0xf2f0ed, 10, 50);
    scene.background = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  if (!enabled) return null;

  return (
    <>
      <BackgroundGradient />

      {/* Soft, even ambient lighting */}
      <ambientLight intensity={0.6} color="#ffffff" />
    </>
  );
}
