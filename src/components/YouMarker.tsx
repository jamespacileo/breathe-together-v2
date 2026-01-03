/**
 * YouMarker - Holographic "YOU" label with outline that tracks the current user's shard
 *
 * Features:
 * - Outline mesh using inverted hull technique (scaled backface)
 * - Line from shard center to label
 * - Label positioned outward from shard
 *
 * Architecture:
 * - Reads position from UserPositionContext (updated by ParticleSwarm)
 * - Uses useFrame to smoothly interpolate position
 * - Outline mesh follows shard position/rotation/scale
 *
 * Important: Always renders the group element to maintain refs for useFrame.
 * Visibility is controlled via Three.js `visible` property, not conditional JSX.
 * This ensures position updates from ParticleSwarm are captured correctly.
 */

import { Html, Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { USER_TRACKING } from '../constants';
import { useUserPosition } from '../contexts/UserPositionContext';

// Outline configuration
const OUTLINE_SCALE = 1.15; // How much larger the outline is than the shard
const OUTLINE_COLOR = USER_TRACKING.SELF_HIGHLIGHT_COLOR;

// Line configuration
const LINE_LENGTH = 1.2; // Length of line from shard center
const LINE_WIDTH = 2;

// Label offset from line end
const LABEL_OFFSET = 0.15;

// Smooth position tracking
const POSITION_SMOOTHING = 8.0;

// How often to check visibility state for HTML rendering (ms)
const VISIBILITY_POLL_INTERVAL = 100;

export interface YouMarkerProps {
  /** Whether to show the marker @default true */
  visible?: boolean;
  /** Label text @default "YOU" */
  label?: string;
}

export function YouMarker({ visible = true, label = 'YOU' }: YouMarkerProps) {
  const { positionRef } = useUserPosition();
  const { camera } = useThree();

  // Track visibility in state for Html component (needs React re-render to mount/unmount)
  const [isUserVisible, setIsUserVisible] = useState(false);

  // Refs for smooth animation
  const outlineMeshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const smoothedPosition = useRef(new THREE.Vector3());
  const smoothedScale = useRef(1);
  const isInitialized = useRef(false);

  // Line points ref (updated each frame)
  const linePointsRef = useRef<[THREE.Vector3, THREE.Vector3]>([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const labelPositionRef = useRef(new THREE.Vector3());

  // Pre-allocated vectors for animation loop (avoid GC pressure)
  const toCameraRef = useRef(new THREE.Vector3());
  const lineEndRef = useRef(new THREE.Vector3());
  const upVectorRef = useRef(new THREE.Vector3(0, LINE_LENGTH * 0.7, 0));

  // Create outline geometry (same as shard - icosahedron)
  const outlineGeometry = useMemo(() => new THREE.IcosahedronGeometry(0.3, 0), []);

  // Create outline material (backface only, flat color)
  const outlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: OUTLINE_COLOR,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );

  // Cleanup geometry and material on unmount
  useEffect(() => {
    return () => {
      outlineGeometry.dispose();
      outlineMaterial.dispose();
    };
  }, [outlineGeometry, outlineMaterial]);

  // Poll visibility state at a slower rate to trigger React re-renders for Html
  // This avoids re-rendering every frame while still keeping UI responsive
  useEffect(() => {
    const interval = setInterval(() => {
      const currentVisible = positionRef.current?.isVisible ?? false;
      setIsUserVisible((prev) => {
        if (prev !== currentVisible) return currentVisible;
        return prev;
      });
    }, VISIBILITY_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [positionRef]);

  useFrame((_state, delta) => {
    if (!positionRef.current || !groupRef.current) return;

    const userPos = positionRef.current;

    // Hide group if user is not visible or prop says not visible
    const shouldShow = userPos.isVisible && visible;
    groupRef.current.visible = shouldShow;

    if (!shouldShow) {
      return;
    }

    // Use actual delta from frame, clamped to prevent huge jumps
    const clampedDelta = Math.min(delta, 0.1);

    // Initialize position on first visible frame
    if (!isInitialized.current) {
      smoothedPosition.current.copy(userPos.position);
      smoothedScale.current = userPos.scale;
      isInitialized.current = true;
    }

    // Smooth interpolation for position
    const lerpFactor = 1 - Math.exp(-POSITION_SMOOTHING * clampedDelta);
    smoothedPosition.current.lerp(userPos.position, lerpFactor);
    smoothedScale.current += (userPos.scale - smoothedScale.current) * lerpFactor;

    // Update outline mesh position and scale
    if (outlineMeshRef.current) {
      outlineMeshRef.current.position.copy(smoothedPosition.current);
      // Scale outline slightly larger than the shard
      const outlineScale = smoothedScale.current * OUTLINE_SCALE * 0.3; // 0.3 is base shard size
      outlineMeshRef.current.scale.setScalar(outlineScale / 0.3); // Normalize to geometry size
    }

    // Calculate direction from shard center toward camera (for line direction)
    // Uses pre-allocated vector to avoid GC pressure
    const toCamera = toCameraRef.current
      .subVectors(camera.position, smoothedPosition.current)
      .normalize();

    // Line starts at shard center
    linePointsRef.current[0].copy(smoothedPosition.current);

    // Line ends at offset toward camera (perpendicular to view, slightly up and toward camera)
    // Uses pre-allocated vector to avoid GC pressure
    const lineEnd = lineEndRef.current
      .copy(smoothedPosition.current)
      .addScaledVector(toCamera, LINE_LENGTH * 0.5) // Move toward camera
      .add(upVectorRef.current); // Move up

    linePointsRef.current[1].copy(lineEnd);

    // Label position is at the end of the line, slightly further out
    labelPositionRef.current.copy(lineEnd).addScaledVector(toCamera, LABEL_OFFSET);
  });

  // Always render group (for useFrame to have refs), but control visibility via Three.js
  // Html component is conditionally rendered based on state to avoid DOM nodes when hidden
  const showHtml = isUserVisible && visible;

  return (
    <group ref={groupRef} visible={false}>
      {/* Outline mesh - inverted hull technique */}
      <mesh ref={outlineMeshRef} geometry={outlineGeometry} material={outlineMaterial} />

      {/* Line from shard center to label */}
      <Line
        points={linePointsRef.current}
        color={OUTLINE_COLOR}
        lineWidth={LINE_WIDTH}
        transparent
        opacity={0.9}
      />

      {/* Label at end of line - only mount when visible to avoid DOM overhead */}
      {showHtml && (
        <Html
          position={labelPositionRef.current}
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <output className="you-marker-label" aria-label={`Your shard is marked as ${label}`}>
            <span className="you-marker-text" aria-hidden="true">
              {label}
            </span>
          </output>

          <style>{`
            .you-marker-label {
              padding: 6px 14px;
              background: rgba(0, 0, 0, 0.7);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              border: 1.5px solid ${OUTLINE_COLOR};
              border-radius: 6px;
              box-shadow:
                0 0 16px ${OUTLINE_COLOR}60,
                0 4px 12px rgba(0, 0, 0, 0.4);
              filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            }

            .you-marker-text {
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.15em;
              color: ${OUTLINE_COLOR};
              text-shadow:
                0 0 8px ${OUTLINE_COLOR},
                0 0 16px ${OUTLINE_COLOR}80;
            }
          `}</style>
        </Html>
      )}
    </group>
  );
}

export default YouMarker;
