/**
 * UserShapeIndicator - Minimal marker for user's particle
 *
 * Very simple, unobtrusive design:
 * - Small chevron/arrow pointing down
 * - Clean "YOU" text label
 * - Subtle pulse animation
 *
 * The holographic outline glow is handled by ParticleSwarm directly.
 * This component just provides the floating label above the shard.
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
   * Height offset above the shard
   * @default 0.8
   */
  heightOffset?: number;

  /**
   * Base opacity of the indicator elements
   * @default 0.8
   */
  opacity?: number;

  /**
   * Whether the indicator is visible
   * @default true
   */
  visible?: boolean;
}

// Warm white to match Monument Valley aesthetic
const TEXT_COLOR = '#f5f0e8';
const CHEVRON_COLOR = '#ffffff';

export function UserShapeIndicator({
  getShardPosition,
  heightOffset = 0.8,
  opacity = 0.8,
  visible = true,
}: UserShapeIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const chevronRef = useRef<THREE.Line | null>(null);
  const pulseRef = useRef(0);

  // Create chevron (small downward pointing arrow)
  const chevronObject = useMemo(() => {
    const points = [
      new THREE.Vector3(-0.08, 0.06, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.08, 0.06, 0),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(CHEVRON_COLOR),
      transparent: true,
      opacity: opacity * 0.6,
      depthTest: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    chevronRef.current = line;
    return { line, geometry, material };
  }, [opacity]);

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      chevronObject.geometry.dispose();
      chevronObject.material.dispose();
    };
  }, [chevronObject]);

  // Animation loop - update position and subtle pulse
  useFrame((state) => {
    if (!groupRef.current || !visible) return;

    const position = getShardPosition();
    if (!position) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    // Position above the shard
    groupRef.current.position.set(position.x, position.y + heightOffset, position.z);

    // Subtle pulse animation (very slow, understated)
    pulseRef.current = state.clock.elapsedTime;
    const pulse = 0.85 + 0.15 * Math.sin(pulseRef.current * 1.2);

    // Apply pulse to chevron opacity
    chevronObject.material.opacity = opacity * 0.6 * pulse;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} name="User Indicator">
      {/* Small chevron pointing down at shard */}
      <Billboard follow>
        <primitive object={chevronObject.line} position={[0, -0.12, 0]} />
      </Billboard>

      {/* "YOU" text - clean, minimal */}
      <Billboard follow>
        <Text
          position={[0, 0.08, 0]}
          fontSize={0.12}
          color={TEXT_COLOR}
          anchorX="center"
          anchorY="bottom"
          fillOpacity={opacity * 0.9}
          letterSpacing={0.08}
        >
          YOU
        </Text>
      </Billboard>
    </group>
  );
}

export default UserShapeIndicator;
