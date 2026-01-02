import { useFrame, useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import { easing } from 'maath';
import * as React from 'react';
import { type Group, MathUtils } from 'three';

/**
 * iOS-style momentum scrolling defaults
 * Based on UIScrollView deceleration mechanics
 * @see https://ariya.io/2011/10/flick-list-with-its-momentum-scrolling-and-deceleration
 */
const IOS_DEFAULTS = {
  timeConstant: 0.325,
  velocityMultiplier: 0.15,
  maxMomentum: Math.PI * 2,
  minVelocityThreshold: 50,
};

interface MomentumControlsProps {
  /** Enable/disable the controls */
  enabled?: boolean;
  /** Apply controls globally to the DOM element */
  global?: boolean;
  /** Show grab cursor */
  cursor?: boolean;
  /** Rotation speed multiplier (higher = faster response to drag) */
  speed?: number;
  /** Initial rotation [x, y, z] */
  rotation?: [number, number, number];
  /** Vertical rotation limits [min, max] */
  polar?: [number, number];
  /** Horizontal rotation limits [min, max] */
  azimuth?: [number, number];
  /** Damping factor for smooth animation (lower = snappier, higher = smoother) */
  damping?: number;
  /** Momentum multiplier (0 = no momentum, 1 = iOS-like, 2 = more momentum) */
  momentum?: number;
  /** Time constant for momentum decay (seconds). iOS default is 0.325s */
  timeConstant?: number;
  /** Converts gesture velocity to rotation. Higher = more momentum from same flick */
  velocityMultiplier?: number;
  /** Minimum flick speed (px/s) to trigger momentum */
  minVelocityThreshold?: number;
  children?: React.ReactNode;
}

/**
 * MomentumControls - PresentationControls with iOS-style momentum scrolling
 *
 * When you flick/drag and release, the object continues rotating based on
 * release velocity, then decelerates smoothly (like iPhone scrolling).
 *
 * Uses exponential decay: position = target - amplitude × e^(-t/timeConstant)
 */
export function MomentumControls({
  enabled = true,
  global = false,
  cursor = true,
  speed = 1.8,
  rotation = [0, 0, 0],
  polar = [-Math.PI * 0.3, Math.PI * 0.3],
  azimuth = [-Infinity, Infinity],
  damping = 0.12,
  momentum = 1,
  timeConstant = IOS_DEFAULTS.timeConstant,
  velocityMultiplier = IOS_DEFAULTS.velocityMultiplier,
  minVelocityThreshold = IOS_DEFAULTS.minVelocityThreshold,
  children,
}: MomentumControlsProps) {
  const events = useThree((state) => state.events);
  const gl = useThree((state) => state.gl);
  const { size } = useThree();

  const domElement = events.connected || gl.domElement;

  // Calculate rotation limits
  const rPolar = React.useMemo(
    () => [rotation[0] + polar[0], rotation[0] + polar[1]] as [number, number],
    [rotation[0], polar[0], polar[1]],
  );
  const rAzimuth = React.useMemo(
    () => [rotation[1] + azimuth[0], rotation[1] + azimuth[1]] as [number, number],
    [rotation[1], azimuth[0], azimuth[1]],
  );
  const rInitial = React.useMemo(
    () =>
      [
        MathUtils.clamp(rotation[0], ...rPolar),
        MathUtils.clamp(rotation[1], ...rAzimuth),
        rotation[2],
      ] as [number, number, number],
    [rotation[0], rotation[1], rotation[2], rPolar, rAzimuth],
  );

  // Animation state (mutable ref to avoid re-renders)
  const animation = React.useRef({
    rotation: [...rInitial] as [number, number, number],
    target: [...rInitial] as [number, number, number],
    damping,
  });

  // Group ref for direct manipulation
  const ref = React.useRef<Group>(null);

  // Cursor management
  React.useEffect(() => {
    if (global && cursor && enabled) {
      domElement.style.cursor = 'grab';
      return () => {
        domElement.style.cursor = 'default';
      };
    }
  }, [global, cursor, domElement, enabled]);

  // Smooth animation loop
  useFrame((_state, delta) => {
    if (!ref.current) return;
    easing.dampE(ref.current.rotation, animation.current.target, animation.current.damping, delta);
  });

  // Gesture handling with velocity tracking
  const bind = useGesture(
    {
      onHover: ({ last }) => {
        if (cursor && !global && enabled) {
          domElement.style.cursor = last ? 'auto' : 'grab';
        }
      },
      onDrag: ({ down, delta: [dx, dy], velocity: [vx, vy], memo }) => {
        if (!enabled) return memo;

        // Initialize memo with current rotation on drag start
        const [oldY, oldX] = memo || animation.current.target;

        if (cursor) {
          domElement.style.cursor = down ? 'grabbing' : 'grab';
        }

        // Calculate new rotation from drag delta
        const newX = MathUtils.clamp(oldX + (dx / size.width) * Math.PI * speed, ...rAzimuth);
        const newY = MathUtils.clamp(oldY + (dy / size.height) * Math.PI * speed, ...rPolar);

        if (down) {
          // While dragging: direct tracking (snappy response)
          animation.current.target = [newY, newX, 0];
          animation.current.damping = damping;
        } else {
          // On release: apply iOS-style momentum based on velocity
          const momentumScale = momentum * velocityMultiplier;

          // Only apply momentum if velocity exceeds threshold
          const hasHorizontalMomentum = Math.abs(vx) > minVelocityThreshold;
          const hasVerticalMomentum = Math.abs(vy) > minVelocityThreshold;

          // Project target position based on velocity
          // iOS formula: target = current + velocity × timeConstant
          let targetX = newX;
          let targetY = newY;

          if (hasHorizontalMomentum) {
            const momentumX = MathUtils.clamp(
              vx * momentumScale * timeConstant,
              -IOS_DEFAULTS.maxMomentum,
              IOS_DEFAULTS.maxMomentum,
            );
            targetX = MathUtils.clamp(newX + momentumX, ...rAzimuth);
          }

          if (hasVerticalMomentum) {
            const momentumY = MathUtils.clamp(
              vy * momentumScale * timeConstant,
              -IOS_DEFAULTS.maxMomentum,
              IOS_DEFAULTS.maxMomentum,
            );
            targetY = MathUtils.clamp(newY + momentumY, ...rPolar);
          }

          animation.current.target = [targetY, targetX, 0];
          // Use slightly higher damping during momentum coast for natural deceleration
          animation.current.damping = damping * 1.5;
        }

        return [newY, newX];
      },
    },
    {
      target: global ? domElement : undefined,
    },
  );

  return (
    <group ref={ref} {...(bind?.() || {})}>
      {children}
    </group>
  );
}

export default MomentumControls;
