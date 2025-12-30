/**
 * Particle Presets Comparison Scene
 *
 * Displays all 3 particle presets in a grid layout for visual comparison.
 *
 * **Grid Layout (1x3):**
 * - Left: Calm (meditative motion)
 * - Center: Balanced (standard motion)
 * - Right: Dynamic (energetic motion)
 *
 * Use in Triplex to:
 * - Compare motion personalities (calm vs balanced vs dynamic)
 * - Verify glass icosahedron rendering with neon edges
 * - Test lighting requirements
 * - Tune spacing and capacity
 */

import { Html } from '@react-three/drei';
import { CanvasProvider, GlobalProvider } from '../../../contexts/triplex';
import { Environment } from '../../environment';
import { Balanced, Calm, Dynamic } from '../presets';

interface ParticleComparisonSceneProps {
  /**
   * Grid layout orientation.
   *
   * - **2x3**: 2 columns, 3 rows (default)
   * - **3x2**: 3 columns, 2 rows
   * - **1x6**: Single horizontal row
   *
   * @group "Layout"
   * @enum ["2x3", "3x2", "1x6"]
   * @default "2x3"
   */
  layout?: '2x3' | '3x2' | '1x6';

  /**
   * Spacing between preset instances.
   *
   * Distance in Three.js units between each preset.
   *
   * @group "Layout"
   * @min 3
   * @max 15
   * @step 0.5
   * @default 8
   */
  spacing?: number;

  /**
   * Particle count per preset instance.
   *
   * Lower count recommended for performance with 6 instances.
   * Total particles = capacity × 6.
   *
   * @group "Performance"
   * @min 50
   * @max 400
   * @step 50
   * @default 150
   */
  capacity?: number;

  /**
   * Show preset name labels.
   *
   * Displays name, motion, and visual style above each preset.
   *
   * @group "Debug"
   * @default true
   */
  showLabels?: boolean;

  /**
   * Enable scene lighting.
   *
   * Required for crystalline presets (PBR materials).
   *
   * @group "Rendering"
   * @default true
   */
  showLighting?: boolean;

  /**
   * Background color.
   *
   * @group "Rendering"
   * @type color
   * @default "#0a0f1a"
   */
  backgroundColor?: string;
}

/**
 * Particle Presets Comparison Scene.
 *
 * Shows all 6 presets in a configurable grid layout.
 */
export function ParticleComparisonScene({
  layout = '2x3',
  spacing = 8,
  capacity = 150,
  showLabels = true,
  showLighting = true,
  backgroundColor = '#0a0f1a',
}: ParticleComparisonSceneProps = {}) {
  // Calculate positions based on layout
  const positions = calculatePositions(layout, spacing);

  // Preset metadata for labels
  const presets = [
    { Component: Calm, name: 'Calm', motion: 'Meditative (0.5×)', visual: 'Glass Icosahedrons' },
    {
      Component: Balanced,
      name: 'Balanced',
      motion: 'Standard (1.0×)',
      visual: 'Glass Icosahedrons',
    },
    {
      Component: Dynamic,
      name: 'Dynamic',
      motion: 'Energetic (1.5×)',
      visual: 'Glass Icosahedrons',
    },
  ];

  return (
    <GlobalProvider>
      <CanvasProvider>
        <color attach="background" args={[backgroundColor]} />

        {showLighting && <Environment preset="studio" atmosphere={0.5} />}

        {presets.map((preset, index) => {
          const [x, y, z] = positions[index];
          const { Component, name, motion, visual } = preset;

          return (
            <group key={name} position={[x, y, z]}>
              <Component capacity={capacity} />

              {showLabels && (
                <Html position={[0, 3, 0]} center>
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.7)',
                      padding: '8px 12px',
                      borderRadius: 4,
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{name}</div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>
                      {motion} · {visual}
                    </div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        {/* Info panel in corner */}
        <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(100, 200, 255, 0.3)',
              borderRadius: 8,
              padding: 12,
              color: '#64c8ff',
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Comparison Grid</div>
            <div>Layout: {layout}</div>
            <div>
              Capacity: {capacity} × 6 = {capacity * 6} total
            </div>
            <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>
              Adjust spacing/layout in sidebar →
            </div>
          </div>
        </Html>
      </CanvasProvider>
    </GlobalProvider>
  );
}

// Helper: Calculate grid positions based on layout
function calculatePositions(
  layout: '2x3' | '3x2' | '1x6',
  spacing: number,
): [number, number, number][] {
  switch (layout) {
    case '2x3':
      // 2 columns, 3 rows
      return [
        [-spacing / 2, spacing, 0], // Top left (Calm Soft)
        [spacing / 2, spacing, 0], // Top right (Calm Crystalline)
        [-spacing / 2, 0, 0], // Middle left (Balanced Soft)
        [spacing / 2, 0, 0], // Middle right (Balanced Crystalline)
        [-spacing / 2, -spacing, 0], // Bottom left (Dynamic Soft)
        [spacing / 2, -spacing, 0], // Bottom right (Dynamic Crystalline)
      ];

    case '3x2':
      // 3 columns, 2 rows
      return [
        [-spacing, spacing / 2, 0], // Top left
        [0, spacing / 2, 0], // Top center
        [spacing, spacing / 2, 0], // Top right
        [-spacing, -spacing / 2, 0], // Bottom left
        [0, -spacing / 2, 0], // Bottom center
        [spacing, -spacing / 2, 0], // Bottom right
      ];

    case '1x6':
      // Horizontal row
      return [
        [-spacing * 2.5, 0, 0],
        [-spacing * 1.5, 0, 0],
        [-spacing * 0.5, 0, 0],
        [spacing * 0.5, 0, 0],
        [spacing * 1.5, 0, 0],
        [spacing * 2.5, 0, 0],
      ];

    default:
      return [];
  }
}

export default ParticleComparisonScene;
