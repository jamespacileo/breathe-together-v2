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
  // === CINEMATIC CAMERA SETTINGS ===
  // Organic sway - subtle drift that feels alive
  const swayIntensity = 0.08;
  // Breathing zoom - camera pushes in/out with breath (more dramatic)
  const breathZoomIntensity = 2.0;
  // Breathing tilt - subtle camera rotation with breathing
  const breathTiltIntensity = 0.015;
  // Cinematic drift - slow, dreamy floating motion
  const driftIntensity = 0.03;
  // Smoothing
  const lerpSpeed = 1.2; // Slightly slower for more cinematic feel
  const dampingFactor = 0.025;

  const { mouse, camera } = useThree();
  const world = useWorld();
  const controlsRef = useRef<OrbitControls>(null);

  // Ref-based state to keep updates smooth and avoid React re-renders
  const lastPhase = useRef(0);
  const targetCameraPos = useRef(new THREE.Vector3(0, 0, distance));
  const currentCameraPos = useRef(new THREE.Vector3(0, 0, distance));
  const baseRotation = useRef(new THREE.Euler(0, 0, 0));

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

      // 1. ORGANIC SWAY - Multi-frequency drift for natural feel
      // Primary sway (slow)
      const swayX = Math.sin(t * 0.3) * swayIntensity;
      const swayY = Math.cos(t * 0.25) * swayIntensity * 0.7;
      // Secondary drift (very slow, larger amplitude)
      const driftX = Math.sin(t * 0.08) * driftIntensity;
      const driftY = Math.cos(t * 0.06) * driftIntensity * 0.5;

      // 2. BREATHING ZOOM - Camera dolly with breath (cinematic)
      // Inhale: camera moves closer (intimate)
      // Exhale: camera moves back (spacious)
      const dynamicDistance = distance - phase * breathZoomIntensity;

      // 3. BREATHING TILT - Subtle camera rotation with breath
      // Creates subtle "nodding" motion synced with breathing
      const tiltX = phase * breathTiltIntensity * 0.5; // Slight up tilt on inhale
      const tiltZ = Math.sin(phase * Math.PI) * breathTiltIntensity * 0.3; // Very subtle roll

      // 4. MOUSE PARALLAX - Gentle look-around
      const mouseX = mouse.x * parallaxIntensity;
      const mouseY = mouse.y * parallaxIntensity * 0.6; // Less vertical

      // Update target position
      // Combine all movements: base distance, mouse, sway, drift, and breathing
      targetCameraPos.current.set(
        mouseX + swayX + driftX,
        mouseY + swayY + driftY,
        dynamicDistance,
      );

      // Smoothly interpolate the camera position
      damp3(currentCameraPos.current, targetCameraPos.current, lerpSpeed, delta);

      // Apply subtle camera rotation for cinematic tilt
      const targetRotX = baseRotation.current.x + tiltX;
      const targetRotZ = baseRotation.current.z + tiltZ;
      camera.rotation.x += (targetRotX - camera.rotation.x) * 0.02;
      camera.rotation.z += (targetRotZ - camera.rotation.z) * 0.015;

      if (controlsRef.current) {
        // Update distance dynamically
        controlsRef.current.minDistance = dynamicDistance;
        controlsRef.current.maxDistance = dynamicDistance;

        // Lock target to origin
        damp3(controlsRef.current.target, ORIGIN, lerpSpeed, delta);

        controlsRef.current.update();
      }
    } catch (error) {
      // Ignore stale world errors during Triplex hot-reload
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
