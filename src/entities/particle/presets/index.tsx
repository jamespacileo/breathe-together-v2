/**
 * Particle System Presets
 *
 * Simplified wrapper components for common particle configurations.
 * Each preset combines visual style, motion personality, and physics tuning
 * into an easy-to-use component with minimal props.
 *
 * ## Preset Selection Guide
 *
 * **Visual Styles:**
 * - **Soft** - Smooth glow, additive blending, unlit (no lighting required)
 * - **Crystalline** - Faceted geometry, PBR material, requires lighting
 *
 * **Motion Personalities:**
 * - **Calm** - Low wind, loose spring, subtle vibration → meditative
 * - **Balanced** - Medium wind, balanced spring, standard vibration → default
 * - **Dynamic** - High wind, tight spring, intense vibration → energetic
 *
 * ## Examples
 *
 * ```typescript
 * // Default meditation
 * <BalancedSoft capacity={300} users={moods} />
 *
 * // Calm focus meditation with geometric shapes
 * <CalmCrystalline capacity={200} users={moods} motionIntensity={0.8} />
 *
 * // High-energy celebration
 * <DynamicCrystalline capacity={600} users={moods} />
 *
 * // Advanced override
 * <CalmSoft
 *   capacity={300}
 *   users={moods}
 *   motionIntensity={1.5}
 *   spreadTightness={0.6}
 *   enableBuoyancy={false}
 * />
 * ```
 *
 * ## Migration from ParticleSwarm
 *
 * If you need full control over all 35 props, use ParticleSwarm directly:
 *
 * ```typescript
 * import { ParticleSwarm } from '../ParticleSwarm';
 *
 * <ParticleSwarm capacity={300} users={moods} particleStyle="organic" />
 * ```
 */

export type { BalancedCrystallineProps } from './BalancedCrystalline';
export { BalancedCrystalline } from './BalancedCrystalline';
export type { BalancedSoftProps } from './BalancedSoft';
export { BalancedSoft } from './BalancedSoft';
export type { CalmCrystallineProps } from './CalmCrystalline';
export { CalmCrystalline } from './CalmCrystalline';
export type { CalmSoftProps } from './CalmSoft';
export { CalmSoft } from './CalmSoft';
export type { DynamicCrystallineProps } from './DynamicCrystalline';
export { DynamicCrystalline } from './DynamicCrystalline';
export type { DynamicSoftProps } from './DynamicSoft';
export { DynamicSoft } from './DynamicSoft';
