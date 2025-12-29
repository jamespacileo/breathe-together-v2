import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface DynamicCrystallineProps {
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
 * Dynamic Crystalline Particles - High-energy geometric visualization with sharp responsiveness.
 *
 * **Visual:** Faceted icosahedron with PBR material, sharp crystalline facets, bold colors
 *
 * **Motion:** High wind (1.5x), tight spring (1.2x), intense jitter (1.2x) - snappy, dramatic, active
 *
 * **Use case:** High-energy visualization, data display, celebration moods, dynamic presentations
 *
 * **When to use:** When you want geometric precision with high energy. Perfect for celebrations,
 * energetic presentations, or when geometric structure matters and motion should feel dramatic.
 *
 * **Lighting:** ⚠️ Requires scene lighting (Lighting component)
 *
 * @category Particle Presets
 */
export function DynamicCrystalline({
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
}: DynamicCrystallineProps = {}) {
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
      windStrength={1.5 * motionIntensity}
      jitterStrength={1.2 * motionIntensity}
      spread={1.2 * spreadTightness}
      minRadius={0.8}
      maxRadius={6.0}
      repulsionStrength={1.0}
      repulsionOffset={0.4}
      enableWind={enableWind}
      enableJitter={enableJitter}
      enableRepulsion={enableRepulsion}
      enableBuoyancy={false} // Disabled for energetic feel
      enablePulse={true}
    />
  );
}

export type { DynamicCrystallineProps };
