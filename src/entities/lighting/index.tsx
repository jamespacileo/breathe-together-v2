/**
 * Lighting - Layered directional lights for breathing sphere scene.
 * Exposes only the most useful tuning knobs for Triplex.
 */
import { VISUALS } from '../../constants';

interface LightingProps {
  /**
   * Ambient light intensity (non-directional base illumination).
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.15
   */
  ambientIntensity?: number;

  /**
   * Ambient light color tint.
   *
   * @type color
   * @default "#a8b8d0"
   */
  ambientColor?: string;

  /**
   * Key light intensity (main directional light strength).
   *
   * @min 0
   * @max 2
   * @step 0.1
   * @default 0.2
   */
  keyIntensity?: number;

  /**
   * Key light color tint.
   *
   * @type color
   * @default "#e89c5c"
   */
  keyColor?: string;
}

const KEY_POSITION: [number, number, number] = [2, 3, 5];
const FILL_POSITION: [number, number, number] = [-2, -1, -3];
const RIM_POSITION: [number, number, number] = [0, -5, -5];

export function Lighting({
  ambientIntensity = VISUALS.AMBIENT_LIGHT_INTENSITY,
  ambientColor = '#a8b8d0',
  keyIntensity = VISUALS.KEY_LIGHT_INTENSITY_MIN,
  keyColor = VISUALS.KEY_LIGHT_COLOR,
}: LightingProps) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      <directionalLight position={KEY_POSITION} intensity={keyIntensity} color={keyColor} />

      <directionalLight
        position={FILL_POSITION}
        intensity={VISUALS.FILL_LIGHT_INTENSITY}
        color={VISUALS.FILL_LIGHT_COLOR}
      />

      <directionalLight
        position={RIM_POSITION}
        intensity={VISUALS.RIM_LIGHT_INTENSITY}
        color={VISUALS.RIM_LIGHT_COLOR}
      />
    </>
  );
}
