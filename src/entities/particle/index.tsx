/**
 * Particle System - Simplified to a single performant TSL implementation.
 */

export type { AtmosphericParticlesProps } from './AtmosphericParticles';
export { AtmosphericParticles } from './AtmosphericParticles';
export type { ParticleSwarmProps } from './ParticleSwarm';
export { ParticleSwarm } from './ParticleSwarm';
export type { ShardTrailsProps } from './ShardTrails';
export { ShardTrails } from './ShardTrails';

// Slot-based user ordering system
export type { AnimationConfig, ReconciliationResult, Slot, SlotState, User } from './SlotManager';
export { getBreathingCycleIndex, isHoldPhase, moodCountsToUsers, SlotManager } from './SlotManager';
