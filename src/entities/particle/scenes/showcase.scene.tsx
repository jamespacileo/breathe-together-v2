import { CanvasProvider, GlobalProvider } from '../../../contexts/triplex';
import { Environment } from '../../environment';
import { ParticleSwarm } from '../ParticleSwarm';

/**
 * Showcase Scene for the refactored Particle Swarm.
 */
export function ParticleShowcaseScene() {
  return (
    <GlobalProvider>
      <CanvasProvider>
        {/* Environment provides gradient background and lighting */}
        <Environment />

        {/* The single, performant neon particle swarm */}
        <ParticleSwarm />
      </CanvasProvider>
    </GlobalProvider>
  );
}

export default ParticleShowcaseScene;
