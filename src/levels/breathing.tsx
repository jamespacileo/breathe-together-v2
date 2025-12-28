/**
 * BreathingLevel - Main breathing meditation scene
 * Combines breathing sphere and user presence visualization
 *
 * Triplex Integration (Dec 2024):
 * - All component props exposed as top-level props for easy visual editing
 * - Maintains flat prop structure for Triplex sidebar compatibility
 * - Advanced component props accessible by drilling into child components
 * - Breathing animation runs in background (breathSystem enabled in .triplex/providers.tsx)
 *
 * Uses centralized defaults from src/config/sceneDefaults.ts for single source of truth.
 */
import { BreathingSphere } from '../entities/breathingSphere';
import { ParticleSpawner, ParticleRenderer } from '../entities/particle';
import { Environment } from '../entities/environment';
import { Lighting } from '../entities/lighting';
import type { BreathingLevelProps } from '../types/sceneProps';
import { getDefaultValues, VISUAL_DEFAULTS, LIGHTING_DEFAULTS } from '../config/sceneDefaults';

// Merge all visual and lighting defaults for convenient spreading
const DEFAULT_PROPS = {
	...getDefaultValues(VISUAL_DEFAULTS),
	...getDefaultValues(LIGHTING_DEFAULTS),
} as const;

export function BreathingLevel({
	// Visual defaults
	backgroundColor = DEFAULT_PROPS.backgroundColor,
	sphereColor = DEFAULT_PROPS.sphereColor,
	sphereOpacity = DEFAULT_PROPS.sphereOpacity,
	sphereSegments = DEFAULT_PROPS.sphereSegments,

	// Lighting - Ambient defaults
	ambientIntensity = DEFAULT_PROPS.ambientIntensity,
	ambientColor = DEFAULT_PROPS.ambientColor,

	// Lighting - Key defaults
	keyPosition = DEFAULT_PROPS.keyPosition,
	keyIntensity = DEFAULT_PROPS.keyIntensity,
	keyColor = DEFAULT_PROPS.keyColor,

	// Lighting - Fill defaults
	fillPosition = DEFAULT_PROPS.fillPosition,
	fillIntensity = DEFAULT_PROPS.fillIntensity,
	fillColor = DEFAULT_PROPS.fillColor,

	// Lighting - Rim defaults
	rimPosition = DEFAULT_PROPS.rimPosition,
	rimIntensity = DEFAULT_PROPS.rimIntensity,
	rimColor = DEFAULT_PROPS.rimColor,

	// Environment defaults
	starsCount = DEFAULT_PROPS.starsCount,
	floorColor = DEFAULT_PROPS.floorColor,

	// Particle defaults
	particleCount = DEFAULT_PROPS.particleCount,
}: Partial<BreathingLevelProps> = {}) {
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
