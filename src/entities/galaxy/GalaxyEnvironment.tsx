/**
 * GalaxyEnvironment - Complete galaxy/universe environment
 *
 * Combines all galaxy elements:
 * - Deep space background with nebula
 * - Constellation stars with connecting lines
 * - Stylized sun with corona
 * - Cosmic dust particles
 * - Space-appropriate lighting
 *
 * Replaces the original Monument Valley environment with a cosmic theme.
 */

import { useThree } from '@react-three/fiber';
import { memo, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { ConstellationSystem } from './ConstellationSystem';
import { CosmicDust } from './CosmicDust';
import { GalaxyBackground } from './GalaxyBackground';
import { Sun } from './Sun';

interface GalaxyEnvironmentProps {
  /** Enable the galaxy environment @default true */
  enabled?: boolean;

  // Sun controls
  /** Show the sun @default true */
  showSun?: boolean;
  /** Sun position @default [60, 40, -80] */
  sunPosition?: [number, number, number];
  /** Sun radius @default 8 */
  sunRadius?: number;
  /** Sun light intensity @default 1.0 */
  sunIntensity?: number;

  // Constellation controls
  /** Show constellations @default true */
  showConstellations?: boolean;
  /** Constellation sphere radius @default 80 */
  constellationRadius?: number;
  /** Star size multiplier @default 1.0 */
  starSize?: number;
  /** Constellation line opacity @default 0.3 */
  lineOpacity?: number;
  /** Constellation line color @default '#4488aa' */
  lineColor?: string;
  /** Enable star twinkle @default true */
  enableTwinkle?: boolean;

  // Cosmic dust controls
  /** Show cosmic dust particles @default true */
  showCosmicDust?: boolean;
  /** Cosmic dust count @default 200 */
  dustCount?: number;
  /** Cosmic dust sphere radius @default 60 */
  dustRadius?: number;
  /** Cosmic dust particle size @default 0.8 */
  dustSize?: number;

  // Background controls
  /** Nebula intensity @default 0.8 */
  nebulaIntensity?: number;
  /** Milky Way intensity @default 0.6 */
  milkyWayIntensity?: number;

  // Lighting
  /** Ambient light intensity @default 0.15 */
  ambientIntensity?: number;
  /** Ambient light color @default '#334466' */
  ambientColor?: string;
}

function GalaxyEnvironmentComponent({
  enabled = true,
  showSun = true,
  sunPosition = [60, 40, -80],
  sunRadius = 8,
  sunIntensity = 1.0,
  showConstellations = true,
  constellationRadius = 80,
  starSize = 1.0,
  lineOpacity = 0.3,
  lineColor = '#4488aa',
  enableTwinkle = true,
  showCosmicDust = true,
  dustCount = 200,
  dustRadius = 60,
  dustSize = 0.8,
  nebulaIntensity = 0.8,
  milkyWayIntensity = 0.6,
  ambientIntensity = 0.15,
  ambientColor = '#334466',
}: GalaxyEnvironmentProps) {
  const { scene } = useThree();
  const { isMobile, isTablet } = useViewport();

  // Adjust values for device performance
  const adjustedDustCount = isMobile
    ? Math.floor(dustCount * 0.4)
    : isTablet
      ? Math.floor(dustCount * 0.7)
      : dustCount;

  const adjustedStarSize = isMobile ? starSize * 0.8 : starSize;

  // Clear scene background
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
      {/* Deep space background with nebula and star field */}
      <GalaxyBackground nebulaIntensity={nebulaIntensity} milkyWayIntensity={milkyWayIntensity} />

      {/* Stylized sun with corona */}
      {showSun && (
        <Sun
          position={sunPosition}
          radius={sunRadius}
          lightIntensity={sunIntensity}
          breathingSync={true}
        />
      )}

      {/* Constellation stars with connecting lines */}
      {showConstellations && (
        <ConstellationSystem
          radius={constellationRadius}
          starSize={adjustedStarSize}
          lineOpacity={lineOpacity}
          lineColor={lineColor}
          enableTwinkle={enableTwinkle}
          breathingSync={true}
        />
      )}

      {/* Cosmic dust particles */}
      {showCosmicDust && (
        <CosmicDust
          count={adjustedDustCount}
          radius={dustRadius}
          innerRadius={12}
          size={dustSize}
          breathingSync={true}
        />
      )}

      {/* Space ambient light - very low, cold blue */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Subtle hemisphere light for depth */}
      <hemisphereLight args={['#1a1a2e', '#0a0a14', 0.2]} />
    </group>
  );
}

export const GalaxyEnvironment = memo(GalaxyEnvironmentComponent);
export default GalaxyEnvironment;
