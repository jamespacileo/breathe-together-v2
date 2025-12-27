/**
 * BreathingLevel - Main breathing meditation scene
 * Combines breathing sphere and user presence visualization
 */
import { BreathingSphere } from '../entities/breathingSphere';
import { ParticleSystem } from '../entities/particleSystem';
import { Environment } from '../entities/environment';
import { VISUALS } from '../constants';
import { Bloom, EffectComposer } from '@react-three/postprocessing';

export function BreathingLevel() {
	return (
		<>
			<color attach="background" args={[VISUALS.BG_COLOR]} />
			<ambientLight intensity={VISUALS.AMBIENT_LIGHT_INTENSITY} />

			<Environment />

			<BreathingSphere
				color={VISUALS.SPHERE_COLOR_INHALE}
				opacity={VISUALS.SPHERE_OPACITY}
				segments={VISUALS.SPHERE_SEGMENTS}
			/>
			<ParticleSystem
				totalCount={VISUALS.PARTICLE_COUNT}
				particleSize={VISUALS.PARTICLE_SIZE}
				fillerColor={VISUALS.PARTICLE_FILLER_COLOR}
			/>

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
