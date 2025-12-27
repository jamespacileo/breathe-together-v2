/**
 * Lighting - Layered directional lights for breathing sphere scene
 * Follows Triplex editable component pattern with full props interface
 *
 * Light Setup:
 * - Ambient: Cool base light (0.3 intensity)
 * - Key: Warm cyan directional (follows breath phase)
 * - Fill: Cool blue opposite side (0.2 intensity)
 * - Rim: Pale cyan edge definition (0.15 intensity)
 */
import { VISUALS } from '../../constants';

interface LightingProps {
	/**
	 * Ambient light intensity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	ambientIntensity?: number;

	/**
	 * Ambient light color
	 * @type color
	 */
	ambientColor?: string;

	/**
	 * Key light position (x, y, z)
	 * @type vector3
	 */
	keyPosition?: [number, number, number];

	/**
	 * Key light intensity (modulates with breath phase)
	 * @min 0
	 * @max 2
	 * @step 0.1
	 */
	keyIntensity?: number;

	/**
	 * Key light color (warm cyan)
	 * @type color
	 */
	keyColor?: string;

	/**
	 * Fill light position (opposite side)
	 * @type vector3
	 */
	fillPosition?: [number, number, number];

	/**
	 * Fill light intensity (shadow softness)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	fillIntensity?: number;

	/**
	 * Fill light color (cool blue)
	 * @type color
	 */
	fillColor?: string;

	/**
	 * Rim light position (edge definition)
	 * @type vector3
	 */
	rimPosition?: [number, number, number];

	/**
	 * Rim light intensity (edge glow)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	rimIntensity?: number;

	/**
	 * Rim light color (pale cyan)
	 * @type color
	 */
	rimColor?: string;
}

/**
 * Layered lighting system for breathing meditation scene
 * All values are Triplex-editable for real-time visual refinement
 */
export function Lighting({
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
	return (
		<>
			{/* Ambient light - cool base illumination */}
			<ambientLight intensity={ambientIntensity} color={ambientColor} />

			{/* Key light - warm cyan directional, follows breath phase for warmth journey */}
			<directionalLight
				position={keyPosition}
				intensity={keyIntensity}
				color={keyColor}
			/>

			{/* Fill light - opposite side for shadow softness */}
			<directionalLight
				position={fillPosition}
				intensity={fillIntensity}
				color={fillColor}
			/>

			{/* Rim light - subtle edge definition */}
			<directionalLight
				position={rimPosition}
				intensity={rimIntensity}
				color={rimColor}
			/>
		</>
	);
}
