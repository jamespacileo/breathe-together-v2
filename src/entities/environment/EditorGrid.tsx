/**
 * EditorGrid - Wireframe grid floor for stage/editor mode
 *
 * Renders a 3D editor-style grid floor at y=0, similar to Blender or Unity.
 * Only visible when stage mode is enabled.
 *
 * Features:
 * - Configurable grid size and subdivisions
 * - Customizable grid color
 * - Helper axes (X=red, Z=blue) for orientation
 * - Transparent background integration
 */

import { Grid, Line } from '@react-three/drei';

interface EditorGridProps {
  /** Total size of the grid in world units @default 20 */
  size?: number;
  /** Number of grid subdivisions @default 20 */
  divisions?: number;
  /** Color of grid lines @default '#666666' */
  color?: string;
  /** Show axis helper lines @default true */
  showAxes?: boolean;
  /** Y position of the grid @default -3 */
  position?: number;
}

/**
 * EditorGrid component - renders a 3D editor-style floor grid
 *
 * Uses drei's Grid helper for efficient rendering with:
 * - Configurable size and cell divisions
 * - Fade distance for infinite grid feel
 * - Optional axis indicators
 */
export function EditorGrid({
  size = 20,
  divisions = 20,
  color = '#666666',
  showAxes = true,
  position = -3,
}: EditorGridProps) {
  const halfSize = size / 2;

  return (
    <group>
      {/* Main grid floor */}
      <Grid
        position={[0, position, 0]}
        args={[size, size]}
        cellSize={size / divisions}
        cellThickness={0.5}
        cellColor={color}
        sectionSize={size / 4}
        sectionThickness={1}
        sectionColor={color}
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      {/* Axis indicators using drei Line component */}
      {showAxes && (
        <group position={[0, position + 0.01, 0]}>
          {/* X axis - red */}
          <Line
            points={[
              [-halfSize, 0, 0],
              [halfSize, 0, 0],
            ]}
            color="#ff4444"
            lineWidth={2}
          />

          {/* Z axis - blue */}
          <Line
            points={[
              [0, 0, -halfSize],
              [0, 0, halfSize],
            ]}
            color="#4444ff"
            lineWidth={2}
          />
        </group>
      )}
    </group>
  );
}

export default EditorGrid;
