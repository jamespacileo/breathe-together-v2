/**
 * Particle System - Simplified to a single performant TSL implementation.
 *
 * Motion trails added January 2026 for enhanced sense of motion during breathing.
 */

export type { AtmosphericParticlesProps } from './AtmosphericParticles';
export { AtmosphericParticles } from './AtmosphericParticles';
// Materials
export { createFrostedGlassMaterial } from './FrostedGlassMaterial';
export { createMotionTrailMaterial } from './MotionTrailMaterial';
export type { ParticleSwarmProps } from './ParticleSwarm';
export { ParticleSwarm } from './ParticleSwarm';
export type { ShardMotionTrailsProps } from './ShardMotionTrails';
export { ShardMotionTrails } from './ShardMotionTrails';

// Slot-based user ordering system
export type { AnimationConfig, ReconciliationResult, Slot, SlotState, User } from './SlotManager';
export { getBreathingCycleIndex, isHoldPhase, moodCountsToUsers, SlotManager } from './SlotManager';
