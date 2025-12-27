/**
 * BreathingLevel - Main breathing meditation scene
 * Combines breathing sphere and user presence visualization
 */
import { BreathingSphere } from '../entities/breathingSphere';
import { ParticleSpawner, ParticleRenderer } from '../entities/particle';
import { Environment } from '../entities/environment';
import { Lighting } from '../entities/lighting';
import { VISUALS } from '../constants';
import { Bloom, EffectComposer } from '@react-three/postprocessing';

interface BreathingLevelProps {
	/**
	 * Scene background color
	 * @type color
	 */
	backgroundColor?: string;
}

export function BreathingLevel({ backgroundColor = VISUALS.BG_COLOR }: BreathingLevelProps = {}) {
	return (
		<>
			<color attach="background" args={[backgroundColor]} />

			{/* Refined layered lighting (all props editable in Triplex) */}
			<Lighting />

			<Environment />

			<BreathingSphere
				color={VISUALS.SPHERE_COLOR_INHALE}
				opacity={VISUALS.SPHERE_OPACITY}
				segments={VISUALS.SPHERE_SEGMENTS}
			/>
			
			<ParticleSpawner totalCount={VISUALS.PARTICLE_COUNT} />
			<ParticleRenderer totalCount={VISUALS.PARTICLE_COUNT} />

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
