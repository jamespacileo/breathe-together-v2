import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../../../constants';
import { usePresence } from '../../../hooks/usePresence';
import { getMoodColorCounts } from '../../../lib/colors';
import { crystallization } from '../../breath/traits';
import { useSwarm } from '../ParticleSwarm';
import { ownerId, parentSwarm, targetColor } from '../traits';

export interface MoodColorBehaviorProps {
  /**
   * Base color for filler particles.
   * @group "Colors"
   * @type color
   */
  fillerColor?: string;

  /**
   * How much particles brighten when the breath is "crystallized" (held).
   * @group "Colors"
   * @min 0 @max 1 @step 0.05
   */
  crystallizedShift?: number;
}

/**
 * MoodColorBehavior - Updates particle colors based on user presence and moods.
 */
export function MoodColorBehavior({
  fillerColor = VISUALS.PARTICLE_FILLER_COLOR,
  crystallizedShift = 0.2,
}: MoodColorBehaviorProps) {
  const world = useWorld();
  const swarmEntity = useSwarm();
  const { moods } = usePresence();

  useEffect(() => {
    try {
      if (!world.has(swarmEntity)) return;

      const breathEntity = world.queryFirst(crystallization);
      const currentCryst = breathEntity?.get(crystallization)?.value ?? 0;

      const colorCounts = getMoodColorCounts(moods);
      const particles = world.query(targetColor, ownerId, parentSwarm).filter((p) => {
        if (!world.has(p)) return false;
        try {
          return p.get(parentSwarm)?.value === swarmEntity;
        } catch (_e) {
          return false;
        }
      });

      let particleIdx = 0;
      const baseFillerColor = new THREE.Color(fillerColor);
      const particleList = [...particles];

      // Apply mood colors to user particles
      for (const [hexColor, count] of Object.entries(colorCounts)) {
        const c = new THREE.Color(hexColor);
        // Apply crystallized shift to mood colors too
        const r = c.r + currentCryst * crystallizedShift;
        const g = c.g + currentCryst * crystallizedShift;
        const b = c.b + currentCryst * crystallizedShift;

        for (let i = 0; i < count && particleIdx < particleList.length; i++) {
          const entity = particleList[particleIdx];
          if (entity && world.has(entity)) {
            try {
              entity.set(targetColor, { r, g, b });
              entity.set(ownerId, { value: 'user' });
            } catch (_e) {
              // Ignore stale entity errors
            }
          }
          particleIdx++;
        }
      }

      // Apply filler color to remaining particles
      const fr = baseFillerColor.r + currentCryst * crystallizedShift;
      const fg = baseFillerColor.g + currentCryst * crystallizedShift;
      const fb = baseFillerColor.b + currentCryst * crystallizedShift;

      while (particleIdx < particleList.length) {
        const entity = particleList[particleIdx];
        if (entity && world.has(entity)) {
          try {
            entity.set(targetColor, { r: fr, g: fg, b: fb });
            entity.set(ownerId, { value: 'filler' });
          } catch (_e) {
            // Ignore stale entity errors
          }
        }
        particleIdx++;
      }
    } catch (_e) {
      // Ignore stale world errors
    }
  }, [moods, world, swarmEntity, fillerColor, crystallizedShift]);

  return null;
}
