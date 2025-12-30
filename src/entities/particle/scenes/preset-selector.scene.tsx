import { Html } from '@react-three/drei';
import { CanvasProvider, GlobalProvider } from '../../../contexts/triplex';
import { Environment } from '../../environment';
import { Balanced, Calm, Dynamic } from '../presets';

type PresetId = 'calm' | 'balanced' | 'dynamic';

const PRESET_MAP: Record<PresetId, React.ComponentType<any>> = {
  calm: Calm,
  balanced: Balanced,
  dynamic: Dynamic,
} as const;

const PRESET_METADATA: Record<PresetId, { name: string; motion: string; visual: string }> = {
  calm: { name: 'Calm', motion: 'Meditative (0.5×)', visual: 'Glass Icosahedrons' },
  balanced: {
    name: 'Balanced',
    motion: 'Standard (1.0×)',
    visual: 'Glass Icosahedrons',
  },
  dynamic: {
    name: 'Dynamic',
    motion: 'Energetic (1.5×)',
    visual: 'Glass Icosahedrons',
  },
} as const;

interface PresetSelectorSceneProps {
  /**
   * Particle preset to display.
   *
   * @group "Preset Selection"
   * @enum ["calm", "balanced", "dynamic"]
   * @default "balanced"
   */
  preset?: PresetId;

  /**
   * Particle capacity.
   *
   * @group "Configuration"
   * @min 100 @max 600 @step 50
   * @default 300
   */
  capacity?: number;

  /**
   * Enable scene lighting (required for crystalline presets).
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

  /**
   * Show preset metadata panel.
   *
   * @group "Debug"
   * @default true
   */
  showMetadata?: boolean;
}

/**
 * Preset Selector Scene - Interactive particle preset comparison.
 *
 * Single-instance scene with dropdown selector for easy preset testing in Triplex.
 * Centered camera on particles at origin for focused editing.
 *
 * @category Particle Scenes
 */
export function PresetSelectorScene({
  preset = 'balanced',
  capacity = 300,
  showLighting = true,
  backgroundColor = '#0a0f1a',
  showMetadata = true,
}: Partial<PresetSelectorSceneProps> = {}) {
  const PresetComponent = PRESET_MAP[preset];
  const metadata = PRESET_METADATA[preset];

  return (
    <GlobalProvider>
      <CanvasProvider>
        <color attach="background" args={[backgroundColor]} />

        {showLighting && <Environment preset="studio" atmosphere={0.5} />}

        {/* Single centered instance at origin */}
        <PresetComponent capacity={capacity} />

        {/* Metadata panel */}
        {showMetadata && (
          <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                position: 'fixed',
                top: 20,
                left: 20,
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(100, 200, 255, 0.5)',
                borderRadius: 8,
                padding: 16,
                color: '#64c8ff',
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{metadata.name}</div>
              <div>Motion: {metadata.motion}</div>
              <div>Visual: {metadata.visual}</div>
              <div>Particles: {capacity}</div>
            </div>
          </Html>
        )}
      </CanvasProvider>
    </GlobalProvider>
  );
}

export default PresetSelectorScene;
