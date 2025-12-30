/**
 * Particle System Presets
 *
 * Simplified wrapper components for common particle configurations.
 * Each preset combines visual style and motion personality with minimal props (6-7 props).
 *
 * ## Preset Selection Guide
 *
 * **Visual Styles:**
 * - **Soft** - Smooth glow, additive blending, unlit (no lighting required)
 * - **Crystalline** - Frosted ice crystal, PBR material, requires lighting for glow
 *
 * **Motion Personalities:**
 * - **Calm** - Low motion (0.5×), loose spring (0.8×) → meditative breathing
 * - **Balanced** - Standard motion (1.0×), balanced spring (1.0×) → default
 * - **Dynamic** - High motion (1.5×), tight spring (1.2×) → energetic celebration
 *
 * ## Examples
 *
 * ```typescript
 * // Default balanced preset (production)
 * <BalancedCrystalline capacity={300} users={moods} />
 *
 * // Calm meditation with custom intensity
 * <CalmSoft capacity={200} motionIntensity={0.8} />
 *
 * // Energetic celebration
 * <DynamicCrystalline capacity={600} spreadTightness={1.2} />
 *
 * // Customize particle sizes
 * <BalancedSoft
 *   capacity={300}
 *   users={moods}
 *   minScale={0.04}
 *   maxScale={0.12}
 *   fillerColor="#8B6BA8"
 * />
 * ```
 *
 * ## Direct ParticleSwarm Usage (Advanced)
 *
 * For edge cases, use ParticleSwarm directly with 8 essential props:
 *
 * ```typescript
 * import { ParticleSwarm } from '../ParticleSwarm';
 *
 * <ParticleSwarm
 *   capacity={300}
 *   particleStyle="crystalline"
 *   motionIntensity={1.5}
 *   spreadTightness={0.8}
 * />
 * ```
 *
 * Material properties (opacity, emissive, transmission, etc.) are now controlled
 * by the `particleStyle` preset only and cannot be individually overridden.
 */

export type { BalancedProps } from './Balanced';
export { Balanced } from './Balanced';
export type { CalmProps } from './Calm';
export { Calm } from './Calm';
export type { DynamicProps } from './Dynamic';
export { Dynamic } from './Dynamic';
