/**
 * BreathSparkles - Subtle sparkle effect during exhale phase
 *
 * Visual feedback for "releasing breath" moment.
 * Sparkles fade in during exhale and fade out during other phases.
 *
 * Features:
 * - Only visible during exhale phase (phaseType === 2)
 * - Opacity modulated by breath phase for smooth fade in/out
 * - Subtle teal color matching Monument Valley palette
 * - Low particle count for performance
 */

import { Sparkles } from '@react-three/drei';
import { useWorld } from 'koota/react';
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import { breathPhase as breathPhaseTrait, phaseType as phaseTypeTrait } from '../breath/traits';

interface BreathSparklesProps {
  /** Number of sparkle particles @default 20 */
  count?: number;
  /** Sparkle color @default '#4dd9e8' */
  color?: string;
  /** Size multiplier @default 1 */
  size?: number;
  /** Space sparkles occupy [x, y, z] @default [10, 10, 10] */
  scale?: [number, number, number];
  /** Maximum opacity during peak exhale @default 0.3 */
  maxOpacity?: number;
  /** Animation speed @default 0.3 */
  speed?: number;
  /** Movement randomness @default 1 */
  noise?: number;
}

/**
 * BreathSparkles component - sparkles synchronized with exhale phase
 *
 * Uses drei's Sparkles component with breath-modulated opacity.
 */
export function BreathSparkles({
  count = 20,
  color = '#4dd9e8',
  size = 1,
  scale = [10, 10, 10],
  maxOpacity = 0.3,
  speed = 0.3,
  noise = 1,
}: BreathSparklesProps) {
  const world = useWorld();
  const [opacity, setOpacity] = useState(0);

  // Update opacity based on breath phase
  useFrame(() => {
    try {
      // Find breath entity
      const breathEntities = world.query(breathPhaseTrait, phaseTypeTrait);
      if (breathEntities.length === 0) {
        return;
      }

      const breathEntity = breathEntities[0];
      const currentPhaseType = breathEntity.get(phaseTypeTrait)?.value ?? 0;
      const currentBreathPhase = breathEntity.get(breathPhaseTrait)?.value ?? 0;

      // Only show during exhale phase (phaseType === 2)
      // Fade in at start of exhale, fade out at end
      if (currentPhaseType === 2) {
        // Exhale: breathPhase goes from 1 → 0
        // We want sparkles to fade in then out
        // At start of exhale (breathPhase ~1), low opacity
        // At mid exhale (breathPhase ~0.5), peak opacity
        // At end of exhale (breathPhase ~0), low opacity
        const exhaleProgress = 1 - currentBreathPhase; // 0 → 1 during exhale
        const fadeInOut = Math.sin(exhaleProgress * Math.PI); // Smooth bell curve
        setOpacity(fadeInOut * maxOpacity);
      } else {
        // Not exhaling - fade out
        setOpacity((prev) => Math.max(0, prev * 0.9)); // Smooth fade out
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount in Triplex
      // The Koota world becomes stale during hot-reload transitions
    }
  });

  // Don't render if opacity is effectively zero
  if (opacity < 0.01) {
    return null;
  }

  return (
    <Sparkles
      count={count}
      size={size}
      scale={scale}
      speed={speed}
      opacity={opacity}
      color={color}
      noise={noise}
    />
  );
}

export default BreathSparkles;
