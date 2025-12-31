import { OrbitControls as OrbitControlsImpl } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { damp3 } from 'maath/easing';
import { useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three-stdlib';
import * as logger from '../../lib/logger';
import { breathPhase } from '../breath/traits';

// Reusable origin vector to prevent 60fps allocations
const ORIGIN = new THREE.Vector3(0, 0, 0);

interface CameraRigProps {
  /**
   * Mouse parallax movement intensity (orbital camera offset).
   * @min 0
   * @max 2
   * @step 0.1
   */
  parallaxIntensity?: number;

  /**
   * Camera base distance from origin.
   * @min 5
   * @max 20
   * @step 0.5
   */
  distance?: number;

  /**
   * Enable camera rotation with mouse drag.
   */
  enableRotation?: boolean;

  /**
   * Whether we're in cinematic intro mode (camera dolly from close to far).
   */
  introMode?: boolean;

  /**
   * Progress through intro (0-1), used for dolly animation.
   */
  introProgress?: number;

  /**
   * Progress through join transition (0-1), used for smooth camera continuation.
   * Prevents camera from snapping when intro ends and hasJoined becomes true.
   */
  joinProgress?: number;
}

export function CameraRig({
  parallaxIntensity = 0.4,
  distance = 15,
  enableRotation = false,
  introMode = false,
  introProgress = 1,
  joinProgress = 0,
}: CameraRigProps = {}) {
  // Internal constants for smoothing and movement
  const swayIntensity = 0.05;
  const breathZoomIntensity = 1.5;
  const lerpSpeed = 1.5;
  const dampingFactor = 0.03; // Smoother damping

  // Intro dolly settings
  const introStartDistance = 6; // Start close
  const introEndDistance = distance; // End at normal distance

  // Combined progress: use intro progress during intro, then continue with join progress
  // This ensures smooth camera dolly continuation when transitioning from intro to joined state
  const effectiveProgress = introMode ? introProgress : Math.max(introProgress, joinProgress);

  const { mouse } = useThree();
  const world = useWorld();
  const controlsRef = useRef<OrbitControls>(null);

  // Ref-based state to keep updates smooth and avoid React re-renders
  const lastPhase = useRef(0);
  const targetCameraPos = useRef(new THREE.Vector3(0, 0, distance));
  const currentCameraPos = useRef(new THREE.Vector3(0, 0, distance));

  useFrame((state, delta) => {
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      if (!breathEntity.has?.(breathPhase)) {
        logger.warn('[CameraRig] breathPhase trait missing - entity may be corrupt');
      }

      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      lastPhase.current = phase;

      const t = state.clock.elapsedTime;

      // 1. Procedural Sway (Organic "breathing" movement)
      // Subtle float + rotation that feels linked to the lungs expanding
      // Reduced during intro for more cinematic feel
      const introSwayMultiplier = introMode ? Math.min(introProgress * 2, 1) : 1;
      const swayX = Math.sin(t * 0.5) * swayIntensity * introSwayMultiplier;
      const swayY = Math.cos(t * 0.4) * swayIntensity * introSwayMultiplier;

      // 2. Calculate base distance (smooth dolly using effectiveProgress)
      // Use easeOutCubic for smooth dolly - continues through join transition
      const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
      // During intro or join transition, smoothly dolly from close to far
      // effectiveProgress handles the transition between intro and join phases
      const isTransitioning = introMode || effectiveProgress < 1;
      const baseDistance = isTransitioning
        ? THREE.MathUtils.lerp(
            introStartDistance,
            introEndDistance,
            easeOutCubic(effectiveProgress),
          )
        : distance;

      // 3. Breathing Zoom (Camera pushes in/out with the breath)
      // Reduced during intro
      const breathMultiplier = introMode ? Math.min(introProgress, 1) : 1;
      const dynamicDistance = baseDistance - phase * breathZoomIntensity * breathMultiplier;

      // 3. Mouse Parallax (Gentle look-around)
      const mouseX = mouse.x * parallaxIntensity;
      const mouseY = mouse.y * parallaxIntensity;

      // Update target position
      // Combine base distance, mouse offset, and breathing push
      targetCameraPos.current.set(mouseX + swayX, mouseY + swayY, dynamicDistance);

      // Smoothly interpolate the camera position
      damp3(currentCameraPos.current, targetCameraPos.current, lerpSpeed, delta);

      if (controlsRef.current) {
        // We update the camera position relative to the target
        // OrbitControls handles rotations, we influence the distance and subtle offset
        controlsRef.current.minDistance = dynamicDistance;
        controlsRef.current.maxDistance = dynamicDistance;

        // Lock target to origin (0,0,0) - scene rotation is handled by PresentationControls
        // This keeps the OrbitControls centered while PresentationControls handles all rotation
        damp3(controlsRef.current.target, ORIGIN, lerpSpeed, delta);

        controlsRef.current.update();
      }
    } catch (error) {
      // Ignore stale world errors
      logger.warn('[CameraRig] Unexpected error (expected during Triplex hot-reload):', error);
    }
  });

  return (
    <OrbitControlsImpl
      ref={controlsRef}
      makeDefault
      enabled={enableRotation}
      enableZoom={false}
      enablePan={false}
      enableRotate={enableRotation}
      rotateSpeed={0.4}
      minPolarAngle={Math.PI * 0.3}
      maxPolarAngle={Math.PI * 0.6}
      enableDamping={true}
      dampingFactor={dampingFactor}
    />
  );
}
