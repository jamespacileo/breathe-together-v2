/**
 * Galaxy Environment Module
 *
 * A stylized universe/galaxy scene featuring:
 * - Deep space background with nebula effects
 * - Constellation stars with connecting lines
 * - Stylized sun with corona glow
 * - Cosmic dust particles
 *
 * All components are breathing-synchronized and performant.
 *
 * Usage:
 * - GalaxyBackdrop: Render OUTSIDE RefractionPipeline (crisp background)
 * - GalaxyForeground: Render INSIDE RefractionPipeline (with DoF)
 * - GalaxyEnvironment: Combined (for simple scenes without DoF split)
 */

export { ConstellationSystem } from './ConstellationSystem';
export { CosmicDust } from './CosmicDust';
export { GalaxyBackground } from './GalaxyBackground';
export type {
  GalaxyBackdropProps,
  GalaxyEnvironmentProps,
  GalaxyForegroundProps,
} from './GalaxyEnvironment';
export { GalaxyBackdrop, GalaxyEnvironment, GalaxyForeground } from './GalaxyEnvironment';
export { Sun } from './Sun';
