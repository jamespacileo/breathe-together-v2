/**
 * Lighting - Layered directional lights for breathing sphere scene
 * Follows Triplex editable component pattern with full props interface
 *
 * Light Setup:
 * - Ambient: Cool base light (0.3 intensity)
 * - Key: Warm cyan directional (follows breath phase)
 * - Fill: Cool blue opposite side (0.2 intensity)
 * - Rim: Pale cyan edge definition (0.15 intensity)
 *
 * Configuration (updated Dec 2024):
 * - Uses LightingConfig interface for organized, preset-friendly setup
 * - Maintains flat props for Triplex compatibility
 * - Supports multiple preset configurations
 */
import { DEFAULT_LIGHTING_CONFIG, type LightingConfig, VISUALS } from '../../constants';

interface LightingProps {
  /**
   * Ambient light intensity (non-directional base illumination).
   *
   * Provides uniform lighting across entire scene. Foundation for all lighting.
   * Lower = darker shadows, higher = flatter appearance.
   *
   * **When to adjust:** Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout
   * **Typical range:** Dim (0.2, deep shadows) → Standard (0.4, balanced) → Bright (0.6, reduced contrast) → Washed (0.8+, flat)
   * **Interacts with:** backgroundColor, keyIntensity (key should dominate), fillIntensity
   * **Performance note:** No impact; computed per-fragment
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.4
   */
  ambientIntensity?: number;

  /**
   * Ambient light color tint (non-directional tone).
   *
   * Tints entire scene with color cast. White = neutral, blue = cool, orange = warm.
   *
   * **When to adjust:** Cool blue (calm, meditative), warm orange (energetic), neutral white (balanced)
   * **Typical range:** Cool (#4080ff, calming) → Neutral (#ffffff, balanced) → Warm (#ff9900, energetic)
   * **Interacts with:** backgroundColor (should coordinate), keyColor (establish color temperature)
   *
   * @type color
   * @default "#a8b8d0"
   */
  ambientColor?: string;

  /**
   * Key light position (main directional light source).
   *
   * Where the primary light comes from in 3D space. [x, y, z] coordinates.
   * Typical: [2, 3, 5] places light front-right-above.
   *
   * **When to adjust:** Different time-of-day effects, spotlight specific parts, dramatic angles
   * **Typical range:** Front-right ([2, 3, 5]) → Right side ([5, 2, 0]) → Left side ([-5, 3, 2]) → Behind ([0, 3, -5])
   * **Interacts with:** keyIntensity (position should match intensity), fillPosition (should be opposite), rimPosition
   * **Performance note:** No impact; lighting computed per-fragment
   *
   * @type vector3
   * @default [2, 3, 5]
   */
  keyPosition?: [number, number, number];

  /**
   * Key light intensity (main light brightness).
   *
   * Controls brightness of primary directional light.
   * Often modulates with breath phase for dynamic effect.
   *
   * **When to adjust:** 0.8-1.2 for gentle, 1.2-1.8 for dramatic, >2.0 for blown-out highlights
   * **Typical range:** Subtle (0.8, soft) → Standard (1.2, balanced) → Dramatic (1.8, strong) → Extreme (2.0+, blown-out)
   * **Interacts with:** ambientIntensity (key should dominate), fillIntensity (create shadow contrast), backgroundColor
   *
   * @min 0
   * @max 2
   * @step 0.1
   * @default 1.2
   */
  keyIntensity?: number;

  /**
   * Key light color tint (main light tone).
   *
   * Tints the primary light source. White = neutral, blue = cool, orange = warm.
   * Establishes overall color temperature.
   *
   * **When to adjust:** Cool blue for meditative/calm, warm orange for energetic/warm, cyan for technical/cool
   * **Typical range:** Warm (#ff9900) → Neutral (#ffffff) → Cool (#4080ff) → Cyan (#00ffff)
   * **Interacts with:** fillColor (should have complementary tone), ambientColor (overall temperature)
   *
   * @type color
   * @default "#9fd9e8"
   */
  keyColor?: string;

