/**
 * BreathingScene - Triplex visual editor scene
 * Complete scene setup with lighting, sphere, and particles
 * All props are editable in Triplex via JSDoc annotations
 *
 * This file is specifically designed to be opened in Triplex for visual editing.
 * Changes made in Triplex will write back to this file's props.
 *
 * Note: CameraRig is not included here (would conflict with Triplex's camera).
 * The production app includes CameraRig via app.tsx Canvas setup.
 */
import { BreathingSphere } from '../entities/breathingSphere';
import { ParticleSpawner, ParticleRenderer } from '../entities/particle';
import { Environment } from '../entities/environment';
import { Lighting } from '../entities/lighting';
import { VISUALS } from '../constants';

interface BreathingSceneProps {
	// ============================================================
	// SCENE BACKGROUND
	// ============================================================
	/**
	 * Scene background color
	 * @type color
	 */
	backgroundColor?: string;

	// ============================================================
	// BREATHING SPHERE
	// ============================================================
	/**
	 * Sphere material opacity
	 * @min 0
	 * @max 1
	 * @step 0.01
	 */
	sphereOpacity?: number;

	/**
	 * Sphere geometry segments (detail level)
	 * @min 16
	 * @max 128
	 * @step 16
	 */
	sphereSegments?: number;

	/**
	 * Sphere color (inhale state)
	 * @type color
	 */
	sphereColor?: string;

	// ============================================================
	// LIGHTING - AMBIENT
	// ============================================================
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

	// ============================================================
	// LIGHTING - KEY (Main directional light)
	// ============================================================
	/**
	 * Key light position (x, y, z)
	 * @type vector3
	 */
	keyPosition?: [number, number, number];

	/**
	 * Key light intensity
	 * @min 0
	 * @max 2
	 * @step 0.1
	 */
	keyIntensity?: number;

	/**
	 * Key light color
	 * @type color
	 */
	keyColor?: string;

	// ============================================================
	// LIGHTING - FILL (Shadow softness)
	// ============================================================
	/**
	 * Fill light position
	 * @type vector3
	 */
	fillPosition?: [number, number, number];

	/**
	 * Fill light intensity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	fillIntensity?: number;

	/**
	 * Fill light color
	 * @type color
	 */
	fillColor?: string;

	// ============================================================
	// LIGHTING - RIM (Edge definition)
	// ============================================================
	/**
	 * Rim light position
	 * @type vector3
	 */
	rimPosition?: [number, number, number];

	/**
	 * Rim light intensity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	rimIntensity?: number;

	/**
	 * Rim light color
	 * @type color
	 */
	rimColor?: string;

	// ============================================================
	// ENVIRONMENT
	// ============================================================
	/**
	 * Number of background stars
	 * @min 1000
	 * @max 10000
	 * @step 500
	 */
	starsCount?: number;

	/**
	 * Floor color
	 * @type color
	 */
	floorColor?: string;

	// ============================================================
	// PARTICLES
	// ============================================================
	/**
	 * Number of particles
	 * @min 50
	 * @max 500
	 * @step 50
	 */
	particleCount?: number;
}

export function BreathingScene({
	// Scene defaults
	backgroundColor = VISUALS.BG_COLOR,

	// BreathingSphere defaults
	sphereColor = VISUALS.SPHERE_COLOR_INHALE,
	sphereOpacity = VISUALS.SPHERE_OPACITY,
	sphereSegments = VISUALS.SPHERE_SEGMENTS,

	// Lighting - Ambient defaults
	ambientIntensity = VISUALS.AMBIENT_LIGHT_INTENSITY,
	ambientColor = '#a8b8d0',

	// Lighting - Key defaults
	keyPosition = [2, 3, 5] as [number, number, number],
	keyIntensity = VISUALS.KEY_LIGHT_INTENSITY_MIN,
	keyColor = VISUALS.KEY_LIGHT_COLOR,

	// Lighting - Fill defaults
	fillPosition = [-2, -1, -3] as [number, number, number],
	fillIntensity = VISUALS.FILL_LIGHT_INTENSITY,
	fillColor = VISUALS.FILL_LIGHT_COLOR,

	// Lighting - Rim defaults
	rimPosition = [0, -5, -5] as [number, number, number],
	rimIntensity = VISUALS.RIM_LIGHT_INTENSITY,
	rimColor = VISUALS.RIM_LIGHT_COLOR,

	// Environment defaults
	starsCount = 5000,
	floorColor = '#0a0a1a',

	// Particle defaults
	particleCount = VISUALS.PARTICLE_COUNT,
}: BreathingSceneProps = {}) {
	return (
		<>
			{/* Background */}
			<color attach="background" args={[backgroundColor]} />

			{/* Layered directional lighting (key, fill, rim) */}
			<Lighting
				ambientIntensity={ambientIntensity}
				ambientColor={ambientColor}
				keyPosition={keyPosition}
				keyIntensity={keyIntensity}
				keyColor={keyColor}
				fillPosition={fillPosition}
				fillIntensity={fillIntensity}
				fillColor={fillColor}
				rimPosition={rimPosition}
				rimIntensity={rimIntensity}
				rimColor={rimColor}
			/>

			{/* Environment: stars and floor */}
			<Environment starsCount={starsCount} floorColor={floorColor} />

			{/* Central breathing sphere */}
			<BreathingSphere
				color={sphereColor}
				opacity={sphereOpacity}
				segments={sphereSegments}
			/>

			{/* User presence particles */}
			<ParticleSpawner totalCount={particleCount} />
			<ParticleRenderer totalCount={particleCount} />
		</>
	);
}

export default BreathingScene;
