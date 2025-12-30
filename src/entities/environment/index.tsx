import { useEffect } from 'react';
import * as THREE from 'three';
import BackgroundGradient from './BackgroundGradient';

interface EnvironmentProps {
  enabled?: boolean;
}

/**
 * Environment - Minimal Monument Valley lighting and background
 *
 * Simplified from complex studio lighting to flat, meditative aesthetic:
 * - Gradient background via BackgroundGradient component (no scene.background)
 * - Single ambient light for soft, even illumination
 * - No shadows (Monument Valley uses flat shading)
 * - No environment map (kept in artifact - would add photorealistic reflections)
 */
export function Environment({ enabled = true }: EnvironmentProps = {}) {
  // Clear default background and fog (gradient component handles it)
  useEffect(() => {
    // Ensure scene.background is cleared so gradient is visible
    // This is handled by BackgroundGradient renderOrder, but clear just in case
    return () => {
      // Cleanup if needed
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Monument Valley gradient background: cream (#faf8f3) → terracotta (#f2d8cc) */}
      <BackgroundGradient />

      {/* Soft, even ambient lighting for meditative flat shading */}
      <ambientLight intensity={0.6} color="#ffffff" />
    </>
  );
}