  /**
   * Fill light position (shadow-softening light, typically opposite key).
   *
   * Secondary light opposite the key light. Reduces shadow harshness and provides modeling.
   * Typical: [-2, -1, -3] places fill on opposite side from key.
   *
   * **When to adjust:** Closer for softer shadows, farther for more dramatic fill ratio
   * **Typical range:** Far away ([-5, -3, -5], hard shadows) → Balanced ([-2, -1, -3], natural) → Close ([-1, 1, -1], soft fills)
   * **Interacts with:** fillIntensity (position affects needed intensity), keyPosition (should oppose key)
   *
   * @type vector3
   * @default [-2, -1, -3]
   */
  fillPosition?: [number, number, number];

  /**
   * Fill light intensity (shadow softness).
   *
   * How much the fill light brightens shadows. Lower = dramatic dark shadows, higher = soft fills.
   *
   * **When to adjust:** 0.1-0.2 for drama, 0.3-0.5 for softness, >0.5 for very flat appearance
   * **Typical range:** Hard (0.1, deep shadows) → Balanced (0.3, natural) → Soft (0.5, reduced contrast) → Flat (0.8+, no shadows)
   * **Interacts with:** keyIntensity (key should dominate over fill), ambientIntensity (fill + ambient = base brightness)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  fillIntensity?: number;

  /**
   * Fill light color tint (shadow tone).
   *
   * Tints the shadow-filling light. Usually complementary to key light color.
   * If key is warm, fill should be cool, and vice versa.
   *
   * **When to adjust:** Create color contrast: warm key + cool fill, or vice versa
   * **Typical range:** Warm (#ff9900) → Neutral (#ffffff) → Cool (#4080ff)
   * **Interacts with:** keyColor (should be complementary), fillIntensity (intensity affects color saturation)
   *
   * @type color
   * @default "#4a5d7e"
   */
  fillColor?: string;

  /**
   * Rim light position (edge definition/backlighting).
   *
   * Backlighting that creates edge glow and separates sphere from background.
   * Typical: [0, -5, -5] places rim behind and below.
   *
   * **When to adjust:** Vary angle for different rim position; above for top edge, below for bottom edge
   * **Typical range:** Behind ([0, -5, -5]) → High rim ([0, 5, -5], top edge) → Side rim ([5, 0, -5], side edge)
   * **Interacts with:** rimIntensity (position affects intensity needs), backgroundColor (must contrast for rim to be visible)
   *
   * @type vector3
   * @default [0, -5, -5]
   */
  rimPosition?: [number, number, number];

  /**
   * Rim light intensity (edge/backlight strength).
   *
   * How bright the rim/backlighting is. Creates separation from background.
   *
   * **When to adjust:** 0.1-0.3 for subtle edge, 0.5-0.8 for strong glow effect
   * **Typical range:** Subtle (0.2, soft edge) → Balanced (0.5, clear separation) → Strong (0.8, dramatic glow) → Extreme (1.0+, blown-out rim)
   * **Interacts with:** rimColor (intensity affects color saturation), backgroundColor (contrast determines visibility)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.5
   */
  rimIntensity?: number;

  /**
   * Rim light color tint (edge glow tone).
   *
   * Tints the rim/backlighting. Usually pale cyan or complementary to key light.
   *
   * **When to adjust:** Pale cyan for cool/calm aesthetic, pale orange for warm/energetic, white for neutral
   * **Typical range:** Cool (#4080ff) → Neutral (#ffffff) → Warm (#ff9900) → Cyan (#d4e8f0, pale cyan)
   * **Interacts with:** rimPosition (position affects which colors are visible), rimIntensity (intensity affects saturation)
   *
   * @type color
   * @default "#d4e8f0"
   */
  rimColor?: string;

  /**
   * Enable ambient light (non-directional base illumination).
   *
   * **When to adjust:** Disable for dramatic high-contrast lighting, enable for balanced scene
   * **Interacts with:** ambientIntensity, ambientColor (only apply when enabled)
   *
   * @default true
   */
  enableAmbient?: boolean;

  /**
   * Enable key light (main directional light source).
   *
   * **When to adjust:** Disable to test ambient-only mood, enable for standard 3-point lighting
   * **Interacts with:** keyPosition, keyIntensity, keyColor (only apply when enabled)
   *
   * @default true
   */
  enableKey?: boolean;

