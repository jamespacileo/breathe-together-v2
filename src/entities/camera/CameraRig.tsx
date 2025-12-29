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
   *
   * Controls how much the camera target shifts based on mouse position.
   * Creates a subtle "looking around" effect without rotating the sphere.
   *
   * **When to adjust:** Increase for immersive head-tracking effect, decrease for static focus
   * **Typical range:** Subtle (0.2) → Balanced (0.5, default) → Pronounced (1.0) → Extreme (1.5+)
   * **Interacts with:** lerpSpeed (movement smoothness), enableRotation
   * **Performance note:** No impact; pure camera calculation
   *
   * @group "Parallax & Zoom"
   * @label "Parallax Intensity"
   * @min 0
   * @max 2
   * @step 0.1
   * @default 0.5
   */
  parallaxIntensity?: number;

  /**
   * Breathing zoom effect intensity (inhale = closer, exhale = farther).
   *
   * Subtly modulates camera distance during the breathing cycle.
   * Inhale pulls closer, exhale pushes away, creating immersive breathing feedback.
   *
   * **When to adjust:** Increase for stronger breathing intimacy, decrease for steadier view
   * **Typical range:** Subtle (0.1) → Balanced (0.3, default) → Strong (0.6) → Very Strong (1.0)
   * **Interacts with:** baseDistance (total distance = baseDistance - phase * breathZoomIntensity)
   * **Performance note:** No impact; pure camera calculation
   *
   * @group "Parallax & Zoom"
   * @label "Breath Zoom"
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  breathZoomIntensity?: number;

  /**
   * Camera base distance from origin (starting point before breathing modulation).
   *
   * Defines how far the camera sits from the breathing sphere at rest.
   * The actual distance oscillates around this value during breathing (- breathZoomIntensity).
   *
   * **When to adjust:** Increase for wider view of surroundings, decrease for closeup immersion
   * **Typical range:** Close (5) → Balanced (10, default) → Wide (15) → Very Wide (20)
   * **Interacts with:** breathZoomIntensity (combined distance = baseDistance - phase * breathZoomIntensity), sphere scale
   * **Performance note:** No impact; pure camera frustum
   *
   * @group "Parallax & Zoom"
   * @label "Base Distance"
   * @min 5
   * @max 20
   * @step 0.5
   * @default 10
   */
  baseDistance?: number;

  /**
   * Camera movement smoothing speed (exponential damping factor).
   *
   * Controls how quickly the camera follows parallax offset and breathing zoom changes.
   * Lower = slower, lagged feel; Higher = snappier, direct feel.
   *
   * **When to adjust:** Increase for responsive feel, decrease for meditative floatiness
   * **Typical range:** Floaty (1.0) → Smooth (2.0, default) → Responsive (4.0) → Snappy (8.0+)
   * **Interacts with:** parallaxIntensity, enableDamping, dampingFactor
   * **Performance note:** No impact; single damp3() call per frame
   *
   * @group "Smoothing"
   * @label "Lerp Speed"
   * @min 0.5
   * @max 10
   * @step 0.5
   * @default 2
   */
  lerpSpeed?: number;

  /**
   * Enable camera rotation with mouse drag (orbital controls).
   *
   * When enabled, users can rotate around the sphere by dragging with mouse/touch.
   * When disabled, only parallax offset is available (camera stays fixed azimuth).
   *
   * **When to adjust:** Disable for guided meditation (static view), enable for exploration
   * **Interacts with:** rotateSpeed, minPolarAngle, maxPolarAngle, enableDamping, dampingFactor
   * **Performance note:** No impact; OrbitControls internal
   *
   * @group "Orbit Controls"
   * @label "Enable Rotation"
   * @default true
   */
  enableRotation?: boolean;

  /**
   * Rotation speed sensitivity (orbit control sensitivity).
   *
   * Multiplier for mouse movement → rotation amount. Only applies when enableRotation is true.
   *
   * **When to adjust:** Increase for touchy/precise control, decrease for relaxed control
   * **Typical range:** Relaxed (0.2) → Balanced (0.5, default) → Sensitive (1.0) → Precise (1.5+)
   * **Interacts with:** enableRotation (only applies when true), enableDamping
   * **Performance note:** No impact; OrbitControls internal
   *
   * @group "Orbit Controls"
   * @label "Rotate Speed"
   * @min 0.1
   * @max 2
   * @step 0.1
   * @default 0.5
   */
  rotateSpeed?: number;

  /**
   * Minimum vertical rotation angle (radians; ~45° = 0.785, ~0° = 0).
   *
   * Prevents camera from rotating below this angle. Stops user from rotating under the sphere.
   * 0.785 rad ≈ 45° prevents extreme upside-down views.
   *
   * **When to adjust:** Increase to restrict upward tilt, decrease to allow more extreme angles
   * **Typical range:** Restricted (0.2) → Standard (0.785, default, ~45°) → Open (1.57, ~90°)
   * **Interacts with:** maxPolarAngle (min < max), enableRotation
   * **Performance note:** No impact; constraint only
   *
   * @group "Orbit Controls"
   * @label "Min Polar Angle"
   * @min 0
   * @max 1.57
   * @step 0.1
   * @default 0.785
   */
  minPolarAngle?: number;

  /**
   * Maximum vertical rotation angle (radians; ~135° = 2.356, ~180° = 3.14).
   *
   * Prevents camera from rotating above this angle. Stops user from rotating too far over the top.
   * 2.356 rad ≈ 135° prevents rotation past vertical into the back hemisphere.
   *
   * **When to adjust:** Increase to allow rotation past vertical, decrease to restrict downward tilt
   * **Typical range:** Restricted (1.57, ~90°) → Standard (2.356, default, ~135°) → Open (3.14, ~180°)
   * **Interacts with:** minPolarAngle (min < max), enableRotation
   * **Performance note:** No impact; constraint only
   *
   * @group "Orbit Controls"
   * @label "Max Polar Angle"
   * @min 1.57
   * @max 3.14
   * @step 0.1
   * @default 2.356
   */
  maxPolarAngle?: number;

  /**
   * Enable damping for smooth rotation inertia (momentum on release).
   *
   * When enabled, rotation continues smoothly after mouse release (coasting effect).
   * When disabled, rotation stops immediately when mouse is released.
   *
   * **When to adjust:** Enable for meditative floatiness, disable for precise control
   * **Interacts with:** dampingFactor (controls coast speed), enableRotation, rotateSpeed
   * **Performance note:** No impact; OrbitControls internal
   *
   * @group "Smoothing"
   * @label "Enable Damping"
   * @default true
   */
  enableDamping?: boolean;

  /**
   * Damping factor for rotation smoothness (inertia decay speed).
   *
   * Controls how quickly rotation momentum decays after mouse release.
   * Only applies when enableDamping is true.
   * Lower = longer coast, higher = quicker stop.
   *
   * **When to adjust:** Increase for snappier stopping, decrease for luxurious drifting
   * **Typical range:** Drifty (0.01) → Smooth (0.05, default) → Responsive (0.1) → Snappy (0.2)
   * **Interacts with:** enableDamping (only applies when true), enableRotation
   * **Performance note:** No impact; OrbitControls internal
   *
   * @group "Smoothing"
   * @label "Damping Factor"
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
