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
   * Mouse parallax movement intensity.
   *
   * @min 0
   * @max 2
   * @step 0.1
   * @default 0.5
   */
  parallaxIntensity?: number;

  /**
   * Breathing zoom effect intensity.
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  breathZoomIntensity?: number;

  /**
   * Camera base distance from origin.
   *
   * @min 5
   * @max 20
   * @step 0.5
   * @default 10
   */
  baseDistance?: number;

  /**
   * Camera movement smoothing speed.
   *
   * @min 0.5
   * @max 10
   * @step 0.5
   * @default 2
   */
  lerpSpeed?: number;

  /**
   * Enable camera rotation with mouse drag.
   *
   * @default true
   */
  enableRotation?: boolean;

  /**
   * Rotation speed sensitivity.
   *
   * @min 0.1
   * @max 2
   * @step 0.1
   * @default 0.5
   */
  rotateSpeed?: number;

  /**
   * Minimum vertical rotation angle (radians, ~45°).
   *
   * @min 0
   * @max 1.57
   * @step 0.1
   * @default 0.785
   */
  minPolarAngle?: number;

  /**
   * Maximum vertical rotation angle (radians, ~135°).
   *
   * @min 1.57
   * @max 3.14
   * @step 0.1
   * @default 2.356
   */
  maxPolarAngle?: number;

  /**
   * Enable damping for smooth rotation inertia.
   *
   * @default true
   */
  enableDamping?: boolean;

  /**
   * Damping factor for rotation smoothness.
   *
   * @min 0.01
   * @max 0.2
   * @step 0.01
   * @default 0.05
   */
  dampingFactor?: number;
}

export function CameraRig({
  parallaxIntensity = 0.5,
  breathZoomIntensity = 0.3,
  baseDistance = 10,
  lerpSpeed = 2,
  enableRotation = true,
  rotateSpeed = 0.5,
  minPolarAngle = 0.785,
  maxPolarAngle = 2.356,
  enableDamping = true,
  dampingFactor = 0.05,
}: CameraRigProps = {}) {
  const { mouse } = useThree();
  const world = useWorld();
  const controlsRef = useRef<OrbitControls>(null);
  const parallaxOffset = useRef(new THREE.Vector3());
  const targetOffset = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    // Get breath phase for subtle camera breathing
    const breathEntity = world.queryFirst(breathPhase);
    const phase = breathEntity?.get(breathPhase)?.value ?? 0;

    // 1. Breathing Zoom
    // We adjust min/max distance to force OrbitControls to the target distance
    const activeDistance = baseDistance - phase * breathZoomIntensity;
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
