import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { AmbientDust } from './AmbientDust';
import { BackgroundGradient } from './BackgroundGradient';
import { CloudSystem } from './CloudSystem';
import { ConstellationStars } from './ConstellationStars';
import { StylizedSun } from './StylizedSun';
import { SubtleLightRays } from './SubtleLightRays';

interface EnvironmentProps {
  enabled?: boolean;
  /** Show volumetric clouds @default true */
  showClouds?: boolean;
  /** Show distant stars (drei random stars) @default false */
  showStars?: boolean;
  /** Show real constellations with connecting lines @default true */
  showConstellations?: boolean;
  /** Show constellation connecting lines @default true */
  showConstellationLines?: boolean;
  /** Show stylized sun @default true */
  showSun?: boolean;
  /** Cloud opacity @default 0.4 */
  cloudOpacity?: number;
  /** Cloud speed multiplier @default 0.3 */
  cloudSpeed?: number;
  /** Ambient light color @default '#fff5eb' */
  ambientLightColor?: string;
  /** Ambient light intensity @default 0.5 */
  ambientLightIntensity?: number;
  /** Key light color @default '#ffe4c4' */
  keyLightColor?: string;
  /** Key light intensity @default 0.8 */
  keyLightIntensity?: number;
  /** Constellation star size multiplier @default 0.4 */
  constellationStarSize?: number;
  /** Constellation line opacity @default 0.25 */
  constellationLineOpacity?: number;
  /** Sun size @default 8 */
  sunSize?: number;
  /** Sun intensity @default 1 */
  sunIntensity?: number;
  /** Show sun debug gizmo @default false */
  showSunGizmo?: boolean;
  /** Show constellation debug gizmos @default false */
  showConstellationGizmos?: boolean;
}

/**
 * Environment - Monument Valley inspired atmosphere
 *
 * Features:
 * - Gradient background via RefractionPipeline (shader-based clouds)
 * - Volumetric 3D clouds using drei Cloud component
 * - Warm three-point lighting for soft shadows
 * - Subtle fog for depth
 * - Optional distant stars
 */
export function Environment({
  enabled = true,
  showClouds = true,
  showStars = false,
  showConstellations = true,
  showConstellationLines = true,
  showSun = true,
  cloudOpacity = 0.4,
  cloudSpeed = 0.8,
  ambientLightColor = '#fff5eb',
  ambientLightIntensity = 0.5,
  keyLightColor = '#ffe4c4',
  keyLightIntensity = 0.8,
  constellationStarSize = 0.4,
  constellationLineOpacity = 0.25,
  sunSize = 8,
  sunIntensity = 1,
  showSunGizmo = false,
  showConstellationGizmos = false,
}: EnvironmentProps = {}) {
  const { scene } = useThree();
  const { isMobile, isTablet } = useViewport();

  // Reduce star count on mobile/tablet for better performance
  const starsCount = isMobile ? 150 : isTablet ? 300 : 500;

  // Clear any scene background - let BackgroundGradient handle it
  useEffect(() => {
    scene.background = null;
    // Disable fog - it washes out the gradient
    scene.fog = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  if (!enabled) return null;

  return (
    <group>
      {/* Animated gradient background - renders behind everything */}
      <BackgroundGradient />

      {/* Memoized cloud system - only initializes once, never re-renders from parent changes */}
      {/* Includes: top/middle/bottom layers, parallax depths, right-to-left looping */}
      {showClouds && <CloudSystem opacity={cloudOpacity} speed={cloudSpeed} enabled={true} />}

      {/* Subtle atmospheric details - users feel these more than see them */}
      {/* Floating dust motes with gentle sparkle */}
      <AmbientDust count={isMobile ? 40 : 80} opacity={0.12} size={0.012} enabled={true} />

      {/* Subtle diagonal light rays from upper right */}
      <SubtleLightRays opacity={0.03} enabled={!isMobile} />

      {/* Subtle distant stars - very faint for dreamy atmosphere */}
      {/* Count is responsive: 150 (mobile) / 300 (tablet) / 500 (desktop) */}
      {showStars && (
        <Stars
          radius={100}
          depth={50}
          count={starsCount}
          factor={2}
          saturation={0}
          fade
          speed={0.5}
        />
      )}

      {/* Real constellation stars with connecting lines */}
      {/* Positions based on actual star coordinates (RA/Dec) synchronized to UTC time */}
      {showConstellations && (
        <ConstellationStars
          showLines={showConstellationLines}
          starSize={constellationStarSize}
          lineOpacity={constellationLineOpacity}
          opacity={isMobile ? 0.6 : 0.8}
          showGizmo={showConstellationGizmos}
        />
      )}

      {/* Stylized sun - positioned based on real astronomical calculations */}
      {/* Warm gradient with rays, breathing-synchronized pulsing */}
      {showSun && <StylizedSun size={sunSize} intensity={sunIntensity} showGizmo={showSunGizmo} />}

      {/* Warm ambient light - fills shadows softly */}
      <ambientLight intensity={ambientLightIntensity} color={ambientLightColor} />

      {/* Key light - warm golden from upper right (sunrise/sunset feel) */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={keyLightIntensity}
        color={keyLightColor}
        castShadow={false}
      />

      {/* Fill light - cooler tone from left (sky bounce) */}
      <directionalLight position={[-8, 10, 3]} intensity={0.3} color="#e8f0ff" />

      {/* Rim light - subtle backlight for depth */}
      <directionalLight position={[0, 5, -10]} intensity={0.2} color="#ffd9c4" />

      {/* Subtle hemisphere light for natural sky/ground color blending */}
      <hemisphereLight args={['#ffe8d6', '#f5e6d3', 0.4]} />
    </group>
  );
}
