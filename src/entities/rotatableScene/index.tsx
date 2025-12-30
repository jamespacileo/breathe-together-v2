/**
 * RotatableScene - Scene rotation via mouse drag interaction
 *
 * Wraps rotatable entities (globe, particles) in a group that responds to pointer drag.
 * Drag gestures rotate the scene while camera stays fixed.
 *
 * Architecture:
 * - Captures pointer events on invisible event sphere
 * - Converts drag delta to rotation (Y = horizontal drag, X = vertical drag)
 * - Applies damped rotation for smooth feel
 * - Camera stays fixed, background/HUD unaffected
 */

import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface RotatableSceneProps {
  /**
   * Enable drag-to-rotate interaction.
   * @default true
   */
  enableRotation?: boolean;

  /**
   * Rotation damping factor (smoothness of follow).
   * Lower = snappier (0.1), Higher = laggy (1.0)
   * @default 0.3
   */
  dampingFactor?: number;

  /**
   * Rotation speed multiplier (drag sensitivity).
   * Lower = harder to rotate, Higher = easier
   * @default 1.0
   */
  rotationSpeed?: number;

  /**
   * Child entities to wrap in rotatable group.
   */
  children: React.ReactNode;
}

export function RotatableScene({
  enableRotation = true,
  dampingFactor = 0.3,
  rotationSpeed = 1.0,
  children,
}: RotatableSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const previousMouse = useRef(new THREE.Vector2(0, 0));
  const targetRotation = useRef(new THREE.Euler(0, 0, 0, 'XYZ'));
  const currentRotation = useRef(new THREE.Euler(0, 0, 0, 'XYZ'));

  /**
   * Start drag: record initial mouse position
   */
  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!enableRotation) return;
    event.stopPropagation();
    isDragging.current = true;
    previousMouse.current.set(event.clientX, event.clientY);
  };

  /**
   * During drag: convert mouse delta to rotation
   * - Drag right (positive X) → rotate around Y-axis (left-right look)
   * - Drag up (negative Y) → rotate around X-axis (up-down look)
   */
  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current) return;

    const deltaX = event.clientX - previousMouse.current.x;
    const deltaY = event.clientY - previousMouse.current.y;

    // Convert pixel movement to radians (roughly 1000px = full rotation)
    const rotationPerPixel = (Math.PI * 2) / 1000;

    // Update target rotation
    targetRotation.current.y += deltaX * rotationPerPixel * rotationSpeed;
    targetRotation.current.x -= deltaY * rotationPerPixel * rotationSpeed; // Negative for natural feel

    // Clamp X rotation to prevent flipping (±54°)
    targetRotation.current.x = THREE.MathUtils.clamp(
      targetRotation.current.x,
      -Math.PI * 0.3,
      Math.PI * 0.3,
    );

    previousMouse.current.set(event.clientX, event.clientY);
  };

  /**
   * End drag: stop rotation updates
   */
  const onPointerUp = (event?: ThreeEvent<PointerEvent>) => {
    event?.stopPropagation();
    isDragging.current = false;
  };

  /**
   * Smooth damped rotation: interpolate current rotation toward target
   * Uses exponential decay for frame-rate independent damping
   */
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Frame-rate independent exponential decay
    // Formula: 1 - (1 - dampingFactor)^(delta * 60)
    const speed = 1 - (1 - dampingFactor) ** (delta * 60);

    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * speed;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * speed;

    // Apply rotation to group
    groupRef.current.rotation.set(currentRotation.current.x, currentRotation.current.y, 0);
  });

  return (
    <group ref={groupRef}>
      {/* Invisible event capture sphere - responds to pointer events anywhere in scene */}
      <mesh
        visible={false}
        // biome-ignore lint/suspicious/noExplicitAny: React Three Fiber event types don't match perfectly with ThreeEvent
        onPointerDown={onPointerDown as any}
        // biome-ignore lint/suspicious/noExplicitAny: React Three Fiber event types don't match perfectly with ThreeEvent
        onPointerMove={onPointerMove as any}
        // biome-ignore lint/suspicious/noExplicitAny: React Three Fiber event types don't match perfectly with ThreeEvent
        onPointerUp={onPointerUp as any}
        // biome-ignore lint/suspicious/noExplicitAny: React Three Fiber event types don't match perfectly with ThreeEvent
        onPointerLeave={onPointerUp as any}
        // biome-ignore lint/suspicious/noExplicitAny: Handle interrupted interactions (drag outside window, touch cancel)
        onPointerCancel={onPointerUp as any}
      >
        <sphereGeometry args={[20, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Rotatable children */}
      {children}
    </group>
  );
}

export default RotatableScene;
