import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface CalmSoftProps {
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
   * Higher = more organic drift and vibration.
   * - 0.5: Very subtle, meditative
   * - 1.0: Calm preset baseline
   * - 1.5: Noticeably more active
   *
   * @group "Motion"
   * @min 0 @max 2 @step 0.1
   * @default 1.0 (calm baseline)
   */
  motionIntensity?: number;

  /**
   * Orbit spring tightness (how snappily particles follow breathing).
   *
   * Lower = looser, more organic drift. Higher = tighter, more responsive tracking.
   * - 0.5: Very loose, floaty
   * - 0.8: Calm preset baseline (loose spring)
   * - 1.0: Neutral
   * - 1.5: Tight, snappy
   *
   * @group "Motion"
   * @min 0.5 @max 1.5 @step 0.1
   * @default 1.0 (calm baseline)
   */
  spreadTightness?: number;

  /**
   * Particle size at exhale (minimum breathing phase).
   *
   * @group "Visual Size"
   * @min 0.01 @max 0.2 @step 0.01
   * @default 0.05
   */
  minScale?: number;

  /**
   * Particle size at inhale (maximum breathing phase).
   *
   * @group "Visual Size"
   * @min 0.05 @max 0.5 @step 0.01
   * @default 0.1
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

  /**
   * Particle opacity override (0 = transparent, 1 = solid).
   *
   * @group "Appearance - Advanced"
   * @min 0 @max 1 @step 0.05
   * @default undefined (uses preset default: 0.6 for soft)
   */
  particleOpacity?: number;

  /**
   * Enable wind/turbulence force.
   *
   * @group "Physics - Advanced"
   * @default true
   */
  enableWind?: boolean;

  /**
   * Enable jitter/shiver during breath holds.
   *
   * @group "Physics - Advanced"
   * @default true
   */
  enableJitter?: boolean;

  /**
   * Enable sphere repulsion (collision prevention).
   *
   * @group "Physics - Advanced"
   * @default true
   */
  enableRepulsion?: boolean;
}

/**
 * Calm Soft Particles - Meditative atmosphere with gentle drift.
 *
 * **Visual:** Smooth icosahedron with additive glow (atmospheric, unlit)
 *
 * **Motion:** Low wind (0.5x), loose spring (0.8x), subtle jitter - creates gentle, organic drift
 *
 * **Use case:** Guided meditation, relaxation sessions, sleep preparation, tranquil environments
 *
 * **When to use:** Default for meditation experiences. Soft, gentle movement that doesn't distract.
 * Perfect for calming, meditative contexts.
 *
 * **Lighting:** Does not require scene lighting (uses basic material with additive blending)
 *
 * @category Particle Presets
 */
export function CalmSoft({
  capacity = 300,
  users,
  motionIntensity = 1.0,
  spreadTightness = 1.0,
  minScale = 0.05,
  maxScale = 0.1,
  fillerColor = '#6B8A9C',
  particleOpacity,
  enableWind = true,
  enableJitter = true,
  enableRepulsion = true,
}: CalmSoftProps = {}) {
  const CALM_WIND_BASE = 0.5;
  const CALM_JITTER_BASE = 0.8;
  const CALM_SPREAD_BASE = 0.8;

  return (
    <ParticleSwarm
      // Core configuration
      capacity={capacity}
      users={users}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
      // Visual style preset: soft (smooth, unlit, additive glow)
      particleStyle="soft"
      particleOpacity={particleOpacity}
      // Motion configuration (preset-specific)
      windStrength={CALM_WIND_BASE * motionIntensity}
      jitterStrength={CALM_JITTER_BASE * motionIntensity}
      spread={CALM_SPREAD_BASE * spreadTightness}
      // Physics defaults for calm preset
      minRadius={0.8}
      maxRadius={6.0}
      repulsionStrength={1.0}
      repulsionOffset={0.4}
      // Force toggles
      enableWind={enableWind}
      enableJitter={enableJitter}
      enableRepulsion={enableRepulsion}
      enableBuoyancy={true} // Always enabled for calm (gentle upward drift)
      enablePulse={true} // Always enabled
    />
  );
}

export type { CalmSoftProps };
