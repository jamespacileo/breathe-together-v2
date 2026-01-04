import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { AmbientDust } from './AmbientDust';
import { Constellations } from './Constellations';
import { GalaxyBackground } from './GalaxyBackground';
import { Sun } from './Sun';

interface EnvironmentProps {
  enabled?: boolean;
  /** Show constellations with connecting lines @default true */
  showConstellations?: boolean;
  /** Show sun @default true */
  showSun?: boolean;
  /** Background star count @default 2000 */
  backgroundStarCount?: number;
  /** Constellation line opacity @default 0.4 */
  constellationLineOpacity?: number;
  /** Star brightness @default 1.0 */
  starBrightness?: number;
  /** Sun glow intensity @default 1.5 */
  sunGlowIntensity?: number;
  /** Ambient light color @default '#e6f0ff' */
  ambientLightColor?: string;
  /** Ambient light intensity @default 0.3 */
  ambientLightIntensity?: number;
  /** Key light color @default '#fff5e6' */
  keyLightColor?: string;
  /** Key light intensity @default 0.5 */
  keyLightIntensity?: number;
}

/**
 * Environment - Stylized galaxy/universe scene
 *
 * Features:
 * - Deep space galaxy background with nebula clouds
 * - Ambient cosmic lighting
 * - Atmospheric dust particles
 *
 * NOTE: Constellations and Sun are rendered separately outside DoF pipeline
 * to maintain sharp focus. See EnvironmentOverlay component.
 */
export function Environment({
  enabled = true,
  ambientLightColor = '#e6f0ff',
  ambientLightIntensity = 0.3,
  keyLightColor = '#fff5e6',
  keyLightIntensity = 0.5,
}: Pick<
  EnvironmentProps,
  'enabled' | 'ambientLightColor' | 'ambientLightIntensity' | 'keyLightColor' | 'keyLightIntensity'
> = {}) {
  const { scene } = useThree();
  const { isMobile } = useViewport();

  // Clear any scene background - let GalaxyBackground handle it
  useEffect(() => {
    scene.background = null;
    scene.fog = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  if (!enabled) return null;

  return (
    <group>
      {/* Deep space galaxy background - renders behind everything */}
      <GalaxyBackground />

      {/* Subtle floating dust for atmospheric depth */}
      {!isMobile && <AmbientDust count={60} opacity={0.08} size={0.01} enabled={true} />}

      {/* Ambient light - soft cosmic fill */}
      <ambientLight intensity={ambientLightIntensity} color={ambientLightColor} />

      {/* Key light - from sun direction (warm) */}
      <directionalLight
        position={[80, 20, -60]}
        intensity={keyLightIntensity}
        color={keyLightColor}
        castShadow={false}
      />

      {/* Fill light - opposite side (cool blue cosmic light) */}
      <directionalLight position={[-60, 15, 40]} intensity={0.2} color="#cce6ff" />

      {/* Rim light - subtle backlight from below for depth */}
      <directionalLight position={[0, -30, 0]} intensity={0.15} color="#e6d9ff" />

      {/* Hemisphere light for cosmic sky/space color blending */}
      <hemisphereLight args={['#1a1a2e', '#0a0a14', 0.2]} />
    </group>
  );
}

/**
 * EnvironmentOverlay - Sharp overlay elements (stars, sun)
 *
 * Rendered OUTSIDE the DoF pipeline to maintain sharp focus.
 * These elements should always be crisp like the UI overlays.
 */
export function EnvironmentOverlay({
  enabled = true,
  showConstellations = true,
  showSun = true,
  backgroundStarCount = 2000,
  constellationLineOpacity = 0.4,
  starBrightness = 1.0,
  sunGlowIntensity = 1.5,
}: Pick<
  EnvironmentProps,
  | 'enabled'
  | 'showConstellations'
  | 'showSun'
  | 'backgroundStarCount'
  | 'constellationLineOpacity'
  | 'starBrightness'
  | 'sunGlowIntensity'
> = {}) {
  const { isMobile, isTablet } = useViewport();

  // Reduce star count on mobile/tablet for better performance
  const adjustedStarCount = isMobile ? 800 : isTablet ? 1500 : backgroundStarCount;

  if (!enabled) return null;

  return (
    <group>
      {/* Constellations with connecting lines - always sharp, no DoF */}
      {showConstellations && (
        <Constellations
          showLines={true}
          backgroundStarCount={adjustedStarCount}
          brightness={starBrightness}
          lineOpacity={constellationLineOpacity}
          enableTwinkle={true}
        />
      )}

      {/* Sun with volumetric glow - always sharp, no DoF */}
      {showSun && (
        <Sun
          position={[80, 20, -60]}
          radius={4}
          color="#fff5e6"
          glowIntensity={sunGlowIntensity}
          enablePulse={true}
        />
      )}
    </group>
  );
}
