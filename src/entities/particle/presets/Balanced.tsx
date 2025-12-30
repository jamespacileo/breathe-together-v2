import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface BalancedProps {
  /**
   * Total number of particles (user + filler).
   *
   * @group "Configuration"
   * @min 100 @max 1000 @step 50
   * @default 300
   */
  capacity?: number;

  /**
   * User mood distribution (mood ID → count).
   *
   * @group "Configuration"
   */
  users?: Partial<Record<MoodId, number>>;

  /**
   * Motion intensity multiplier (affects wind and jitter).
   *
   * Multiplier on the balanced preset's base motion (1.0×).
   *
   * @group "Motion"
   * @min 0.5 @max 2.0 @step 0.1
   * @default 1.0
   */
  motionIntensity?: number;

  /**
   * Orbit spring tightness (how snappily particles follow breathing).
   *
   * Multiplier on the balanced preset's base tightness (1.0×).
   *
   * @group "Motion"
   * @min 0.5 @max 1.5 @step 0.1
   * @default 1.0
   */
  spreadTightness?: number;

  /**
   * Particle size at exhale (minimum breathing phase).
   *
   * @group "Visual Size"
   * @min 0.05 @max 0.3 @step 0.01
   * @default 0.15
   */
  minScale?: number;

  /**
   * Particle size at inhale (maximum breathing phase).
   *
   * @group "Visual Size"
   * @min 0.1 @max 0.6 @step 0.01
   * @default 0.3
   */
  maxScale?: number;

  /**
   * Filler particle color (non-user particles).
   *
   * @group "Appearance"
   * @type color
   * @default '#6B8A9C'
   */
  fillerColor?: string;
}

/**
 * Balanced Glass Particles - Transparent glass icosahedrons with responsive, natural motion.
 *
 * **Visual:** Transparent glass icosahedron with vibrant neon edges (requires lighting)
 *
 * **Motion:** Medium wind (1.0x), balanced spring (1.0x), standard jitter - responsive and smooth
 *
 * **Material:** Semi-transparent glass with PBR clearcoat reflections creating sharp neon edge highlights
 *
 * **Use case:** Default balanced preset for meditation with translucent gem-like appearance and mood-colored edges
 *
 * **When to use:** Standard breathing experiences. Responsive breathing with glass icosahedrons and edge glow.
 *
 * **Lighting:** ⚠️ Requires scene lighting (Lighting component) - PBR material needs light for edge highlights
 *
 * @category Particle Presets
 */
export function Balanced({
  capacity = 300,
  users,
  motionIntensity = 1.0,
  spreadTightness = 1.0,
  minScale = 0.15,
  maxScale = 0.3,
  fillerColor = '#6B8A9C',
}: BalancedProps = {}) {
  const BALANCED_MOTION_BASE = 1.0;
  const BALANCED_SPREAD_BASE = 1.0;

  return (
    <ParticleSwarm
      capacity={capacity}
      users={users}
      motionIntensity={BALANCED_MOTION_BASE * motionIntensity}
      spreadTightness={BALANCED_SPREAD_BASE * spreadTightness}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
    />
  );
}

export type { BalancedProps };
