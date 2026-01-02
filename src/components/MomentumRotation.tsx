import type { ReactNode } from 'react';
import { useMomentumRotation } from '../hooks/useMomentumRotation';

interface MomentumRotationProps {
  children: ReactNode;
  /** Rotation sensitivity multiplier during drag */
  sensitivity?: number;
  /** iOS-style deceleration rate (0.95-0.99, higher = more momentum) */
  decelerationRate?: number;
  /** Polar angle limits [min, max] in radians */
  polarLimits?: [number, number];
  /** Whether rotation is enabled */
  enabled?: boolean;
}

/**
 * MomentumRotation - iOS-style momentum rotation for 3D objects
 *
 * Wraps children in a group that can be rotated with drag.
 * After release, continues rotating with iOS UIScrollView-style
 * exponential deceleration.
 *
 * Algorithm: velocity *= 0.96 per frame (60fps)
 * This matches iOS UIScrollView.DecelerationRate between normal and fast.
 */
export function MomentumRotation({
  children,
  sensitivity = 4,
  decelerationRate = 0.96,
  polarLimits = [-Math.PI * 0.3, Math.PI * 0.3],
  enabled = true,
}: MomentumRotationProps) {
  const { groupRef, handlers } = useMomentumRotation({
    sensitivity,
    decelerationRate,
    polarLimits,
    enabled,
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerLeave={handlers.onPointerLeave}
    >
      {children}
    </group>
  );
}
