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
}

export function CameraRig({
  parallaxIntensity = 0.4,
  distance = 15,
  enableRotation = false,
}: CameraRigProps = {}) {
  // Internal constants for smoothing and movement
  const swayIntensity = 0.05;
  const breathZoomIntensity = 1.5;
  const lerpSpeed = 3.0; // Faster camera tracking for snappier feel
  const dampingFactor = 0.08; // Higher = more friction = quicker stop

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
      const swayX = Math.sin(t * 0.5) * swayIntensity;
      const swayY = Math.cos(t * 0.4) * swayIntensity;

      // 2. Breathing Zoom (Camera pushes in/out with the breath)
      const dynamicDistance = distance - phase * breathZoomIntensity;

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
      rotateSpeed={0.7}
      minPolarAngle={Math.PI * 0.3}
      maxPolarAngle={Math.PI * 0.6}
      enableDamping={true}
      dampingFactor={dampingFactor}
    />
  );
}
