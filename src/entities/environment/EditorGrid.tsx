/**
 * StudioFloor - Minimal, elegant floor for stage/studio mode
 *
 * Design philosophy: Provide spatial reference without drawing attention.
 * "Felt but not seen" - users know where they are without thinking about it.
 *
 * Features:
 * - Soft radial shadow for natural grounding
 * - Minimal crosshair axes (X=coral, Z=periwinkle)
 * - Optional sparse reference grid (just major divisions)
 * - No z-fighting - shadow is a separate plane above grid
 */

import { Line } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { CircleGeometry, Color, ShaderMaterial } from 'three';

interface StudioFloorProps {
  /** Total size of the floor in world units @default 30 */
  size?: number;
  /** Number of major grid divisions (sparse) @default 6 */
  divisions?: number;
  /** Color of grid lines @default '#e0e0e0' */
  color?: string;
  /** Show axis helper lines @default true */
  showAxes?: boolean;
  /** Y position of the floor @default -3 */
  position?: number;
}

// Soft radial gradient shader for grounding shadow
const shadowVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const shadowFragmentShader = `
varying vec2 vUv;
uniform vec3 shadowColor;
uniform float opacity;

void main() {
  // Distance from center (0.5, 0.5)
  vec2 center = vUv - 0.5;
  float dist = length(center) * 2.0;

  // Soft falloff - gaussian-like curve
  float alpha = exp(-dist * dist * 3.0) * opacity;

  // Extra soft edge
  alpha *= smoothstep(1.0, 0.3, dist);

  gl_FragColor = vec4(shadowColor, alpha);
}
`;

/**
 * StudioFloor component - minimal, elegant floor with soft shadow
 */
export function EditorGrid({
  size = 30,
  divisions = 6,
  color = '#e0e0e0',
  showAxes = true,
  position = -3,
}: StudioFloorProps) {
  const halfSize = size / 2;
  const gridSpacing = size / divisions;

  // Muted axis colors - visible but not distracting
  const xAxisColor = '#daa0a0'; // Soft dusty rose
  const zAxisColor = '#a0a0da'; // Soft lavender

  // Shadow material with radial gradient
  const shadowMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        shadowColor: { value: new Color('#b8a898') },
        opacity: { value: 0.25 },
      },
      vertexShader: shadowVertexShader,
      fragmentShader: shadowFragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  // Shadow geometry
  const shadowGeometry = useMemo(() => {
    return new CircleGeometry(8, 64);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      shadowMaterial.dispose();
      shadowGeometry.dispose();
    };
  }, [shadowMaterial, shadowGeometry]);

  // Generate sparse grid lines (just major divisions)
  const gridLines = useMemo(() => {
    const lines: Array<{
      points: [[number, number, number], [number, number, number]];
      key: string;
    }> = [];

    // Horizontal lines (along X axis)
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const z = i * gridSpacing;
      if (i === 0) continue; // Skip center line (axis will cover it)
      lines.push({
        points: [
          [-halfSize, 0, z],
          [halfSize, 0, z],
        ],
        key: `h${i}`,
      });
    }

    // Vertical lines (along Z axis)
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const x = i * gridSpacing;
      if (i === 0) continue; // Skip center line (axis will cover it)
      lines.push({
        points: [
          [x, 0, -halfSize],
          [x, 0, halfSize],
        ],
        key: `v${i}`,
      });
    }

    return lines;
  }, [divisions, gridSpacing, halfSize]);

  return (
    <group>
      {/* Soft radial shadow - grounds the content elegantly */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, position + 0.02, 0]}
        geometry={shadowGeometry}
        material={shadowMaterial}
      />

      {/* Sparse reference grid - just major divisions */}
      <group position={[0, position + 0.01, 0]}>
        {gridLines.map((line) => (
          <Line
            key={line.key}
            points={line.points}
            color={color}
            lineWidth={0.5}
            transparent
            opacity={0.4}
          />
        ))}
      </group>

      {/* Axis indicators - subtle crosshair */}
      {showAxes && (
        <group position={[0, position + 0.015, 0]}>
          {/* X axis - dusty rose */}
          <Line
            points={[
              [-halfSize, 0, 0],
              [halfSize, 0, 0],
            ]}
            color={xAxisColor}
            lineWidth={1}
            transparent
            opacity={0.6}
          />

          {/* Z axis - soft lavender */}
          <Line
            points={[
              [0, 0, -halfSize],
              [0, 0, halfSize],
            ]}
            color={zAxisColor}
            lineWidth={1}
            transparent
            opacity={0.6}
          />
        </group>
      )}
    </group>
  );
}

export default EditorGrid;
