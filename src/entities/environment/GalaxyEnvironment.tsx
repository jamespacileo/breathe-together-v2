/**
 * GalaxyEnvironment - Complete galaxy/universe scene environment
 *
 * Combines all galaxy elements:
 * - GalaxyBackground: Space shader with nebula and distant stars
 * - ConstellationSystem: Major constellations with connecting lines
 * - Sun: Stylized sun with corona
 * - Appropriate lighting for space scene
 *
 * Performance optimizations:
 * - Instanced rendering for constellation stars
 * - Single draw calls for background and lines
 * - Responsive detail levels based on device
 */

import { useThree } from '@react-three/fiber';
import { memo, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { ConstellationSystem } from './ConstellationSystem';
import { GalaxyBackground } from './GalaxyBackground';
import { Sun } from './Sun';

interface GalaxyEnvironmentProps {
  /** Enable the entire environment @default true */
  enabled?: boolean;

  // === BACKGROUND ===
  /** Nebula cloud intensity (0-1) @default 1.0 */
  nebulaIntensity?: number;
  /** Background star density multiplier @default 1.0 */
  backgroundStarDensity?: number;

  // === CONSTELLATIONS ===
  /** Show constellation stars and lines @default true */
  showConstellations?: boolean;
  /** Constellation sphere radius @default 80 */
  constellationRadius?: number;
  /** Constellation star size @default 0.25 */
  constellationStarSize?: number;
  /** Constellation line opacity @default 0.35 */
  constellationLineOpacity?: number;
  /** Enable star twinkling @default true */
  constellationTwinkle?: boolean;

  // === SUN ===
  /** Show the sun @default true */
  showSun?: boolean;
  /** Sun position @default [60, 30, -40] */
  sunPosition?: [number, number, number];
  /** Sun radius @default 4 */
  sunRadius?: number;
  /** Sun intensity @default 1.0 */
  sunIntensity?: number;

  // === LIGHTING ===
  /** Ambient light intensity @default 0.15 */
  ambientIntensity?: number;
  /** Ambient light color @default '#1a1a2e' */
  ambientColor?: string;
}

export const GalaxyEnvironment = memo(function GalaxyEnvironment({
  enabled = true,

  // Background
  nebulaIntensity = 1.0,
  backgroundStarDensity = 1.0,

  // Constellations
  showConstellations = true,
  constellationRadius = 80,
  constellationStarSize = 0.25,
  constellationLineOpacity = 0.35,
  constellationTwinkle = true,

  // Sun
  showSun = true,
  sunPosition = [60, 30, -40],
  sunRadius = 4,
  sunIntensity = 1.0,

  // Lighting
  ambientIntensity = 0.15,
  ambientColor = '#1a1a2e',
}: GalaxyEnvironmentProps) {
  const { scene } = useThree();
  const { isMobile } = useViewport();

  // Adjust detail based on device
  const adjustedStarSize = isMobile ? constellationStarSize * 0.8 : constellationStarSize;
  const adjustedNebulaIntensity = isMobile ? nebulaIntensity * 0.8 : nebulaIntensity;

  // Clear scene background - GalaxyBackground handles it
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
      {/* Galaxy background - renders behind everything */}
      <GalaxyBackground
        nebulaIntensity={adjustedNebulaIntensity}
        starDensity={backgroundStarDensity}
      />

      {/* Constellation system - stars with connecting lines */}
      {showConstellations && (
        <ConstellationSystem
          radius={constellationRadius}
          starSize={adjustedStarSize}
          lineOpacity={constellationLineOpacity}
          twinkle={constellationTwinkle}
        />
      )}

      {/* Sun with corona and lens flare */}
      {showSun && <Sun position={sunPosition} radius={sunRadius} intensity={sunIntensity} />}

      {/* Space-appropriate lighting */}
      {/* Dim ambient for space - most light comes from sun and stars */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Very subtle rim light to separate objects from background */}
      <directionalLight position={[-20, 10, -30]} intensity={0.1} color="#4466aa" />

      {/* Fill light from opposite side of sun */}
      <directionalLight
        position={[-sunPosition[0] * 0.5, sunPosition[1] * 0.3, -sunPosition[2] * 0.5]}
        intensity={0.05}
        color="#666688"
      />

      {/* Hemisphere light for subtle sky/ground color variation */}
      <hemisphereLight args={['#1a1a3a', '#0a0a1a', 0.1]} />
    </group>
  );
});

export default GalaxyEnvironment;
