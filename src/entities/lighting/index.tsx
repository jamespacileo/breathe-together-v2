/**
 * Lighting - Layered directional lights for breathing sphere scene.
 * Exposes only the most useful tuning knobs for Triplex.
 */

interface LightingProps {
  /**
   * Lighting mood preset
   *
   * - **warm**: Golden hour feel, sunrise/sunset mood
   * - **cool**: Blue-tinted, calm meditation feel
   * - **neutral**: Balanced studio lighting
   * - **dramatic**: High contrast, cinematic
   *
   * @group "Configuration"
   * @enum ["warm", "cool", "neutral", "dramatic"]
   */
  preset?: 'warm' | 'cool' | 'neutral' | 'dramatic';

  /**
   * Global intensity multiplier
   * @group "Configuration"
   * @min 0
   * @max 2
   * @step 0.1
   */
  intensity?: number;
}

const LIGHTING_PRESETS = {
  warm: {
    ambient: { intensity: 0.15, color: '#a8b8d0' },
    key: { intensity: 0.2, color: '#e89c5c' },
    fill: { intensity: 0.12, color: '#4A7B8A' },
    rim: { intensity: 0.08, color: '#6BA8B5' },
  },
  cool: {
    ambient: { intensity: 0.1, color: '#4080ff' },
    key: { intensity: 0.15, color: '#ffffff' },
    fill: { intensity: 0.1, color: '#4A7B8A' },
    rim: { intensity: 0.1, color: '#6BA8B5' },
  },
  neutral: {
    ambient: { intensity: 0.15, color: '#ffffff' },
    key: { intensity: 0.2, color: '#ffffff' },
    fill: { intensity: 0.12, color: '#888888' },
    rim: { intensity: 0.08, color: '#ffffff' },
  },
  dramatic: {
    ambient: { intensity: 0.05, color: '#a8b8d0' },
    key: { intensity: 0.5, color: '#e89c5c' },
    fill: { intensity: 0.05, color: '#4A7B8A' },
    rim: { intensity: 0.15, color: '#6BA8B5' },
  },
} as const;

const KEY_POSITION: [number, number, number] = [2, 3, 5];
const FILL_POSITION: [number, number, number] = [-2, -1, -3];
const RIM_POSITION: [number, number, number] = [0, -5, -5];

export function Lighting({ preset = 'warm', intensity = 1.0 }: LightingProps = {}) {
  const config = LIGHTING_PRESETS[preset];

  return (
    <>
      <ambientLight intensity={config.ambient.intensity * intensity} color={config.ambient.color} />

      <directionalLight
        position={KEY_POSITION}
        intensity={config.key.intensity * intensity}
        color={config.key.color}
      />

      <directionalLight
        position={FILL_POSITION}
        intensity={config.fill.intensity * intensity}
        color={config.fill.color}
      />

      <directionalLight
        position={RIM_POSITION}
        intensity={config.rim.intensity * intensity}
        color={config.rim.color}
      />
    </>
  );
}
