/**
 * HolographicBreathUI - In-scene 3D breathing cycle visualization
 *
 * Replaces HTML-based breathing UI with holographic 3D elements integrated
 * into the scene around the globe. Provides visual breathing feedback through:
 *
 * 1. PhaseRings - 3 concentric rings at equator (inner=inhale, middle=hold, outer=exhale)
 * 2. PhaseGlyphs - Floating 4·7·8 numbers positioned around the globe
 * 3. BreathWaves - Horizontal wave bands that ripple with breathing rhythm
 *
 * All elements synchronize to the global UTC-based breathing cycle via ECS traits.
 *
 * Visual Style: Monument Valley holographic aesthetic with Fresnel glow effects.
 */

import { BreathWaves } from './BreathWaves';
import { PhaseGlyphs } from './PhaseGlyphs';
import { PhaseRings } from './PhaseRings';

/**
 * HolographicBreathUI component props
 */
export interface HolographicBreathUIProps {
  /**
   * Show phase rings (concentric circles at equator)
   * @default true
   */
  showRings?: boolean;

  /**
   * Show phase glyphs (floating 4·7·8 numbers)
   * @default true
   */
  showGlyphs?: boolean;

  /**
   * Show breath waves (horizontal ripple bands)
   * @default true
   */
  showWaves?: boolean;

  /**
   * Globe radius for positioning calculations
   * @default 1.5
   */
  globeRadius?: number;

  /**
   * Scale multiplier for all UI elements
   * @default 1.0
   */
  scale?: number;

  /**
   * Debug: Force a specific phase (0=inhale, 1=hold, 2=exhale)
   * Set to -1 for normal ECS-driven behavior
   * @default -1
   */
  debugPhase?: number;

  /**
   * Debug: Force a specific progress value (0-1)
   * Set to -1 for normal ECS-driven behavior
   * @default -1
   */
  debugProgress?: number;

  /**
   * Debug: Force a specific breath phase value (0-1)
   * Set to -1 for normal ECS-driven behavior
   * @default -1
   */
  debugBreathPhase?: number;
}

/**
 * HolographicBreathUI - Main component combining all holographic breathing UI elements
 *
 * Renders around the central globe, providing visual feedback for the breathing cycle.
 * All elements are synchronized to the global breathing state via ECS traits.
 *
 * @example
 * ```tsx
 * // Default usage - all elements visible
 * <HolographicBreathUI />
 *
 * // Minimal - only rings
 * <HolographicBreathUI showGlyphs={false} showWaves={false} />
 *
 * // Debug - force inhale phase at 50% progress
 * <HolographicBreathUI debugPhase={0} debugProgress={0.5} />
 * ```
 */
export function HolographicBreathUI({
  showRings = true,
  showGlyphs = true,
  showWaves = true,
  globeRadius = 1.5,
  scale = 1.0,
  debugPhase = -1,
  debugProgress = -1,
  debugBreathPhase = -1,
}: HolographicBreathUIProps = {}) {
  return (
    <group name="HolographicBreathUI" scale={scale}>
      {/* Concentric phase rings at equator */}
      {showRings && (
        <PhaseRings
          scale={1.0}
          enableRotation={true}
          debugPhase={debugPhase}
          debugProgress={debugProgress}
        />
      )}

      {/* Floating 4·7·8 phase numbers */}
      {showGlyphs && (
        <PhaseGlyphs
          orbitRadius={globeRadius * 1.6}
          height={0}
          enableOrbit={false}
          debugPhase={debugPhase}
          debugProgress={debugProgress}
        />
      )}

      {/* Horizontal wave bands */}
      {showWaves && (
        <BreathWaves
          enabled={true}
          baseOpacity={0.2}
          breathScale={0.12}
          enableRotation={true}
          debugPhase={debugPhase}
          debugBreathPhase={debugBreathPhase >= 0 ? debugBreathPhase : debugProgress}
        />
      )}
    </group>
  );
}

export { BreathWaves } from './BreathWaves';
export * from './materials';
export { PhaseGlyphs } from './PhaseGlyphs';
// Named exports for direct access to sub-components
export { PhaseRings } from './PhaseRings';

export default HolographicBreathUI;
