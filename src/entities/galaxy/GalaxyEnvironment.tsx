/**
 * GalaxyEnvironment - Complete galaxy/universe environment
 *
 * Split into two components for proper rendering:
 * - GalaxyBackdrop: Background, constellations, sun (renders OUTSIDE DoF - always crisp)
 * - GalaxyLighting: Ambient/hemisphere lights (renders INSIDE DoF with scene)
 *
 * This split ensures distant elements like stars and constellations
 * appear sharp like a backdrop, while foreground elements get the DoF effect.
 */

import { useThree } from '@react-three/fiber';
import { memo, useEffect } from 'react';
import { GALAXY_PALETTE } from '../../config/galaxyPalette';
import { useViewport } from '../../hooks/useViewport';
import { ConstellationSystem } from './ConstellationSystem';
import { CosmicDust } from './CosmicDust';
import { GalaxyBackground } from './GalaxyBackground';
import { Sun } from './Sun';

// === SHARED PROPS INTERFACE ===

interface GalaxyBackdropProps {
  /** Enable the backdrop @default true */
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
  /** Constellation sphere radius @default 25 - closer for better visibility */
  constellationRadius?: number;
  /** Star size multiplier @default 1.2 */
  starSize?: number;
  /** Constellation line opacity @default 0.4 */
  lineOpacity?: number;
  /** Constellation line color @default GALAXY_PALETTE.constellations.lines */
  lineColor?: string;
  /** Enable star twinkle @default true */
  enableTwinkle?: boolean;

  // Background controls
  /** Nebula intensity @default 0.8 */
  nebulaIntensity?: number;
  /** Milky Way intensity @default 0.6 */
  milkyWayIntensity?: number;
}

interface GalaxyForegroundProps {
  /** Enable the foreground effects @default true */
  enabled?: boolean;

  // Cosmic dust controls
  /** Show cosmic dust particles @default true */
  showCosmicDust?: boolean;
  /** Cosmic dust count @default 200 */
  dustCount?: number;
  /** Cosmic dust sphere radius @default 20 */
  dustRadius?: number;
  /** Cosmic dust particle size @default 0.6 */
  dustSize?: number;

  // Lighting
  /** Ambient light intensity @default 0.2 */
  ambientIntensity?: number;
  /** Ambient light color @default GALAXY_PALETTE.background.mid */
  ambientColor?: string;
}

// Combined props for backward compatibility
interface GalaxyEnvironmentProps extends GalaxyBackdropProps, GalaxyForegroundProps {}

// === BACKDROP COMPONENT ===
// Renders OUTSIDE RefractionPipeline - always crisp, no DoF blur

function GalaxyBackdropComponent({
  enabled = true,
  showSun = true,
  sunPosition = [60, 40, -80],
  sunRadius = 8,
  sunIntensity = 1.0,
  showConstellations = true,
  constellationRadius = 25, // Closer for better visibility
  starSize = 1.2,
  lineOpacity = 0.4,
  lineColor = GALAXY_PALETTE.constellations.lines,
  enableTwinkle = true,
  nebulaIntensity = 0.8,
  milkyWayIntensity = 0.6,
}: GalaxyBackdropProps) {
  const { scene } = useThree();
  const { isMobile } = useViewport();

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

      {/* Stylized sun with corona - positioned far but rendered crisp */}
      {showSun && (
        <Sun
          position={sunPosition}
          radius={sunRadius}
          lightIntensity={sunIntensity}
          coreColor={GALAXY_PALETTE.sun.core}
          coronaColor={GALAXY_PALETTE.sun.corona}
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
          starColor={GALAXY_PALETTE.constellations.stars}
          enableTwinkle={enableTwinkle}
          breathingSync={true}
        />
      )}
    </group>
  );
}

// === FOREGROUND COMPONENT ===
// Renders INSIDE RefractionPipeline - gets DoF blur like other scene elements

function GalaxyForegroundComponent({
  enabled = true,
  showCosmicDust = true,
  dustCount = 200,
  dustRadius = 20, // Closer to globe for better integration
  dustSize = 0.6,
  ambientIntensity = 0.2,
  ambientColor = GALAXY_PALETTE.background.mid,
}: GalaxyForegroundProps) {
  const { isMobile, isTablet } = useViewport();

  // Adjust values for device performance
  const adjustedDustCount = isMobile
    ? Math.floor(dustCount * 0.4)
    : isTablet
      ? Math.floor(dustCount * 0.7)
      : dustCount;

  if (!enabled) return null;

  return (
    <group>
      {/* Cosmic dust particles - in foreground with DoF */}
      {showCosmicDust && (
        <CosmicDust
          count={adjustedDustCount}
          radius={dustRadius}
          innerRadius={8}
          size={dustSize}
          breathingSync={true}
        />
      )}

      {/* Space ambient light - subtle cold blue */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Hemisphere light for depth - subtle gradient from space to darker ground */}
      <hemisphereLight
        args={[GALAXY_PALETTE.background.light, GALAXY_PALETTE.background.deep, 0.3]}
      />
    </group>
  );
}

// === COMBINED COMPONENT (for backward compatibility) ===

function GalaxyEnvironmentComponent({
  enabled = true,
  showSun = true,
  sunPosition = [60, 40, -80],
  sunRadius = 8,
  sunIntensity = 1.0,
  showConstellations = true,
  constellationRadius = 25,
  starSize = 1.2,
  lineOpacity = 0.4,
  lineColor = GALAXY_PALETTE.constellations.lines,
  enableTwinkle = true,
  showCosmicDust = true,
  dustCount = 200,
  dustRadius = 20,
  dustSize = 0.6,
  nebulaIntensity = 0.8,
  milkyWayIntensity = 0.6,
  ambientIntensity = 0.2,
  ambientColor = GALAXY_PALETTE.background.mid,
}: GalaxyEnvironmentProps) {
  return (
    <>
      <GalaxyBackdrop
        enabled={enabled}
        showSun={showSun}
        sunPosition={sunPosition}
        sunRadius={sunRadius}
        sunIntensity={sunIntensity}
        showConstellations={showConstellations}
        constellationRadius={constellationRadius}
        starSize={starSize}
        lineOpacity={lineOpacity}
        lineColor={lineColor}
        enableTwinkle={enableTwinkle}
        nebulaIntensity={nebulaIntensity}
        milkyWayIntensity={milkyWayIntensity}
      />
      <GalaxyForeground
        enabled={enabled}
        showCosmicDust={showCosmicDust}
        dustCount={dustCount}
        dustRadius={dustRadius}
        dustSize={dustSize}
        ambientIntensity={ambientIntensity}
        ambientColor={ambientColor}
      />
    </>
  );
}

// === EXPORTS ===

export const GalaxyBackdrop = memo(GalaxyBackdropComponent);
export const GalaxyForeground = memo(GalaxyForegroundComponent);
export const GalaxyEnvironment = memo(GalaxyEnvironmentComponent);

export type { GalaxyBackdropProps, GalaxyForegroundProps, GalaxyEnvironmentProps };
export default GalaxyEnvironment;
