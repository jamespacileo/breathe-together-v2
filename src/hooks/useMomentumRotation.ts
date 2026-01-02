import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import * as THREE from 'three';

/**
 * iOS-style momentum rotation hook
 *
 * Implements the same deceleration algorithm as UIScrollView:
 * - Tracks velocity during drag
 * - On release, applies exponential decay: velocity *= decelerationRate per frame
 * - Continues rotating until velocity is negligible
 *
 * Algorithm based on iOS UIScrollView.DecelerationRate:
 * - Normal: 0.998 per millisecond → ~0.967 per frame at 60fps
 * - Fast: 0.99 per millisecond → ~0.846 per frame at 60fps
 *
 * Reference: https://medium.com/@esskeetit/scrolling-mechanics-of-uiscrollview-142adee1142c
 */

interface MomentumRotationOptions {
  /** Rotation sensitivity multiplier during drag */
  sensitivity?: number;
  /** iOS-style deceleration rate (0.95-0.99, higher = more momentum) */
  decelerationRate?: number;
  /** Minimum velocity threshold to stop momentum */
  velocityThreshold?: number;
  /** Polar angle limits [min, max] in radians */
  polarLimits?: [number, number];
  /** Whether rotation is enabled */
  enabled?: boolean;
}

interface MomentumRotationReturn {
  /** Ref to attach to the group that should rotate */
  groupRef: React.RefObject<THREE.Group | null>;
  /** Pointer event handlers */
  handlers: {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
    onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
  };
  /** Whether currently dragging */
  isDragging: boolean;
}

// iOS UIScrollView.DecelerationRate.normal ≈ 0.998 per ms
// At 60fps (16.67ms per frame): 0.998^16.67 ≈ 0.967
const IOS_DECELERATION_NORMAL = 0.967;

// iOS UIScrollView.DecelerationRate.fast ≈ 0.99 per ms
// At 60fps: 0.99^16.67 ≈ 0.846
const IOS_DECELERATION_FAST = 0.846;

// Use a rate between normal and fast for pleasant feel
const DEFAULT_DECELERATION = 0.96;

export function useMomentumRotation({
  sensitivity = 4,
  decelerationRate = DEFAULT_DECELERATION,
  velocityThreshold = 0.0001,
  polarLimits = [-Math.PI * 0.3, Math.PI * 0.3],
  enabled = true,
}: MomentumRotationOptions = {}): MomentumRotationReturn {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // State refs (avoid React re-renders for smooth 60fps)
  const isDraggingRef = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const rotation = useRef({ azimuth: 0, polar: 0 });

  // Velocity tracking for smooth momentum calculation
  const lastMoveTime = useRef(0);
  const velocityHistory = useRef<Array<{ vx: number; vy: number; time: number }>>([]);

  // Calculate average velocity from recent history (iOS-style)
  const calculateAverageVelocity = useCallback(() => {
    const history = velocityHistory.current;
    const now = performance.now();
    // Only consider samples from last 100ms (iOS uses ~100ms window)
    const recentSamples = history.filter((s) => now - s.time < 100);

    if (recentSamples.length === 0) {
      return { x: 0, y: 0 };
    }

    // Weighted average - more recent samples have more weight
    let totalWeight = 0;
    let weightedVx = 0;
    let weightedVy = 0;

    for (let i = 0; i < recentSamples.length; i++) {
      const sample = recentSamples[i];
      // Weight increases linearly with recency
      const weight = (i + 1) / recentSamples.length;
      weightedVx += sample.vx * weight;
      weightedVy += sample.vy * weight;
      totalWeight += weight;
    }

    return {
      x: weightedVx / totalWeight,
      y: weightedVy / totalWeight,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      e.stopPropagation();

      isDraggingRef.current = true;

      // Get pointer position from the native event
      previousPointer.current = {
        x: e.clientX,
        y: e.clientY,
      };

      // Reset velocity and history on new drag
      velocity.current = { x: 0, y: 0 };
      velocityHistory.current = [];
      lastMoveTime.current = performance.now();
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled || !isDraggingRef.current) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const deltaX = currentX - previousPointer.current.x;
      const deltaY = currentY - previousPointer.current.y;

      const now = performance.now();
      const dt = Math.max(now - lastMoveTime.current, 1); // Avoid division by zero

      // Calculate instantaneous velocity (pixels per ms, then scale)
      const vx = (deltaX / dt) * 16; // Normalize to ~60fps frame time
      const vy = (deltaY / dt) * 16;

      // Add to velocity history
      velocityHistory.current.push({ vx, vy, time: now });
      // Keep only last 10 samples
      if (velocityHistory.current.length > 10) {
        velocityHistory.current.shift();
      }

      // Apply rotation immediately (instant feedback like iOS)
      const rotationSpeed = sensitivity / Math.min(size.width, size.height);
      rotation.current.azimuth -= deltaX * rotationSpeed;
      rotation.current.polar += deltaY * rotationSpeed;

      // Clamp polar angle
      rotation.current.polar = Math.max(
        polarLimits[0],
        Math.min(polarLimits[1], rotation.current.polar),
      );

      previousPointer.current = { x: currentX, y: currentY };
      lastMoveTime.current = now;
    },
    [enabled, sensitivity, size.width, size.height, polarLimits],
  );

  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Calculate release velocity from history (iOS-style weighted average)
    const avgVelocity = calculateAverageVelocity();

    // Scale velocity for rotation
    const rotationSpeed = sensitivity / Math.min(size.width, size.height);
    velocity.current = {
      x: -avgVelocity.x * rotationSpeed,
      y: avgVelocity.y * rotationSpeed,
    };

    velocityHistory.current = [];
  }, [calculateAverageVelocity, sensitivity, size.width, size.height]);

  const onPointerLeave = useCallback(() => {
    // Treat pointer leave same as pointer up
    onPointerUp();
  }, [onPointerUp]);

  // Animation frame - apply momentum when not dragging
  useFrame(() => {
    if (!groupRef.current || !enabled) return;

    // Apply momentum when not dragging
    if (!isDraggingRef.current) {
      const vMagnitude = Math.sqrt(velocity.current.x ** 2 + velocity.current.y ** 2);

      if (vMagnitude > velocityThreshold) {
        // Apply velocity to rotation
        rotation.current.azimuth += velocity.current.x;
        rotation.current.polar += velocity.current.y;

        // Clamp polar angle
        rotation.current.polar = Math.max(
          polarLimits[0],
          Math.min(polarLimits[1], rotation.current.polar),
        );

        // iOS-style exponential decay
        velocity.current.x *= decelerationRate;
        velocity.current.y *= decelerationRate;
      } else {
        // Stop completely when velocity is negligible
        velocity.current.x = 0;
        velocity.current.y = 0;
      }
    }

    // Apply rotation to group using quaternion for smooth results
    const euler = new THREE.Euler(rotation.current.polar, rotation.current.azimuth, 0, 'YXZ');
    groupRef.current.quaternion.setFromEuler(euler);
  });

  return {
    groupRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
    },
    isDragging: isDraggingRef.current,
  };
}

// Export iOS constants for reference
export { IOS_DECELERATION_NORMAL, IOS_DECELERATION_FAST, DEFAULT_DECELERATION };
