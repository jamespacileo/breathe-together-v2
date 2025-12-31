/**
 * ParticleText Entity - 3D Particle Text for Inspirational Messages
 *
 * This is an alternative to the DOM-based InspirationalText component.
 * Text is formed by 3D particles within the scene, positioned safely
 * in front of the camera to avoid overlap with scene elements.
 *
 * Usage:
 *   <InspirationalParticleText />  // Connected to inspirational text store
 *   <ParticleText3D topText="..." bottomText="..." />  // Direct control
 *
 * Position:
 * - Z = 7 (between camera at Z=10 and scene at Z=0)
 * - Top text at Y = 2.5
 * - Bottom text at Y = -2.5
 * - Scene elements (globe, particles) are at Z=0, radius 0-6
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
