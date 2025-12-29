/**
 * Particle System - Base component and presets
 *
 * ## Quick Start
 *
 * For most use cases, use the presets:
 * - CalmSoft, CalmCrystalline - Meditative mood
 * - BalancedSoft, BalancedCrystalline - Default, balanced
 * - DynamicSoft, DynamicCrystalline - Energetic mood
 *
 * Each preset exposes 8 focused props (vs 35 for ParticleSwarm).
 *
 * For advanced control, use ParticleSwarm directly.
 */

// Base component (advanced users only)
export type { ParticleSwarmProps } from './ParticleSwarm';
export { ParticleSwarm } from './ParticleSwarm';
export type {
  BalancedCrystallineProps,
  BalancedSoftProps,
  CalmCrystallineProps,
  CalmSoftProps,
  DynamicCrystallineProps,
  DynamicSoftProps,
} from './presets';
// Preset components (recommended for most users)
export {
  BalancedCrystalline,
  BalancedSoft,
  CalmCrystalline,
  CalmSoft,
  DynamicCrystalline,
  DynamicSoft,
} from './presets';
