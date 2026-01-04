/**
 * StudioFloor - Minimal, performant floor for stage/studio mode
 *
 * Design philosophy: Provide spatial reference without drawing attention.
 * Performance: Uses drei's native Grid (single draw call) + gridHelper.
 *
 * Features:
 * - Native drei Grid component (highly optimized, single draw call)
 * - gridHelper for axis reference (single draw call)
 * - Soft radial shadow via simple transparent circle
 */

import { Grid } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { CircleGeometry, Color, MeshBasicMaterial } from 'three';

interface StudioFloorProps {
  /** Total size of the floor in world units @default 30 */
  size?: number;
  /** Number of grid divisions @default 6 */
  divisions?: number;
  /** Color of grid lines @default '#e0e0e0' */
  color?: string;
  /** Show axis helper lines @default true */
  showAxes?: boolean;
  /** Y position of the floor @default -3 */
  position?: number;
}

/**
 * StudioFloor component - performant minimal floor
 *
 * Uses drei's Grid (single draw call) instead of multiple Line components.
 * Shadow uses simple MeshBasicMaterial with vertex colors for gradient.
 */
export function EditorGrid({
  size = 30,
  divisions = 6,
  color = '#e0e0e0',
  showAxes = true,
  position = -3,
}: StudioFloorProps) {
  // Simple shadow material - single draw call
  const shadowMaterial = useMemo(() => {
    return new MeshBasicMaterial({
      color: new Color('#c0b0a0'),
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
  }, []);

  // Shadow geometry - simple circle
  const shadowGeometry = useMemo(() => {
    return new CircleGeometry(6, 32);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      shadowMaterial.dispose();
      shadowGeometry.dispose();
    };
  }, [shadowMaterial, shadowGeometry]);

  return (
    <group>
      {/* Soft circular shadow - single draw call */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, position + 0.005, 0]}
        geometry={shadowGeometry}
        material={shadowMaterial}
      />

      {/* Native drei Grid - highly optimized, single draw call */}
      {/* No z-fighting: Grid renders at exact position, shadow slightly above */}
      <Grid
        position={[0, position, 0]}
        args={[size, size]}
        cellSize={size / divisions}
        cellThickness={0.4}
        cellColor={color}
        sectionSize={size / divisions}
        sectionThickness={0.8}
        sectionColor={color}
        fadeDistance={35}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid={true}
      />

      {/* Native gridHelper for axes - single draw call, uses vertex colors */}
      {showAxes && (
        <gridHelper args={[size, 2, '#d4a0a0', '#a0a0d4']} position={[0, position + 0.001, 0]} />
      )}
    </group>
  );
}

export default EditorGrid;
