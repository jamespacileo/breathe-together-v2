/**
 * AtmosphericParticles - Ambient cloud-like particles orbiting the globe (TSL Implementation)
 *
 * Features:
 * - Soft cloudlets distributed in orbital bands
 * - Breathing-synchronized opacity
 * - Warm gray color (#8c7b6c) for Monument Valley aesthetic
 * - Uses WebGPU-compatible TSL via AtmosphericParticlesTSL
 *
 * @see AtmosphericParticlesTSL.tsx for implementation details
 */

import { memo } from 'react';
import type { AtmosphericParticlesProps } from './AtmosphericParticlesTSL';
import { AtmosphericParticlesTSL } from './AtmosphericParticlesTSL';

// Export types from the implementation
export * from './AtmosphericParticlesTSL';

/**
 * AtmosphericParticles - Main component
 * Uses TSL implementation exclusively.
 */
export const AtmosphericParticles = memo(function AtmosphericParticles(
  props: AtmosphericParticlesProps,
) {
  return <AtmosphericParticlesTSL {...props} />;
});

export default AtmosphericParticles;
