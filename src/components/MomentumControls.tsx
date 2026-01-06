import { useFrame, useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import { easing } from 'maath';
import * as React from 'react';
import { type Group, MathUtils } from 'three';
import {
  calculateMomentumDelta,
  calculateTargetZoom,
  getDomEventTarget,
  isUiEventTarget,
  normalizeWheelDeltaY,
  shouldHandleSceneWheel,
} from '../lib/sceneInput';

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

/**
 * Zoom defaults for scroll-to-zoom
 */
const ZOOM_DEFAULTS = {
  min: 0.5,
  max: 2.0,
  speed: 0.001,
  damping: 0.15,
};

interface MomentumControlsProps {
  /** Enable/disable the controls */
  enabled?: boolean;
  /** Show grab cursor on the canvas */
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
  /** Enable scroll-to-zoom (default: true) */
  enableZoom?: boolean;
  /** Minimum zoom level (default: 0.5 = zoomed out) */
  minZoom?: number;
  /** Maximum zoom level (default: 2.0 = zoomed in) */
  maxZoom?: number;
  /** Zoom sensitivity (default: 0.001) */
  zoomSpeed?: number;
  children?: React.ReactNode;
}

/**
 * MomentumControls - PresentationControls with iOS-style momentum scrolling
 *
 * When you flick/drag and release, the object continues rotating based on
 * release velocity, then decelerates smoothly (like iPhone scrolling).
 *
 * Uses exponential decay: position = target - amplitude × e^(-t/timeConstant)
 *
 * Event handling:
 * - Uses R3F's pointer events on the group element (not global DOM events)
 * - Works with eventSource pattern on Canvas for proper HTML overlay support
 * - Cursor is managed via the eventSource element style when enabled
 */
export function MomentumControls({
  enabled = true,
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
  enableZoom = true,
  minZoom = ZOOM_DEFAULTS.min,
  maxZoom = ZOOM_DEFAULTS.max,
  zoomSpeed = ZOOM_DEFAULTS.speed,
  children,
}: MomentumControlsProps) {
  const gl = useThree((state) => state.gl);
  const events = useThree((state) => state.events);
  const { size } = useThree();

  const domElement = gl.domElement;
  // Get the actual event source element (container div) since canvas has pointer-events: none
  // when using the eventSource pattern
  const eventSourceElement = (events.connected || domElement) as HTMLElement;
  const cursorTarget = eventSourceElement || domElement;
  const touchActionRef = React.useRef<string | null>(null);

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
    zoom: 1.0,
    targetZoom: 1.0,
  });

  // Group ref for direct manipulation
  const ref = React.useRef<Group>(null);

  // Sync damping when prop changes (for Leva real-time updates)
  React.useEffect(() => {
    animation.current.damping = damping;
  }, [damping]);

  // Cursor management - simple approach via canvas style
  React.useEffect(() => {
    if (!cursorTarget) return;

    if (!cursor || !enabled) {
      cursorTarget.style.cursor = 'default';
      return;
    }

    return () => {
      cursorTarget.style.cursor = 'default';
    };
  }, [cursor, enabled, cursorTarget]);

  React.useEffect(() => {
    return () => {
      if (touchActionRef.current !== null && cursorTarget) {
        cursorTarget.style.touchAction = touchActionRef.current;
        touchActionRef.current = null;
      }
    };
  }, [cursorTarget]);

  React.useEffect(() => {
    if (!enabled && touchActionRef.current !== null && cursorTarget) {
      cursorTarget.style.touchAction = touchActionRef.current;
      touchActionRef.current = null;
    }
  }, [enabled, cursorTarget]);

  // Smooth animation loop
  useFrame((_state, delta) => {
    if (!ref.current || !enabled) return;

    // Smoothly interpolate rotation toward target
    easing.dampE(ref.current.rotation, animation.current.target, animation.current.damping, delta);

    // Smoothly interpolate zoom toward target zoom
    if (enableZoom) {
      animation.current.zoom = MathUtils.damp(
        animation.current.zoom,
        animation.current.targetZoom,
        ZOOM_DEFAULTS.damping / delta,
        delta,
      );
      const scale = animation.current.zoom;
      ref.current.scale.set(scale, scale, scale);
    }
  });

  // Gesture handling with velocity tracking
  useGesture(
    {
      onHover: ({ hovering, event }) => {
        if (!cursor || !enabled || !cursorTarget) return;
        const target = getDomEventTarget(event);
        if (isUiEventTarget(target)) {
          cursorTarget.style.cursor = 'default';
          return;
        }
        cursorTarget.style.cursor = hovering ? 'grab' : 'default';
      },
      onMove: ({ event }) => {
        if (!cursor || !enabled || !cursorTarget) return;
        const target = getDomEventTarget(event);
        cursorTarget.style.cursor = isUiEventTarget(target) ? 'default' : 'grab';
      },
      onDrag: ({ down, delta: [dx, dy], velocity: [vx, vy], memo, event, last }) => {
        if (!enabled) return memo;
        let dragState = memo as { oldY: number; oldX: number; isUi: boolean } | undefined;
        if (!dragState) {
          const target = getDomEventTarget(event);
          const isUi = isUiEventTarget(target);
          const [oldY, oldX] = animation.current.target;
          dragState = { oldY, oldX, isUi };
        }

        if (dragState.isUi) {
          if (last && touchActionRef.current !== null && cursorTarget) {
            cursorTarget.style.touchAction = touchActionRef.current;
            touchActionRef.current = null;
          }
          return dragState;
        }

        // Initialize memo with current rotation on drag start
        const { oldY, oldX } = dragState;

        if (cursor && cursorTarget) {
          cursorTarget.style.cursor = down ? 'grabbing' : 'grab';
        }

        if (cursorTarget) {
          if (down) {
            if (touchActionRef.current === null) {
              touchActionRef.current = cursorTarget.style.touchAction;
            }
            cursorTarget.style.touchAction = 'none';
          } else if (touchActionRef.current !== null) {
            cursorTarget.style.touchAction = touchActionRef.current;
            touchActionRef.current = null;
          }
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
          const { deltaX, deltaY, hasMomentumX, hasMomentumY } = calculateMomentumDelta({
            velocity: [vx, vy],
            size,
            speed,
            momentum,
            velocityMultiplier,
            timeConstant,
            minVelocityThreshold,
            maxMomentum: IOS_DEFAULTS.maxMomentum,
          });

          let targetX = newX;
          let targetY = newY;

          if (hasMomentumX) {
            targetX = MathUtils.clamp(newX + deltaX, ...rAzimuth);
          }

          if (hasMomentumY) {
            targetY = MathUtils.clamp(newY + deltaY, ...rPolar);
          }

          animation.current.target = [targetY, targetX, 0];
          // Use slightly higher damping during momentum coast for natural deceleration
          animation.current.damping = damping * 1.5;
        }

        dragState.oldX = newX;
        dragState.oldY = newY;

        return dragState;
      },
    },
    {
      target: eventSourceElement,
      enabled,
    },
  );

  // Wheel zoom handler - attached to eventSource element since canvas has pointer-events: none
  // when using the eventSource pattern for HTML overlay support
  React.useEffect(() => {
    if (!enabled || !enableZoom || !eventSourceElement) return;

    const handleWheel = (event: WheelEvent) => {
      if (!shouldHandleSceneWheel(event, eventSourceElement)) return;
      // Prevent page scroll when zooming
      event.preventDefault();

      // Calculate new zoom level based on scroll delta
      // Negative delta = scroll up = zoom in (increase zoom)
      // Positive delta = scroll down = zoom out (decrease zoom)
      const wheelDelta = normalizeWheelDeltaY(event);
      animation.current.targetZoom = calculateTargetZoom(animation.current.targetZoom, wheelDelta, {
        min: minZoom,
        max: maxZoom,
        speed: zoomSpeed,
      });
    };

    // Attach to eventSource element (the container div that receives events)
    eventSourceElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      eventSourceElement.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, enableZoom, zoomSpeed, minZoom, maxZoom, eventSourceElement]);

  return <group ref={ref}>{children}</group>;
}
