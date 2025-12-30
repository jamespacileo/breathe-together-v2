import { Html } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { GaiaUI } from '../components/GaiaUI';
import { PostProcessing } from '../components/PostProcessing';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RotatableScene } from '../entities/rotatableScene';
import { usePresence } from '../hooks/usePresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * BreathingLevel - Core meditation environment.
 */
export function BreathingLevel({
  bloom = 'none',
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
  // UI State for tuning the aesthetic
  const [harmony, setHarmony] = useState(
    particleDensity === 'sparse' ? 150 : particleDensity === 'dense' ? 600 : 300,
  );
  const [refraction, setRefraction] = useState(1.4);
  const [breath, setBreath] = useState(0.3);
  const [expansion, setExpansion] = useState(2.0);

  const { moods } = usePresence();

  return (
    <Suspense fallback={null}>
      {/* Environment stays OUTSIDE rotatable group (fixed background) */}
      <Environment enabled={showEnvironment} />

      {/* Wrap rotatable entities in RotatableScene */}
      <RotatableScene enableRotation={true}>
        {showGlobe && <EarthGlobe rotationSpeed={0.1} />}

        {showParticles && <ParticleSwarm capacity={harmony} users={moods} />}

        {showParticles && (
          <AtmosphericParticles count={100} size={0.08} baseOpacity={0.1} breathingOpacity={0.15} />
        )}
      </RotatableScene>

      {/* UI stays OUTSIDE rotatable group (fixed HUD) */}
      <Html fullscreen>
        <GaiaUI
          harmony={harmony}
          setHarmony={setHarmony}
          refraction={refraction}
          setRefraction={setRefraction}
          breath={breath}
          setBreath={setBreath}
          expansion={expansion}
          setExpansion={setExpansion}
        />
      </Html>

      <PostProcessing bloom={bloom} />
    </Suspense>
  );
}

export default BreathingLevel;
