import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface BalancedSoftProps {
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
   * @group "Motion"
   * @min 0 @max 2 @step 0.1
   * @default 1.0 (balanced baseline)
   */
  motionIntensity?: number;

  /**
   * Orbit spring tightness (how snappily particles follow breathing).
   *
   * @group "Motion"
   * @min 0.5 @max 1.5 @step 0.1
   * @default 1.0 (balanced baseline)
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
 * Balanced Soft Particles - Default experience with smooth, natural breathing response.
 *
 * **Visual:** Smooth icosahedron with additive glow (atmospheric, unlit)
 *
 * **Motion:** Medium wind (1.0x), balanced spring (1.0x), standard jitter - natural, flowing
 *
 * **Use case:** General breathing exercises, daily meditation, default experience
 *
 * **When to use:** This is the recommended default. Balanced motion that feels natural and responsive.
 * Good for general breathing exercises and exploration.
 *
 * **Lighting:** Does not require scene lighting (uses basic material with additive blending)
 *
 * @category Particle Presets
 */
export function BalancedSoft({
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
}: BalancedSoftProps = {}) {
  const BALANCED_WIND_BASE = 1.0;
  const BALANCED_JITTER_BASE = 1.0;
  const BALANCED_SPREAD_BASE = 1.0;

  return (
    <ParticleSwarm
      capacity={capacity}
      users={users}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
      particleStyle="soft"
      particleOpacity={particleOpacity}
      windStrength={BALANCED_WIND_BASE * motionIntensity}
      jitterStrength={BALANCED_JITTER_BASE * motionIntensity}
      spread={BALANCED_SPREAD_BASE * spreadTightness}
      minRadius={0.8}
      maxRadius={6.0}
      repulsionStrength={1.0}
      repulsionOffset={0.4}
      enableWind={enableWind}
      enableJitter={enableJitter}
      enableRepulsion={enableRepulsion}
      enableBuoyancy={true}
      enablePulse={true}
    />
  );
}

export type { BalancedSoftProps };
