/**
 * BreathingLevel - Main breathing meditation scene
 * Combines breathing sphere and user presence visualization
 *
 * Triplex Integration (Dec 2024):
 * - All component props exposed as top-level props for easy visual editing
 * - Maintains flat prop structure for Triplex sidebar compatibility
 * - Advanced component props accessible by drilling into child components
 * - Breathing animation runs in background (breathSystem enabled in .triplex/providers.tsx)
 */
import { BreathingSphere } from '../entities/breathingSphere';
import { ParticleSpawner, ParticleRenderer } from '../entities/particle';
import { Environment } from '../entities/environment';
import { Lighting } from '../entities/lighting';
import { VISUALS } from '../constants';

interface BreathingLevelProps {
	// Scene
	/**
	 * Scene background color
	 * @type color
	 */
	backgroundColor?: string;

	// BreathingSphere
	/**
	 * Sphere color
	 * @type color
	 */
	sphereColor?: string;

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

	// Lighting - Ambient
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

	// Lighting - Key
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

	// Lighting - Fill
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

	// Lighting - Rim
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

	// Environment
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

	// Particles
	/**
	 * Number of particles
	 * @min 50
	 * @max 500
	 * @step 50
	 */
	particleCount?: number;
}

export function BreathingLevel({
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
	keyPosition = [2, 3, 5],
	keyIntensity = VISUALS.KEY_LIGHT_INTENSITY_MIN,
	keyColor = VISUALS.KEY_LIGHT_COLOR,

	// Lighting - Fill defaults
	fillPosition = [-2, -1, -3],
	fillIntensity = VISUALS.FILL_LIGHT_INTENSITY,
	fillColor = VISUALS.FILL_LIGHT_COLOR,

	// Lighting - Rim defaults
	rimPosition = [0, -5, -5],
	rimIntensity = VISUALS.RIM_LIGHT_INTENSITY,
	rimColor = VISUALS.RIM_LIGHT_COLOR,

	// Environment defaults
	starsCount = 5000,
	floorColor = '#0a0a1a',

	// Particle defaults
	particleCount = VISUALS.PARTICLE_COUNT,
}: BreathingLevelProps = {}) {
	return (
		<>
			<color attach="background" args={[backgroundColor]} />

			{/* Refined layered lighting (all props editable in Triplex) */}
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

			<Environment starsCount={starsCount} floorColor={floorColor} />

			<BreathingSphere
				color={sphereColor}
				opacity={sphereOpacity}
				segments={sphereSegments}
			/>

			<ParticleSpawner totalCount={particleCount} />
			<ParticleRenderer totalCount={particleCount} />

			{/* Temporarily disabled to debug flickering issues
			<EffectComposer multisampling={4} stencilBuffer={false}>
				<Bloom
					intensity={1.0}
					luminanceThreshold={1.0}
					luminanceSmoothing={0.9}
					mipmapBlur
				/>
			</EffectComposer>
			*/}
		</>
	);
}
