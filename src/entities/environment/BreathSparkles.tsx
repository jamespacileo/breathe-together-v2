/**
 * BreathSparkles - Breath-synchronized atmospheric sparkles (dust/pollen).
 * Sparkles opacity and count scale with atmosphere and breathing phase.
 */

import { Sparkles } from '@react-three/drei';

interface BreathSparklesProps {
  /**
   * Environment mood preset (affects sparkle count)
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   */
  preset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density multiplier (0-1)
   * @min 0
   * @max 1
   * @step 0.1
   */
  atmosphere?: number;
}

const SPARKLE_CONFIGS = {
  meditation: {
    count: 50,
    color: '#e8c4a4',
  },
  cosmic: {
    count: 200,
    color: '#e8c4a4',
  },
  minimal: {
    count: 0,
    color: '#e8c4a4',
  },
  studio: {
    count: 100,
    color: '#e8c4a4',
  },
} as const;

export function BreathSparkles({ preset = 'meditation', atmosphere = 0.5 }: BreathSparklesProps) {
  const config = SPARKLE_CONFIGS[preset];

  // Don't render sparkles if count is 0
  if (config.count === 0) return null;

  return (
    <Sparkles
      count={Math.floor(config.count * atmosphere * 2)}
      scale={15}
      size={2}
      speed={0.4}
      opacity={0.2 * atmosphere}
      color={config.color}
    />
  );
}
