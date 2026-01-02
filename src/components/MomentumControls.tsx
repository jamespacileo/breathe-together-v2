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

/** Exclusion zone definition for UI regions that should not trigger rotation */
export interface ExclusionZone {
  /** Position of the zone */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Width of the zone in pixels */
  width: number;
  /** Height of the zone in pixels */
  height: number;
}

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
  /** Exclusion zones where rotation should not be triggered (for overlays like r3f-perf) */
  exclusionZones?: ExclusionZone[];
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
  exclusionZones = [],
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

  // Track if currently dragging to prevent cursor flicker
  const isDraggingRef = React.useRef(false);

  // Sync damping when prop changes (for Leva real-time updates)
  React.useEffect(() => {
    animation.current.damping = damping;
  }, [damping]);

  // Check if coordinates are within an exclusion zone
  const isInExclusionZone = React.useCallback(
    (clientX: number, clientY: number): boolean => {
      if (exclusionZones.length === 0) return false;

      // Get canvas bounding rect to calculate relative positions
      const rect = domElement.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;

      return exclusionZones.some((zone) => {
        let zoneX: number;
        let zoneY: number;

        // Calculate zone position based on corner
        switch (zone.position) {
          case 'top-left':
            zoneX = 0;
            zoneY = 0;
            break;
          case 'top-right':
            zoneX = canvasWidth - zone.width;
            zoneY = 0;
            break;
          case 'bottom-left':
            zoneX = 0;
            zoneY = canvasHeight - zone.height;
            break;
          case 'bottom-right':
            zoneX = canvasWidth - zone.width;
            zoneY = canvasHeight - zone.height;
            break;
        }

        // Check if point is within zone bounds (with some padding)
        const padding = 10;
        return (
          x >= zoneX - padding &&
          x <= zoneX + zone.width + padding &&
          y >= zoneY - padding &&
          y <= zoneY + zone.height + padding
        );
      });
    },
    [exclusionZones, domElement],
  );

  // Position-aware cursor management
  // Only show grab cursor when NOT in exclusion zones (r3f-perf, Leva, etc.)
  React.useEffect(() => {
    if (!global || !cursor || !enabled) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Don't change cursor while actively dragging
      if (isDraggingRef.current) return;

      if (isInExclusionZone(e.clientX, e.clientY)) {
        domElement.style.cursor = 'default';
      } else {
        domElement.style.cursor = 'grab';
      }
    };

    // Initial cursor state (assume not in exclusion zone)
    domElement.style.cursor = 'grab';

    // Listen on document to catch all pointer movements
    document.addEventListener('pointermove', handlePointerMove);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      domElement.style.cursor = 'default';
    };
  }, [global, cursor, enabled, domElement, isInExclusionZone]);

  // Check if event target is within UI overlay (Leva, modals, perf monitor, etc.)
  const isUIElement = React.useCallback(
    (event: PointerEvent | MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;

      // First check exclusion zones by coordinates (for r3f-perf which uses portals)
      if ('clientX' in event && 'clientY' in event) {
        if (isInExclusionZone(event.clientX, event.clientY)) {
          return true;
        }
      }

      if (!target) return false;

      // Check if click is on UI elements that should not trigger rotation
      const uiSelectors = [
        // Our UI components (data attributes for reliable detection)
        '[data-ui]',
        '.gaia-ui',
        // Leva panel
        '[class*="leva"]',
        '[data-leva]',
        // r3f-perf performance monitor (renders with specific class patterns)
        '[class*="r3f-perf"]',
        '[class*="perf"]',
        // Interactive HTML elements
        'button',
        'input',
        'select',
        'textarea',
        'label',
        'a[href]',
        // ARIA roles for accessibility
        '[role="button"]',
        '[role="slider"]',
        '[role="dialog"]',
        '[role="menu"]',
        '[role="menuitem"]',
        // Common modal/overlay patterns
        '[class*="modal"]',
        '[class*="Modal"]',
        '[class*="overlay"]',
        '[class*="Overlay"]',
      ];

      return uiSelectors.some(
        (selector) => target.closest(selector) !== null || target.matches(selector),
      );
    },
    [isInExclusionZone],
  );

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
      onDrag: ({ down, delta: [dx, dy], velocity: [vx, vy], memo, event, first, last }) => {
        if (!enabled) return memo;

        // Ignore events from UI elements (Leva, modals, buttons, etc.)
        if (event && isUIElement(event as PointerEvent)) {
          // Reset dragging state if we were somehow dragging
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
          }
          return memo;
        }

        // Track dragging state for cursor management
        if (first) {
          isDraggingRef.current = true;
        }
        if (last) {
          isDraggingRef.current = false;
        }

        // Initialize memo with current rotation on drag start
        const [oldY, oldX] = memo || animation.current.target;

        // Cursor management - only change if not in exclusion zone
        if (cursor) {
          if (event && 'clientX' in event && 'clientY' in event) {
            const inExclusion = isInExclusionZone(
              (event as PointerEvent).clientX,
              (event as PointerEvent).clientY,
            );
            if (!inExclusion) {
              domElement.style.cursor = down ? 'grabbing' : 'grab';
            }
          } else {
            domElement.style.cursor = down ? 'grabbing' : 'grab';
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
