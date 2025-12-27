/**
 * BreathingLevel - Main breathing meditation scene
 * Combines breathing sphere and user presence visualization
 */
import { BreathingSphere } from '../entities/breathingSphere';
import { ParticleSystem } from '../entities/particleSystem';

export function BreathingLevel() {
	return (
		<>
			<color attach="background" args={['#050514']} />
			<ambientLight intensity={0.5} />

			<BreathingSphere color="#7ec8d4" opacity={0.15} segments={64} />
			<ParticleSystem totalCount={300} particleSize={0.05} fillerColor="#6B8A9C" />

			{/* Optional: Bloom effect can be added by installing @react-three/postprocessing
				and wrapping scene with EffectComposer:

				import { Bloom, EffectComposer } from '@react-three/postprocessing';

				<EffectComposer>
					<Bloom
						intensity={1.2}
						luminanceThreshold={0.7}
						luminanceSmoothing={0.9}
						mipmapBlur
					/>
				</EffectComposer>
			*/}
		</>
	);
}
