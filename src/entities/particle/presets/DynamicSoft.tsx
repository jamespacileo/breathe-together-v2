import type { MoodId } from '../../../constants';
import { ParticleSwarm } from '../ParticleSwarm';

interface DynamicSoftProps {
  capacity?: number;
  users?: Partial<Record<MoodId, number>>;
  motionIntensity?: number;
  spreadTightness?: number;
  minScale?: number;
  maxScale?: number;
  fillerColor?: string;
  particleOpacity?: number;
  enableWind?: boolean;
  enableJitter?: boolean;
  enableRepulsion?: boolean;
}

/**
 * Dynamic Soft Particles - Energetic, responsive motion with smooth glow aesthetic.
 *
 * **Visual:** Smooth icosahedron with additive glow (atmospheric, energetic)
 *
 * **Motion:** High wind (1.5x), tight spring (1.2x), intense jitter (1.2x) - snappy, responsive, active
 *
 * **Use case:** Celebration moods, active breathing sessions, high-energy exploration
 *
 * **When to use:** When you want dynamic, responsive motion. Perfect for energetic contexts,
 * celebrations, or when you want the breathing to feel more active and present.
 *
 * **Lighting:** Does not require scene lighting
 *
 * @category Particle Presets
 */
export function DynamicSoft({
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
}: DynamicSoftProps = {}) {
  return (
    <ParticleSwarm
      capacity={capacity}
      users={users}
      minScale={minScale}
      maxScale={maxScale}
      fillerColor={fillerColor}
      particleStyle="soft"
      particleOpacity={particleOpacity}
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

export type { DynamicSoftProps };
