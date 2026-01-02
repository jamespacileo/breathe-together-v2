/**
 * YouMarker - Holographic "YOU" label that tracks the current user's shard
 *
 * Uses drei's Html component to render a CSS-styled label in 3D space.
 * The label follows the user's shard position and includes a connector line.
 *
 * Architecture:
 * - Reads position from UserPositionContext (updated by ParticleSwarm)
 * - Uses useFrame to smoothly interpolate position
 * - Html component handles 3D-to-2D projection
 *
 * Styling:
 * - Holographic/frosted glass aesthetic matching Monument Valley style
 * - High contrast for readability over any background
 * - Animated glow effect synchronized with breathing
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { USER_TRACKING } from '../constants';
import { useUserPosition } from '../contexts/UserPositionContext';

// Offset for label position (slightly above and to the side of the shard)
const LABEL_OFFSET = new THREE.Vector3(0.3, 0.5, 0);

// Smooth position tracking
const POSITION_SMOOTHING = 8.0;

export interface YouMarkerProps {
  /** Whether to show the marker @default true */
  visible?: boolean;
  /** Label text @default "YOU" */
  label?: string;
  /** Opacity of the marker (0-1) @default 1 */
  opacity?: number;
}

export function YouMarker({ visible = true, label = 'YOU', opacity = 1 }: YouMarkerProps) {
  const { positionRef } = useUserPosition();
  const groupRef = useRef<THREE.Group>(null);
  const smoothedPosition = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  // Smoothly interpolate position each frame
  useFrame((_, delta) => {
    if (!groupRef.current || !positionRef.current) return;

    const userPos = positionRef.current;

    // Don't render if user is not visible
    if (!userPos.isVisible) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = visible;

    // Calculate target position (shard position + offset)
    const targetX = userPos.position.x + LABEL_OFFSET.x;
    const targetY = userPos.position.y + LABEL_OFFSET.y;
    const targetZ = userPos.position.z + LABEL_OFFSET.z;

    // Initialize position on first frame
    if (!isInitialized.current) {
      smoothedPosition.current.set(targetX, targetY, targetZ);
      isInitialized.current = true;
    }

    // Smooth interpolation
    const lerpFactor = 1 - Math.exp(-POSITION_SMOOTHING * delta);
    smoothedPosition.current.x += (targetX - smoothedPosition.current.x) * lerpFactor;
    smoothedPosition.current.y += (targetY - smoothedPosition.current.y) * lerpFactor;
    smoothedPosition.current.z += (targetZ - smoothedPosition.current.z) * lerpFactor;

    groupRef.current.position.copy(smoothedPosition.current);
  });

  return (
    <group ref={groupRef}>
      <Html
        center
        distanceFactor={10}
        style={{
          opacity: opacity,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div className="you-marker">
          {/* Connector line from label to shard */}
          <div className="you-marker__line" />
          {/* Label container */}
          <div className="you-marker__label">
            <span className="you-marker__text">{label}</span>
          </div>
        </div>

        {/* Inline styles for the marker */}
        <style>{`
          .you-marker {
            display: flex;
            flex-direction: column;
            align-items: center;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
          }

          .you-marker__line {
            width: 2px;
            height: 24px;
            background: linear-gradient(
              to bottom,
              ${USER_TRACKING.SELF_HIGHLIGHT_COLOR},
              ${USER_TRACKING.SELF_HIGHLIGHT_COLOR}80
            );
            border-radius: 1px;
            box-shadow: 0 0 8px ${USER_TRACKING.SELF_HIGHLIGHT_COLOR}80;
          }

          .you-marker__label {
            padding: 4px 12px;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid ${USER_TRACKING.SELF_HIGHLIGHT_COLOR}60;
            border-radius: 4px;
            box-shadow:
              0 0 12px ${USER_TRACKING.SELF_HIGHLIGHT_COLOR}40,
              inset 0 0 8px ${USER_TRACKING.SELF_HIGHLIGHT_COLOR}20;
          }

          .you-marker__text {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.1em;
            color: ${USER_TRACKING.SELF_HIGHLIGHT_COLOR};
            text-shadow:
              0 0 8px ${USER_TRACKING.SELF_HIGHLIGHT_COLOR},
              0 0 16px ${USER_TRACKING.SELF_HIGHLIGHT_COLOR}80;
          }

          /* Subtle pulse animation */
          @keyframes you-marker-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
          }

          .you-marker__label {
            animation: you-marker-pulse 4s ease-in-out infinite;
          }
        `}</style>
      </Html>
    </group>
  );
}

export default YouMarker;
