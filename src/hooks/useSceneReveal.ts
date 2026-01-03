import { useProgress } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Scene reveal configuration
 */
export interface SceneRevealConfig {
  /** Starting camera Z position (close to globe) @default 4 */
  startCameraZ?: number;
  /** Ending camera Z position (full scene view) @default 10 */
  endCameraZ?: number;
  /** Starting fog near distance @default 0.1 */
  startFogNear?: number;
  /** Starting fog far distance @default 3 */
  startFogFar?: number;
  /** Ending fog near distance @default 8 */
  endFogNear?: number;
  /** Ending fog far distance @default 50 */
  endFogFar?: number;
  /** Fog color (should match background) @default '#f5ebe0' */
  fogColor?: string;
  /** Duration of reveal animation in ms @default 3000 */
  duration?: number;
  /** Delay after loading before starting reveal @default 300 */
  delay?: number;
}

const DEFAULT_CONFIG: Required<SceneRevealConfig> = {
  startCameraZ: 4,
  endCameraZ: 10,
  startFogNear: 0.1,
  startFogFar: 3.5,
  endFogNear: 15,
  endFogFar: 80,
  fogColor: '#f5ebe0',
  duration: 2500,
  delay: 200,
};

/**
 * Reveal phase state
 */
export type RevealPhase = 'loading' | 'revealing' | 'complete';

/**
 * useSceneReveal - Orchestrates organic scene reveal with camera pull-back and fog fade.
 *
 * Creates an immersive loading experience where:
 * 1. Scene starts with camera close to globe, dense fog hiding distant elements
 * 2. Globe breathing animation is visible immediately (IS the loading indicator)
 * 3. When assets load, camera pulls back smoothly
 * 4. Fog recedes progressively revealing particles, then environment
 * 5. Final state: full scene view with minimal fog for depth
 *
 * @param config - Optional configuration overrides
 * @returns Object with reveal phase and progress
 *
 * @example
 * ```tsx
 * function Scene() {
 *   const { phase, progress } = useSceneReveal();
 *
 *   return (
 *     <>
 *       <SceneRevealFog />
 *       {phase !== 'loading' && <ExpensiveComponent />}
 *     </>
 *   );
 * }
 * ```
 */
export function useSceneReveal(config: SceneRevealConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { camera, scene } = useThree();
  const { progress: loadProgress, active: isLoading } = useProgress();

  const [phase, setPhase] = useState<RevealPhase>('loading');
  const [revealProgress, setRevealProgress] = useState(0);

  // Animation state
  const animationRef = useRef({
    startTime: 0,
    isAnimating: false,
  });

  // Store initial camera position to restore if needed
  const initialCameraZ = useRef(camera.position.z);

  // Setup fog on mount
  useEffect(() => {
    // Create fog with initial (dense) values
    const fog = new THREE.Fog(cfg.fogColor, cfg.startFogNear, cfg.startFogFar);
    scene.fog = fog;

    // Set camera to start position (close to globe)
    camera.position.z = cfg.startCameraZ;

    // Cleanup on unmount
    return () => {
      scene.fog = null;
      camera.position.z = initialCameraZ.current;
    };
  }, [scene, camera, cfg.fogColor, cfg.startFogNear, cfg.startFogFar, cfg.startCameraZ]);

  // Trigger reveal when loading completes
  useEffect(() => {
    if (!isLoading && loadProgress === 100 && phase === 'loading') {
      // Delay slightly to ensure scene is rendered
      const timeout = setTimeout(() => {
        setPhase('revealing');
        animationRef.current.startTime = performance.now();
        animationRef.current.isAnimating = true;
      }, cfg.delay);

      return () => clearTimeout(timeout);
    }
  }, [isLoading, loadProgress, phase, cfg.delay]);

  // Animate camera and fog each frame
  useFrame(() => {
    if (!animationRef.current.isAnimating || phase !== 'revealing') return;

    const elapsed = performance.now() - animationRef.current.startTime;
    const rawProgress = Math.min(elapsed / cfg.duration, 1);

    // Ease-out cubic for smooth deceleration
    const easedProgress = 1 - (1 - rawProgress) ** 3;

    setRevealProgress(easedProgress);

    // Animate camera Z position (pull back)
    const targetZ = THREE.MathUtils.lerp(cfg.startCameraZ, cfg.endCameraZ, easedProgress);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);

    // Animate fog parameters
    if (scene.fog instanceof THREE.Fog) {
      const targetNear = THREE.MathUtils.lerp(cfg.startFogNear, cfg.endFogNear, easedProgress);
      const targetFar = THREE.MathUtils.lerp(cfg.startFogFar, cfg.endFogFar, easedProgress);

      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, targetNear, 0.08);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, targetFar, 0.08);
    }

    // Check if animation complete
    if (rawProgress >= 1) {
      animationRef.current.isAnimating = false;
      setPhase('complete');

      // Ensure final values are set exactly
      camera.position.z = cfg.endCameraZ;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = cfg.endFogNear;
        scene.fog.far = cfg.endFogFar;
      }
    }
  });

  return {
    /** Current phase: 'loading' | 'revealing' | 'complete' */
    phase,
    /** Reveal animation progress (0-1) */
    progress: revealProgress,
    /** Whether assets are still loading */
    isLoading,
    /** Asset loading progress (0-100) */
    loadProgress,
    /** Whether reveal animation is complete */
    isComplete: phase === 'complete',
  };
}

/**
 * SceneRevealProvider - Component wrapper that manages scene reveal state.
 *
 * Use this as a child of Canvas to enable organic scene reveal.
 * The globe should be visible from the start - it acts as the loading indicator.
 */
export function SceneRevealController({ config }: { config?: SceneRevealConfig }) {
  useSceneReveal(config);
  return null;
}
