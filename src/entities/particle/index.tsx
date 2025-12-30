/**
 * Particle System - Base component and presets
 *
 * ## Quick Start
 *
 * For most use cases, use the presets:
 * - Calm - Meditative mood with gentle motion (0.5× wind, 0.8× spring)
 * - Balanced - Default, standard motion (1.0× wind, 1.0× spring)
 * - Dynamic - Energetic mood with active motion (1.5× wind, 1.2× spring)
 *
 * All presets use glass icosahedrons with vibrant neon edges.
 * Each preset exposes 7 focused props (vs 35+ for ParticleSwarm).
 *
 * For advanced control, use ParticleSwarm directly.
 */

// Base component (advanced users only)
export type { ParticleSwarmProps } from './ParticleSwarm';
export { ParticleSwarm } from './ParticleSwarm';
export type {
  BalancedProps,
  CalmProps,
  DynamicProps,
} from './presets';
// Preset components (recommended for most users)
export {
  Balanced,
  Calm,
  Dynamic,
} from './presets';
