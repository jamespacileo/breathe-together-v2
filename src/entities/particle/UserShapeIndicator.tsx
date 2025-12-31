/**
 * UserShapeIndicator - Minimal Ubisoft-style marker for user's particle
 *
 * Clean, understated design inspired by Assassin's Creed waypoint markers:
 * - Thin vertical line extending upward from the shard
 * - Small diamond marker at the top
 * - Clean "YOU" text label
 * - Subtle pulse animation (opacity only)
 *
 * Positioned in world space (should be placed OUTSIDE PresentationControls)
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface UserShapeIndicatorProps {
  /**
   * Function that returns the current world position of the user's shard
   * Called every frame to track the shard position
   */
  getShardPosition: () => THREE.Vector3 | null;

  /**
   * Height of the vertical line above the shard
   * @default 1.2
   */
  lineHeight?: number;

  /**
   * Base opacity of the indicator elements
   * @default 0.7
   */
  opacity?: number;

  /**
   * Whether the indicator is visible
   * @default true
   */
  visible?: boolean;

  /**
   * Primary color for the marker
   * @default '#ffffff'
   */
  color?: string;
}

// Subtle accent color - warm white to match Monument Valley aesthetic
const ACCENT_COLOR = '#f5f0e8';

/**
 * Create a diamond shape geometry (rotated square)
 */
function createDiamondGeometry(size: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const half = size / 2;

  // Diamond points (rotated square)
  shape.moveTo(0, half); // Top
  shape.lineTo(half, 0); // Right
  shape.lineTo(0, -half); // Bottom
  shape.lineTo(-half, 0); // Left
  shape.closePath();

  return new THREE.ShapeGeometry(shape);
}

export function UserShapeIndicator({
  getShardPosition,
  lineHeight = 1.2,
  opacity = 0.7,
  visible = true,
  color = '#ffffff',
}: UserShapeIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const diamondRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  // Create line object
  const lineObject = useMemo(() => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, lineHeight, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: opacity * 0.5,
      depthTest: true,
      depthWrite: false,
    });
    return { line: new THREE.Line(geometry, material), geometry, material };
  }, [lineHeight, color, opacity]);

  // Create diamond geometry
  const diamondGeometry = useMemo(() => createDiamondGeometry(0.12), []);

  // Create diamond material
  const diamondMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
  }, [color, opacity]);

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      lineObject.geometry.dispose();
      lineObject.material.dispose();
      diamondGeometry.dispose();
      diamondMaterial.dispose();
    };
  }, [lineObject, diamondGeometry, diamondMaterial]);

  // Animation loop - update position and subtle pulse
  useFrame((state) => {
    if (!groupRef.current || !visible) return;

    const position = getShardPosition();
    if (!position) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position.copy(position);

    // Subtle pulse animation (slow, understated)
    pulseRef.current = state.clock.elapsedTime;
    const pulse = 0.85 + 0.15 * Math.sin(pulseRef.current * 1.5);

    // Apply pulse to materials
    lineObject.material.opacity = opacity * 0.5 * pulse;
    diamondMaterial.opacity = opacity * pulse;

    // Make diamond always face camera (billboard effect for the diamond)
    if (diamondRef.current) {
      diamondRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} name="User Indicator">
      {/* Thin vertical line */}
      <primitive object={lineObject.line} />

      {/* Small diamond marker at top of line */}
      <mesh
        ref={diamondRef}
        geometry={diamondGeometry}
        material={diamondMaterial}
        position={[0, lineHeight + 0.1, 0]}
      />

      {/* "YOU" text - clean, minimal */}
      <Billboard
        position={[0, lineHeight + 0.35, 0]}
        follow
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <Text
          fontSize={0.15}
          color={ACCENT_COLOR}
          anchorX="center"
          anchorY="bottom"
          fillOpacity={opacity * 0.9}
          letterSpacing={0.1}
        >
          YOU
        </Text>
      </Billboard>
    </group>
  );
}

export default UserShapeIndicator;
