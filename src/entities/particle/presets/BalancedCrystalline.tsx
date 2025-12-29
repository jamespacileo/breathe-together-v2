import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface BalancedCrystallineProps {
  capacity?: number;
  users?: Partial<Record<MoodId, number>>;
  motionIntensity?: number;
  spreadTightness?: number;
  minScale?: number;
  maxScale?: number;
  fillerColor?: string;
  particleOpacity?: number;
  particleEmissiveIntensity?: number;
  enableWind?: boolean;
  enableJitter?: boolean;
  enableRepulsion?: boolean;
}

/**
 * Balanced Crystalline Particles - Geometric visualization with responsive, natural motion.
 *
 * **Visual:** Faceted icosahedron with PBR material, solid colors, metallic facets
 *
 * **Motion:** Medium wind (1.0x), balanced spring (1.0x), standard jitter - responsive and smooth
 *
 * **Use case:** Interactive exploration, data visualization, modern design contexts
 *
 * **When to use:** When you want geometric precision with natural, responsive breathing behavior.
 * Perfect for contemporary designs and interactive experiences.
 *
 * **Lighting:** ⚠️ Requires scene lighting (Lighting component)
 *
 * @category Particle Presets
 */
export function BalancedCrystalline({
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
}: BalancedCrystallineProps = {}) {
  return (
    <ParticleSwarm
      capacity={capacity}
      users={users}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
      particleStyle="crystalline"
      particleOpacity={particleOpacity}
      particleEmissiveIntensity={particleEmissiveIntensity}
      windStrength={1.0 * motionIntensity}
      jitterStrength={1.0 * motionIntensity}
      spread={1.0 * spreadTightness}
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

export type { BalancedCrystallineProps };
