/**
 * Particle System - Simplified to a single performant TSL implementation.
 *
 * Slot-based user ordering (Dec 2024):
 * - Users assigned to stable slot positions in arrival order
 * - Smooth scale animations on enter/exit
 * - Reconciliation during hold phases only (once per breathing cycle)
 */

export type { AtmosphericParticlesProps } from './AtmosphericParticles';
export { AtmosphericParticles } from './AtmosphericParticles';
export type { ParticleSwarmProps } from './ParticleSwarm';
export { ParticleSwarm } from './ParticleSwarm';
export type { ReconciliationResult, Slot, User } from './SlotManager';
export { calculateCycleNumber, SlotManager, SlotState } from './SlotManager';
