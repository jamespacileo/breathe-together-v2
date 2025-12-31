/**
 * ParticleText Entity - 3D Particle Text for Inspirational Messages
 *
 * This is an alternative to the DOM-based InspirationalText component.
 * Text is formed by 3D particles within the scene, positioned to artistically
 * overlap with scene elements - the gradual fade-in creates an emerging effect.
 *
 * Usage:
 *   <InspirationalParticleText />  // Connected to inspirational text store
 *   <ParticleText3D topText="..." bottomText="..." />  // Direct control
 *
 * Position:
 * - Z = 3 (overlaps with scene elements at Z=0)
 * - Top text at Y = 1.6
 * - Bottom text at Y = -1.6
 * - Text emerges through globe and particle swarm
 *
 * Animation:
 * - Synchronized with breathing phases via ECS traits
 * - Particles scatter slightly during fade transitions
 * - Ambient floating motion for organic feel
 */

export { InspirationalParticleText } from './InspirationalParticleText';
export { ParticleText3D, type ParticleText3DProps } from './ParticleText3D';
export {
  getTextAspectRatio,
  sampleTextToParticles,
  type TextParticlePoint,
  type TextSamplerOptions,
} from './textSampler';
