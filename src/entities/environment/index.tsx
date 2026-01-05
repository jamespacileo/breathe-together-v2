import { Environment as DreiEnvironment, Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { AmbientDust } from './AmbientDust';
import { BackgroundGradient } from './BackgroundGradient';
import { BreathSparkles } from './BreathSparkles';
import { CloudSystem } from './CloudSystem';
import { ConstellationStars } from './ConstellationStars';
import { DepthLayers } from './DepthLayers';
import { EditorGrid } from './EditorGrid';
import { HorizonPlane } from './HorizonPlane';
import { ReflectiveFloor } from './ReflectiveFloor';
import { Skydome } from './Skydome';
import { StylizedSun } from './StylizedSun';
import { SubtleLightRays } from './SubtleLightRays';

/**
 * HDRI file path for environment lighting
 * Uses Belfast Sunset from Poly Haven - warm pastel sunset that matches Monument Valley aesthetic
 * Self-hosted to avoid CDN reliability issues in production
 *
 * @see https://polyhaven.com/a/belfast_sunset
 */
const HDRI_PATH = '/hdri/belfast_sunset_1k.hdr';

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
  /** Stage mode - editor-style view with grid floor @default false */
  stageMode?: boolean;
  /** Show grid floor in stage mode @default true */
  showGridFloor?: boolean;
  /** Grid size in world units @default 20 */
  gridSize?: number;
  /** Number of grid divisions @default 20 */
  gridDivisions?: number;
  /** Grid line color @default '#666666' */
  gridColor?: string;
  /**
   * Enable HDRI environment lighting for enhanced reflections
   * Uses Belfast Sunset HDRI for warm, pastel lighting that matches Monument Valley aesthetic
   * Adds realistic reflections to PBR materials without changing the visual style
   * @default true
   */
  enableHDRI?: boolean;
  /**
   * HDRI environment intensity multiplier
   * Controls how much the HDRI affects scene lighting and reflections
   * @default 0.3
   * @min 0
   * @max 1
   */
  hdriIntensity?: number;
  /**
   * Blur amount for HDRI background (if used as background)
   * 0 = sharp, 1 = fully blurred
   * Only applies when useHDRIBackground is true
   * @default 0.5
   */
  hdriBlur?: number;
  /**
   * Use HDRI as scene background instead of gradient
   * Creates a more realistic environment but loses the custom gradient
   * @default false
   */
  useHDRIBackground?: boolean;
  /**
   * Enable reflective floor for subtle reflections
   * Adds depth and spatial awareness with soft reflections of scene
   * @default false
   */
  showReflectiveFloor?: boolean;
  /**
   * Reflective floor color (matches background for seamless integration)
   * @default '#f5f1e8'
   */
  reflectiveFloorColor?: string;
  /**
   * Reflection strength (0 = no reflection, 1 = full mirror)
   * @default 0.3
   */
  reflectionMixStrength?: number;
  /**
   * Show breath-synchronized sparkles during exhale phase
   * Visual feedback for "releasing breath" moment
   * @default false
   */
  showBreathSparkles?: boolean;
  /**
   * Breath sparkles count
   * @default 20
   */
  breathSparklesCount?: number;
  /**
   * Show depth layers for 3D depth perception (distant nebulae, haze bands)
   * Creates sense of vast space behind the globe
   * @default true
   */
  showDepthLayers?: boolean;
  /**
   * Depth layer nebula opacity (distant cosmic clouds)
   * @default 0.15
   */
  depthNebulaOpacity?: number;
  /**
   * Depth layer haze opacity (atmospheric bands)
   * @default 0.08
   */
  depthHazeOpacity?: number;
  /**
   * Show horizon plane (subtle ground reference)
   * @default true
   */
  showHorizonPlane?: boolean;
  /**
   * Horizon plane vertical position
   * @default -3
   */
  horizonPlaneHeight?: number;
  /**
   * Show skydome (gradient sky sphere)
   * @default true
   */
  showSkydome?: boolean;
  /**
   * Skydome cloud density (0-1)
   * @default 0.15
   */
  skydomeCloudDensity?: number;
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
  stageMode = false,
  showGridFloor = true,
  gridSize = 20,
  gridDivisions = 20,
  gridColor = '#666666',
  enableHDRI = true,
  hdriIntensity = 0.3,
  hdriBlur = 0.5,
  useHDRIBackground = false,
  showReflectiveFloor = false,
  reflectiveFloorColor = '#f5f1e8',
  reflectionMixStrength = 0.3,
  showBreathSparkles = false,
  breathSparklesCount = 20,
  showDepthLayers = true,
  depthNebulaOpacity = 0.15,
  depthHazeOpacity = 0.08,
  showHorizonPlane = true,
  horizonPlaneHeight = -3,
  showSkydome = true,
  skydomeCloudDensity = 0.15,
}: EnvironmentProps = {}) {
  const { scene, gl } = useThree();
  const { isMobile, isTablet } = useViewport();

  // Reduce star count on mobile/tablet for better performance
  const starsCount = isMobile ? 150 : isTablet ? 300 : 500;

  // Handle background based on stage mode
  useEffect(() => {
    if (stageMode) {
      // Stage mode: soft warm white - like a photography studio
      const studioWhite = new THREE.Color('#f8f6f3');
      scene.background = studioWhite;
      gl.setClearColor(studioWhite, 1);
    } else {
      // Normal mode: let BackgroundGradient handle it
      scene.background = null;
    }
    // Disable fog - it washes out the gradient
    scene.fog = null;

    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, gl, stageMode]);

  if (!enabled) return null;

  // Stage mode: minimal, elegant studio environment
  // Design: "Felt but not seen" - spatial reference without distraction
  if (stageMode) {
    return (
      <group>
        {/* Studio floor - sparse grid + soft radial shadow + axis crosshair */}
        {/* Shadow is built into the floor component - no z-fighting */}
        {showGridFloor && (
          <EditorGrid size={gridSize} divisions={gridDivisions} color={gridColor} showAxes={true} />
        )}

        {/* Studio lighting - soft, even, flattering */}
        {/* Key light - warm white from upper front-right */}
        <directionalLight
          position={[8, 12, 8]}
          intensity={0.85}
          color="#fff8f0"
          castShadow={false}
        />

        {/* Fill light - cooler tone from left */}
        <directionalLight position={[-10, 8, 4]} intensity={0.45} color="#f0f4ff" />

        {/* Rim light - subtle warmth for depth */}
        <directionalLight position={[0, 6, -10]} intensity={0.25} color="#ffe8d6" />

        {/* Ambient - soft overall fill */}
        <ambientLight intensity={0.5} color="#fefcfa" />

        {/* Hemisphere - natural sky/ground blending */}
        <hemisphereLight args={['#faf8f5', '#e8e4e0', 0.3]} />
      </group>
    );
  }

  // Normal mode: full Monument Valley atmosphere
  return (
    <group>
      {/* Skydome - large gradient sphere for infinite sky illusion */}
      {/* Renders first (behind everything) */}
      {showSkydome && !isMobile && (
        <Skydome
          zenithColor="#e8e4f0"
          horizonColor="#f8f0e8"
          nadirColor="#f0e8e0"
          cloudDensity={skydomeCloudDensity}
          cloudSpeed={0.01}
        />
      )}

      {/* HDRI Environment - provides realistic reflections for PBR materials */}
      {/* Uses self-hosted Belfast Sunset HDRI for warm, pastel lighting */}
      {/* Does NOT replace the gradient background unless useHDRIBackground is true */}
      {enableHDRI && (
        <DreiEnvironment
          files={HDRI_PATH}
          background={useHDRIBackground}
          backgroundBlurriness={hdriBlur}
          environmentIntensity={hdriIntensity}
        />
      )}

      {/* Animated gradient background - renders behind everything */}
      {/* Only shown when not using HDRI as background and no skydome */}
      {!useHDRIBackground && !showSkydome && <BackgroundGradient />}
      {/* If skydome is enabled but on mobile, still show the gradient */}
      {!useHDRIBackground && showSkydome && isMobile && <BackgroundGradient />}

      {/* Memoized cloud system - only initializes once, never re-renders from parent changes */}
      {/* Includes: top/middle/bottom layers, parallax depths, right-to-left looping */}
      {showClouds && <CloudSystem opacity={cloudOpacity} speed={cloudSpeed} enabled={true} />}

      {/* Subtle atmospheric details - users feel these more than see them */}
      {/* Floating dust motes with gentle sparkle */}
      <AmbientDust count={isMobile ? 40 : 80} opacity={0.12} size={0.012} enabled={true} />

      {/* Breath-synchronized sparkles during exhale phase */}
      {/* Visual feedback for "releasing breath" moment */}
      {showBreathSparkles && <BreathSparkles count={breathSparklesCount} />}

      {/* Depth layers - distant nebulae and haze bands for 3D depth perception */}
      {/* Disabled on mobile for performance */}
      {showDepthLayers && !isMobile && (
        <DepthLayers
          enabled={true}
          nebulaOpacity={depthNebulaOpacity}
          hazeOpacity={depthHazeOpacity}
        />
      )}

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

      {/* Horizon plane - subtle ground reference with fade to horizon */}
      {/* Disabled on mobile for performance */}
      {showHorizonPlane && !isMobile && (
        <HorizonPlane height={horizonPlaneHeight} gridOpacity={0.12} fadeStart={10} fadeEnd={80} />
      )}

      {/* Reflective floor - subtle reflections for enhanced depth */}
      {/* Disabled on mobile for performance */}
      {showReflectiveFloor && !isMobile && (
        <ReflectiveFloor
          color={reflectiveFloorColor}
          mixStrength={reflectionMixStrength}
          resolution={isTablet ? 256 : 512}
        />
      )}
    </group>
  );
}
