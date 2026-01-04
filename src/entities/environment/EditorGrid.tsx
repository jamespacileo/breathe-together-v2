/**
 * StudioGrid - Refined grid floor for stage/studio mode
 *
 * A minimal, polished grid floor inspired by high-end 3D visualization
 * tools and product photography studios.
 *
 * Features:
 * - Subtle, elegant grid lines that don't compete with content
 * - Soft fade to background for infinite floor illusion
 * - Optional muted axis indicators
 * - Light theme optimized (works on white/cream backgrounds)
 */

import { Grid, Line } from '@react-three/drei';

interface StudioGridProps {
  /** Total size of the grid in world units @default 30 */
  size?: number;
  /** Number of grid subdivisions @default 30 */
  divisions?: number;
  /** Color of grid lines @default '#d0d0d0' */
  color?: string;
  /** Show axis helper lines @default true */
  showAxes?: boolean;
  /** Y position of the grid @default -3 */
  position?: number;
}

/**
 * StudioGrid component - renders a refined studio-style floor grid
 *
 * Design philosophy: The grid should provide spatial reference without
 * drawing attention away from the main content. Subtle, elegant, invisible
 * until you need it.
 */
export function EditorGrid({
  size = 30,
  divisions = 30,
  color = '#d0d0d0',
  showAxes = true,
  position = -3,
}: StudioGridProps) {
  const halfSize = size / 2;

  // Muted axis colors - visible but not distracting
  const xAxisColor = '#e88888'; // Soft coral red
  const zAxisColor = '#8888e8'; // Soft periwinkle blue

  return (
    <group>
      {/* Main grid floor - subtle and refined */}
      <Grid
        position={[0, position, 0]}
        args={[size, size]}
        cellSize={size / divisions}
        cellThickness={0.6}
        cellColor={color}
        sectionSize={size / 6}
        sectionThickness={1.2}
        sectionColor={color}
        fadeDistance={40}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid={true}
      />

      {/* Axis indicators - muted tones */}
      {showAxes && (
        <group position={[0, position + 0.01, 0]}>
          {/* X axis - soft red */}
          <Line
            points={[
              [-halfSize, 0, 0],
              [halfSize, 0, 0],
            ]}
            color={xAxisColor}
            lineWidth={1.5}
          />

          {/* Z axis - soft blue */}
          <Line
            points={[
              [0, 0, -halfSize],
              [0, 0, halfSize],
            ]}
            color={zAxisColor}
            lineWidth={1.5}
          />
        </group>
      )}
    </group>
  );
}

export default EditorGrid;
