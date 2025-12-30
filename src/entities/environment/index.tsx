/**
 * Environment - Unified scene setup with drei Stage, breath-synchronized backdrop, stars, and sparkles.
 * Uses Stage component for professional three-point lighting, shadows, and HDR environment.
 * Adds breath-synced point light, stars rotation, and atmospheric sparkles on top.
 */

import { Stage } from '@react-three/drei';
import { Backdrop } from './Backdrop';
import { BreathPointLight } from './BreathPointLight';
import { BreathSparkles } from './BreathSparkles';
import { BreathStars } from './BreathStars';

export * from './Backdrop';

interface EnvironmentProps {
  /**
   * Environment mood preset - controls lighting, shadows, HDR environment, and backdrop colors.
   *
   * - **meditation**: Soft, gentle lighting (drie: dawn) with calm blues/teals and 3000 stars
   * - **cosmic**: Dramatic, contrasted lighting (drei: night) with deep purples/magentas and 8000 stars
   * - **minimal**: Balanced, neutral lighting (drei: studio) with subtle grays, no stars
   * - **studio**: Bright, even lighting (drei: studio) with warm golds and 1000 stars
   *
   * @group "Configuration"
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   * @default "meditation"
   */
  preset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density multiplier (affects star count, sparkle opacity, point light intensity).
   *
   * Controls the intensity of all atmospheric elements:
   * - 0.0: Minimal atmosphere, faint effects
   * - 0.5: Balanced atmosphere (default)
   * - 1.0: Rich, dense atmosphere with maximum sparkles and stars
   *
   * @group "Configuration"
   * @min 0
   * @max 1
   * @step 0.1
   * @default 0.5
   */
  atmosphere?: number;
}

/**
 * Unified preset mapping: environment preset → Stage preset, HDR environment, shadow type
 * Consolidates all environment configuration in one place for clarity and maintainability.
 */
const PRESET_MAP = {
  meditation: {
    stage: 'soft' as const,
    drei: 'dawn' as const,
    shadows: 'contact' as const,
  },
  cosmic: {
    stage: 'rembrandt' as const,
    drei: 'night' as const,
    shadows: 'contact' as const,
  },
  minimal: {
    stage: 'portrait' as const,
    drei: 'studio' as const,
    shadows: 'contact' as const,
  },
  studio: {
    stage: 'upfront' as const,
    drei: 'studio' as const,
    shadows: 'accumulative' as const,
  },
} as const;

/**
 * Main Environment component - renders the entire scene background, lighting, and atmospheric effects.
 *
 * Internally uses:
 * 1. **Stage component** - Professional three-point lighting presets, shadows, and HDR environment
 * 2. **Backdrop** - Custom breath-synchronized gradient and nebula shaders
 * 3. **BreathStars** - Starfield with crystallization-modulated rotation speed
 * 4. **BreathSparkles** - Atmospheric dust/pollen with density scaling
 * 5. **BreathPointLight** - Dynamic warm-cool lighting that syncs with breathing phase
 *
 * All breath-synchronized elements animate with the 16-second box breathing cycle.
 */
export function Environment({ preset = 'meditation', atmosphere = 0.5 }: EnvironmentProps = {}) {
  const config = PRESET_MAP[preset];

  return (
    <Stage
      preset={config.stage}
      intensity={0.4}
      shadows={config.shadows}
      environment={config.drei}
      adjustCamera={false}
    >
      {/* Breath-synchronized backdrop with custom shaders (gradient + nebula) */}
      <Backdrop preset={preset} atmosphere={atmosphere} />

      {/* Starfield with crystallization-modulated rotation speed */}
      <BreathStars preset={preset} atmosphere={atmosphere} />

      {/* Atmospheric sparkles (dust/pollen) with opacity scaling */}
      <BreathSparkles preset={preset} atmosphere={atmosphere} />

      {/* Breath-synced point light: color, intensity, and position animate with breathing phase */}
      <BreathPointLight atmosphere={atmosphere} />
    </Stage>
  );
}
