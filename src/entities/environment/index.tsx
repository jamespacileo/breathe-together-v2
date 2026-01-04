import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { AmbientDust } from './AmbientDust';
import { AtmosphericPerspective, HazeLayer } from './AtmosphericPerspective';
import { BackgroundGradient } from './BackgroundGradient';
import { CloudSystem } from './CloudSystem';
import { EditorGrid } from './EditorGrid';
import { GroundGlow } from './GroundGlow';
import { SubtleLightRays } from './SubtleLightRays';

export { AtmosphericPerspective, HazeLayer } from './AtmosphericPerspective';
export { GroundGlow } from './GroundGlow';
// Re-export depth components for use in breathing.tsx
export { ParallaxBackground } from './ParallaxBackground';

interface EnvironmentProps {
  enabled?: boolean;
  /** Show volumetric clouds @default true */
  showClouds?: boolean;
  /** Show distant stars @default true */
  showStars?: boolean;
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
  // === DEPTH ENHANCEMENT PROPS ===
  /** Show ground glow for spatial grounding @default true */
  showGroundGlow?: boolean;
  /** Ground glow opacity @default 0.15 */
  groundGlowOpacity?: number;
  /** Ground glow color @default '#f8e8d8' */
  groundGlowColor?: string;
  /** Show haze layers for atmospheric depth @default true */
  showHazeLayers?: boolean;
  /** Haze opacity @default 0.08 */
  hazeOpacity?: number;
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
  showStars = true,
  cloudOpacity = 0.4,
  cloudSpeed = 0.8,
  ambientLightColor = '#fff5eb',
  ambientLightIntensity = 0.5,
  keyLightColor = '#ffe4c4',
  keyLightIntensity = 0.8,
  stageMode = false,
  showGridFloor = true,
  gridSize = 20,
  gridDivisions = 20,
  gridColor = '#666666',
  // Depth enhancement defaults
  showGroundGlow = true,
  groundGlowOpacity = 0.15,
  groundGlowColor = '#f8e8d8',
  showHazeLayers = true,
  hazeOpacity = 0.08,
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
      // Disable fog in stage mode for clarity
      scene.fog = null;
    } else {
      // Normal mode: let BackgroundGradient handle it
      scene.background = null;
      // Fog is managed by AtmosphericPerspective component when enabled
    }

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

  // Normal mode: full Monument Valley atmosphere with depth enhancement
  return (
    <group>
      {/* Animated gradient background - renders behind everything */}
      <BackgroundGradient />

      {/* === DEPTH ZONE 1: Far background haze layers === */}
      {/* Creates atmospheric depth through visible haze planes at distance */}
      {showHazeLayers && !isMobile && <HazeLayer opacity={hazeOpacity} enabled={true} />}

      {/* === DEPTH ZONE 2: Mid-distance clouds === */}
      {/* Memoized cloud system - rotates with scene (inside MomentumControls) */}
      {showClouds && <CloudSystem opacity={cloudOpacity} speed={cloudSpeed} enabled={true} />}

      {/* Subtle atmospheric details - users feel these more than see them */}
      {/* Floating dust motes with gentle sparkle */}
      <AmbientDust count={isMobile ? 40 : 80} opacity={0.12} size={0.012} enabled={true} />

      {/* Subtle diagonal light rays from upper right */}
      <SubtleLightRays opacity={0.03} enabled={!isMobile} />

      {/* === DEPTH ZONE 3: Ground plane reference === */}
      {/* Soft radial glow beneath the globe for spatial grounding */}
      {showGroundGlow && (
        <GroundGlow
          opacity={groundGlowOpacity}
          color={groundGlowColor}
          radius={12}
          yPosition={-4}
          breathSync={true}
        />
      )}

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
