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
 * Environment - Stylized galaxy/universe scene lighting
 *
 * Features:
 * - Ambient cosmic lighting
 * - Atmospheric dust particles (inside DoF for depth)
 *
 * NOTE: Galaxy background, constellations, and sun are rendered in EnvironmentOverlay
 * outside the DoF pipeline to maintain sharp focus.
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
      {/* Subtle floating dust for atmospheric depth (inside DoF for realism) */}
      {!isMobile && <AmbientDust count={60} opacity={0.12} size={0.012} enabled={true} />}

      {/* Ambient light - brighter cosmic fill for visibility */}
      <ambientLight intensity={ambientLightIntensity * 1.5} color={ambientLightColor} />

      {/* Key light - from sun direction (warm cosmic glow) */}
      <directionalLight
        position={[80, 20, -60]}
        intensity={keyLightIntensity * 1.3}
        color={keyLightColor}
        castShadow={false}
      />

      {/* Fill light - opposite side (cool cosmic teal) */}
      <directionalLight position={[-60, 15, 40]} intensity={0.35} color="#99ddff" />

      {/* Rim light - nebula purple backlight from below */}
      <directionalLight position={[0, -30, 0]} intensity={0.25} color="#cc99ff" />

      {/* Hemisphere light for cosmic atmosphere - brighter for visibility */}
      <hemisphereLight args={['#2a3a5e', '#151525', 0.4]} />
    </group>
  );
}

/**
 * EnvironmentOverlay - Sharp overlay elements (background, stars, sun)
 *
 * Rendered OUTSIDE the DoF pipeline to maintain sharp focus.
 * These elements should always be crisp like the UI overlays.
 *
 * NOTE: This group should be placed INSIDE MomentumControls so sun rotates with scene.
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
      {/* Galaxy background - always sharp, no DoF */}
      <GalaxyBackground />

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

      {/* Sun with volumetric glow - always sharp, no DoF, rotates with scene */}
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
