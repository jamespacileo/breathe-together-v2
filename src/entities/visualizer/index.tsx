/**
 * Visualizer Effects - Music visualizer-inspired breathing effects
 *
 * These components add dynamic, audio-reactive-style visual feedback
 * to the breathing experience. Instead of reacting to sound frequencies,
 * they respond to the breath cycle phases.
 *
 * Inspired by:
 * - Circular frequency spectrum visualizers
 * - Beat-drop particle effects
 * - Audio waveform displays
 * - Chromatic color organ visualizers
 *
 * All effects use the ECS breath traits (breathPhase, phaseType) and
 * follow the Monument Valley color palette for visual cohesion.
 */

export { BreathAmbientGlow } from './BreathAmbientGlow';
export { BreathPulseRings } from './BreathPulseRings';
export { BreathWaveform } from './BreathWaveform';
export { PhaseTransitionBurst } from './PhaseTransitionBurst';
