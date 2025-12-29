/**
 * Lighting - Layered directional lights for breathing sphere scene.
 * Exposes only the most useful tuning knobs for Triplex.
 */
import { VISUALS } from '../../constants';

interface LightingProps {
  /**
   * Ambient light intensity (non-directional base illumination).
   *
   * Provides uniform lighting across entire scene. Foundation for all shadow visibility.
   * Lower = darker shadows and more depth, higher = flatter appearance and less shadows.
   *
   * **When to adjust:** Dark backgrounds (0.3-0.4) for shadow contrast, light backgrounds (0.1-0.2) to reduce washout
   * **Typical range:** Dark Meditation (0.1) → Balanced (0.15, default) → Soft (0.3) → Washed (0.5+)
   * **Interacts with:** backgroundColor, keyIntensity, fillIntensity, bloomIntensity
   * **Performance note:** No impact; computed per-fragment
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
   * Overall color temperature of non-directional lighting. Cooler colors (blues) promote calm,
   * warmer colors (oranges) promote energy.
   *
   * **When to adjust:** Match overall scene mood; cool for meditation, warm for energy
   * **Typical range:** Cool (#4080ff) → Neutral (#a8b8d0, default) → Warm (#ff9900)
   * **Interacts with:** keyColor, backgroundColor, mood/theme
   * **Performance note:** No impact; single color
   *
   * @type color
   * @default "#a8b8d0"
   */
  ambientColor?: string;

  /**
   * Key light intensity (main directional light strength).
   *
   * Primary light source that creates the most dramatic shadows and highlights.
   * Strongest light in the scene, defines main light direction and character.
   *
   * **When to adjust:** Increase for dramatic lighting (cinematic), decrease for soft (meditative)
   * **Typical range:** Soft (0.1) → Defined (0.2, default) → Dramatic (0.5) → Harsh (1.0+)
   * **Interacts with:** ambientIntensity (together control shadow depth), keyColor, fillIntensity
   * **Performance note:** No impact; single light
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
   * Hue of the primary directional light. Sets the main color character of the scene.
   *
   * **When to adjust:** Match lighting design; warm/orange for sunrise, cool/blue for night
   * **Typical range:** Cool (#4080ff) → Neutral (#ffffff) → Warm (#e89c5c, default) → Very Warm (#ff9900)
   * **Interacts with:** ambientColor, backgroundColor, fillColor (complementary coolness)
   * **Performance note:** No impact; single color
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
  ambientIntensity = 0.15,
  ambientColor = '#a8b8d0',
  keyIntensity = 0.2,
  keyColor = '#e89c5c',
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
