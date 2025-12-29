import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface CalmCrystallineProps {
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
   * @default undefined (uses preset default: 0.8 for crystalline)
   */
  particleOpacity?: number;

  /**
   * Emissive intensity (self-glow on crystalline particles).
   *
   * @group "Appearance - Advanced"
   * @min 0 @max 1 @step 0.05
   * @default undefined (uses preset default: 0.3)
   */
  particleEmissiveIntensity?: number;

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
 * Calm Crystalline Particles - Meditative geometric visualization with faceted crystalline shapes.
 *
 * **Visual:** Faceted icosahedron with PBR material, solid colors, geometric glow
 *
 * **Motion:** Low wind (0.5x), loose spring (0.8x), pronounced jitter (1.3x) - meditative with visible structure
 *
 * **Use case:** Geometric meditation focus, sacred geometry visualization, contemplative design
 *
 * **When to use:** When you want to combine meditative calm with structured, faceted geometry.
 * Perfect for focus work, contemplation with visual anchor points.
 *
 * **Lighting:** ⚠️ Requires scene lighting (Lighting component) - uses PBR material for shiny facets
 *
 * @category Particle Presets
 */
export function CalmCrystalline({
  capacity = 300,
  users,
  motionIntensity = 1.0,
  spreadTightness = 1.0,
  minScale = 0.05,
  maxScale = 0.1,
  fillerColor = '#6B8A9C',
  particleOpacity,
  particleEmissiveIntensity,
  enableWind = true,
  enableJitter = true,
  enableRepulsion = true,
}: CalmCrystallineProps = {}) {
  const CALM_WIND_BASE = 0.5;
  const CALM_JITTER_BASE = 1.3; // Higher than soft (geometric vibration)
  const CALM_SPREAD_BASE = 0.8;

  return (
    <ParticleSwarm
      // Core configuration
      capacity={capacity}
      users={users}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
      // Visual style preset: crystalline (faceted, PBR, solid colors)
      particleStyle="crystalline"
      particleOpacity={particleOpacity}
      particleEmissiveIntensity={particleEmissiveIntensity}
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
      enableBuoyancy={true} // Always enabled for calm
      enablePulse={true} // Always enabled
    />
  );
}

export type { CalmCrystallineProps };
