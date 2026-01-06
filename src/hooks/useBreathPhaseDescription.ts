import { useWorld } from 'koota/react';
import { useEffect, useRef, useState } from 'react';
import {
  breathPhase as breathPhaseTrait,
  phaseType as phaseTypeTrait,
} from '../entities/breath/traits';

/**
 * Hook to get human-readable breath phase description for accessibility.
 *
 * Returns current phase label for screen readers and reduced motion detection.
 */
export function useBreathPhaseDescription() {
  const world = useWorld();
  const [phaseLabel, setPhaseLabel] = useState<string>('breathe');
  const [phaseType, setPhaseType] = useState<number>(0);
  const phaseTypeRef = useRef(phaseType);

  useEffect(() => {
    phaseTypeRef.current = phaseType;
  }, [phaseType]);

  useEffect(() => {
    const updatePhase = () => {
      try {
        // Find breath entity (there's only one)
        const breathEntities = world.query(breathPhaseTrait, phaseTypeTrait);
        if (breathEntities.length === 0) return;

        const breathEntity = breathEntities[0];
        const currentPhaseType = breathEntity.get(phaseTypeTrait)?.value ?? 0;

        // Update state if phase changed
        if (currentPhaseType !== phaseTypeRef.current) {
          phaseTypeRef.current = currentPhaseType;
          setPhaseType(currentPhaseType);

          // Map phase type to human-readable label
          const labels = ['inhale', 'hold', 'exhale', 'hold'];
          setPhaseLabel(labels[currentPhaseType] || 'breathe');
        }
      } catch (_e) {
        // Silently catch ECS errors during unmount/remount in Triplex
        // The Koota world becomes stale during hot-reload transitions
      }
    };

    // Update immediately
    updatePhase();

    // Check every 500ms (phases are several seconds long)
    const interval = setInterval(updatePhase, 500);

    return () => clearInterval(interval);
  }, [world]);

  return { phaseLabel, phaseType };
}
