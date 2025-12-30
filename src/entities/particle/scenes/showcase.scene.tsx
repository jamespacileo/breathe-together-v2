import { CanvasProvider, GlobalProvider } from '../../../contexts/triplex';
import { Environment } from '../../environment';
import { ParticleSwarm } from '../ParticleSwarm';

interface ParticleShowcaseSceneProps {
  /**
   * Background color.
   *
   * @group "Rendering"
   * @type color
   * @default "#0a0f1a"
   */
  backgroundColor?: string;
}

/**
 * Showcase Scene for the refactored Particle Swarm.
 */
export function ParticleShowcaseScene({
  backgroundColor = '#0a0f1a',
}: ParticleShowcaseSceneProps = {}) {
  return (
    <GlobalProvider>
      <CanvasProvider>
        <color attach="background" args={[backgroundColor]} />
        <Environment preset="studio" atmosphere={0.5} />

        {/* The single, performant neon particle swarm */}
        <ParticleSwarm />
      </CanvasProvider>
    </GlobalProvider>
  );
}

export default ParticleShowcaseScene;
