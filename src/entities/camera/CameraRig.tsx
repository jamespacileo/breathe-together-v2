import { OrbitControls as OrbitControlsImpl } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { damp3 } from 'maath/easing';
import { useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three-stdlib';
import { breathPhase } from '../breath/traits';

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
  parallaxIntensity = 0.5,
  distance = 10,
  enableRotation = true,
}: CameraRigProps = {}) {
  // Internal constants for hardcoded values
  const breathZoomIntensity = 0.3;
  const lerpSpeed = 2;
  const rotateSpeed = 0.5;
  const minPolarAngle = 0.785;
  const maxPolarAngle = 2.356;
  const enableDamping = true;
  const dampingFactor = 0.05;

  const { mouse } = useThree();
  const world = useWorld();
  const controlsRef = useRef<OrbitControls>(null);
  const parallaxOffset = useRef(new THREE.Vector3());
  const targetOffset = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    try {
      // Get breath phase for subtle camera breathing
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity || !world.has(breathEntity)) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;

      // 1. Breathing Zoom
      // We adjust min/max distance to force OrbitControls to the target distance
      const activeDistance = distance - phase * breathZoomIntensity;
      if (controlsRef.current) {
        controlsRef.current.minDistance = activeDistance;
        controlsRef.current.maxDistance = activeDistance;
      }

      // 2. Mouse Parallax
      // We update the controls target to create a panned parallax effect
      targetOffset.current.set(mouse.x * parallaxIntensity, mouse.y * parallaxIntensity, 0);
      damp3(parallaxOffset.current, targetOffset.current, lerpSpeed, delta);

      if (controlsRef.current) {
        controlsRef.current.target.copy(parallaxOffset.current);
        // OrbitControls.update() calculates the new camera position based on target and distance
        controlsRef.current.update();
      }
    } catch (_e) {
      // Ignore stale world errors
    }
  });

  return (
    <OrbitControlsImpl
      ref={controlsRef}
      enabled={enableRotation}
      enableZoom={false}
      enablePan={false}
      enableRotate={enableRotation}
      rotateSpeed={rotateSpeed}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      enableDamping={enableDamping}
      dampingFactor={dampingFactor}
    />
  );
}
