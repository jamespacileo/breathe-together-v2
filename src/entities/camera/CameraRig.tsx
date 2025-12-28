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
   * Mouse parallax movement intensity
   * @min 0
   * @max 2
   * @step 0.1
   */
  parallaxIntensity?: number;

  /**
   * Breathing zoom effect intensity
   * @min 0
   * @max 1
   * @step 0.05
   */
  breathZoomIntensity?: number;

  /**
   * Camera base distance from origin
   * @min 5
   * @max 20
   * @step 0.5
   */
  baseDistance?: number;

  /**
   * Camera movement smoothing speed
   * @min 0.5
   * @max 10
   * @step 0.5
   */
  lerpSpeed?: number;

  /**
   * Enable camera rotation with mouse drag
   */
  enableRotation?: boolean;

  /**
   * Rotation speed sensitivity
   * @min 0.1
   * @max 2
   * @step 0.1
   */
  rotateSpeed?: number;

  /**
   * Minimum vertical rotation angle (radians)
   * @min 0
   * @max 1.57
   * @step 0.1
   */
  minPolarAngle?: number;

  /**
   * Maximum vertical rotation angle (radians)
   * @min 1.57
   * @max 3.14
   * @step 0.1
   */
  maxPolarAngle?: number;

  /**
   * Enable damping for smooth rotation inertia
   */
  enableDamping?: boolean;

  /**
   * Damping factor for rotation smoothness
   * @min 0.01
   * @max 0.2
   * @step 0.01
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
  minPolarAngle = Math.PI / 4,
  maxPolarAngle = (Math.PI * 3) / 4,
  enableDamping = true,
  dampingFactor = 0.05,
}: CameraRigProps = {}) {
  const { camera, mouse } = useThree();
  const world = useWorld();
  const controlsRef = useRef<OrbitControls>(null);
  const targetPosition = useRef(new THREE.Vector3(0, 0, baseDistance));
  const currentPosition = useRef(new THREE.Vector3(0, 0, baseDistance));

  useFrame((_state, delta) => {
    // Get breath phase for subtle camera breathing
    const breathEntity = world.queryFirst(breathPhase);
    const phase = breathEntity?.get(breathPhase)?.value ?? 0;

    // Calculate target position based on mouse and breathing
    const zoomOffset = phase * breathZoomIntensity;
    targetPosition.current.set(
      mouse.x * parallaxIntensity,
      mouse.y * parallaxIntensity,
      baseDistance - zoomOffset,
    );

    // Smoothly interpolate camera position (frame-rate independent)
    damp3(currentPosition.current, targetPosition.current, lerpSpeed, delta);
    camera.position.copy(currentPosition.current);

    // Always look at center
    camera.lookAt(0, 0, 0);

    // Update OrbitControls if present
    if (controlsRef.current && 'update' in controlsRef.current) {
      (controlsRef.current as any).update();
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
      target={new THREE.Vector3(0, 0, 0)}
    />
  );
}