  /**
   * Enable fill light (shadow-softening opposite light).
   *
   * **When to adjust:** Disable for dramatic shadows, enable for soft natural lighting
   * **Interacts with:** fillPosition, fillIntensity, fillColor (only apply when enabled)
   *
   * @default true
   */
  enableFill?: boolean;

  /**
   * Enable rim light (edge definition/backlighting).
   *
   * **When to adjust:** Disable for minimal setup, enable for edge glow separation
   * **Interacts with:** rimPosition, rimIntensity, rimColor (only apply when enabled)
   *
   * @default true
   */
  enableRim?: boolean;
}

/**
 * Helper function to convert flat props to grouped config object
 * Maintains Triplex compatibility (props interface stays flat) while
 * organizing values internally for better code readability
 */
function propsToLightingConfig(props: LightingProps): LightingConfig {
  return {
    ambient: {
      intensity: props.ambientIntensity ?? DEFAULT_LIGHTING_CONFIG.ambient.intensity,
      color: props.ambientColor ?? DEFAULT_LIGHTING_CONFIG.ambient.color,
    },
    key: {
      position: props.keyPosition ?? DEFAULT_LIGHTING_CONFIG.key.position,
      intensity: props.keyIntensity ?? DEFAULT_LIGHTING_CONFIG.key.intensity,
      color: props.keyColor ?? DEFAULT_LIGHTING_CONFIG.key.color,
    },
    fill: {
      position: props.fillPosition ?? DEFAULT_LIGHTING_CONFIG.fill.position,
      intensity: props.fillIntensity ?? DEFAULT_LIGHTING_CONFIG.fill.intensity,
      color: props.fillColor ?? DEFAULT_LIGHTING_CONFIG.fill.color,
    },
    rim: {
      position: props.rimPosition ?? DEFAULT_LIGHTING_CONFIG.rim.position,
      intensity: props.rimIntensity ?? DEFAULT_LIGHTING_CONFIG.rim.intensity,
      color: props.rimColor ?? DEFAULT_LIGHTING_CONFIG.rim.color,
    },
  };
}

/**
 * Layered lighting system for breathing meditation scene
 * All values are Triplex-editable for real-time visual refinement
 */
export function Lighting({
  // Toggle controls
  enableAmbient = true,
  enableKey = true,
  enableFill = true,
  enableRim = true,

  // Existing props
  ambientIntensity = VISUALS.AMBIENT_LIGHT_INTENSITY,
  ambientColor = '#a8b8d0',
  keyPosition = [2, 3, 5],
  keyIntensity = VISUALS.KEY_LIGHT_INTENSITY_MIN,
  keyColor = VISUALS.KEY_LIGHT_COLOR,
  fillPosition = [-2, -1, -3],
  fillIntensity = VISUALS.FILL_LIGHT_INTENSITY,
  fillColor = VISUALS.FILL_LIGHT_COLOR,
  rimPosition = [0, -5, -5],
  rimIntensity = VISUALS.RIM_LIGHT_INTENSITY,
  rimColor = VISUALS.RIM_LIGHT_COLOR,
}: LightingProps) {
  // Create config object from flat props (for internal organization)
  const config = propsToLightingConfig({
    ambientIntensity,
    ambientColor,
    keyPosition,
    keyIntensity,
    keyColor,
    fillPosition,
    fillIntensity,
    fillColor,
    rimPosition,
    rimIntensity,
    rimColor,
  });

  return (
    <>
      {/* Ambient light - cool base illumination */}
      {enableAmbient && (
        <ambientLight intensity={config.ambient.intensity} color={config.ambient.color} />
      )}

      {/* Key light - warm cyan directional, follows breath phase for warmth journey */}
      {enableKey && (
        <directionalLight
          position={config.key.position}
          intensity={config.key.intensity}
          color={config.key.color}
        />
      )}

      {/* Fill light - opposite side for shadow softness */}
      {enableFill && (
        <directionalLight
          position={config.fill.position}
          intensity={config.fill.intensity}
          color={config.fill.color}
        />
      )}

      {/* Rim light - subtle edge definition */}
      {enableRim && (
        <directionalLight
          position={config.rim.position}
          intensity={config.rim.intensity}
          color={config.rim.color}
        />
      )}
    </>
  );
}
