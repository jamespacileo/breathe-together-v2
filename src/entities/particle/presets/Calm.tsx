import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface CalmProps {
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
   * Multiplier on the calm preset's base motion (0.5×).
   *
   * @group "Motion"
   * @min 0.5 @max 2.0 @step 0.1
   * @default 1.0
   */
  motionIntensity?: number;

  /**
   * Orbit spring tightness (how snappily particles follow breathing).
   *
   * Multiplier on the calm preset's base tightness (0.8×).
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
 * Calm Glass Particles - Meditative glass icosahedrons with gentle drift.
 *
 * **Visual:** Transparent glass icosahedrons with vibrant neon edges (requires lighting)
 *
 * **Motion:** Low wind (0.5×), loose spring (0.8×), subtle jitter - gentle, meditative drift
 *
 * **Material:** Glass with transmission and clearcoat, mood-colored emissive glow
 *
 * **Use case:** Guided meditation with ethereal glass aesthetic, tranquil visualization
 *
 * **When to use:** Meditative experiences with gentle particle motion. Translucent beauty with neon edges.
 *
 * **Lighting:** ⚠️ Requires scene lighting (Lighting component) - PBR material needs light for edge highlights
 *
 * @category Particle Presets
 */
export function Calm({
  capacity = 300,
  users,
  motionIntensity = 1.0,
  spreadTightness = 1.0,
  minScale = 0.15,
  maxScale = 0.3,
  fillerColor = '#6B8A9C',
}: CalmProps = {}) {
  const CALM_MOTION_BASE = 0.5;
  const CALM_SPREAD_BASE = 0.8;

  return (
    <ParticleSwarm
      capacity={capacity}
      users={users}
      motionIntensity={CALM_MOTION_BASE * motionIntensity}
      spreadTightness={CALM_SPREAD_BASE * spreadTightness}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
    />
  );
}

export type { CalmProps };
