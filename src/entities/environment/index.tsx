import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { AmbientDust } from './AmbientDust';
import { BackgroundGradient } from './BackgroundGradient';
import { CloudSystem } from './CloudSystem';
import { EditorGrid } from './EditorGrid';
import { EtherealGround } from './EtherealGround';
import { SubtleLightRays } from './SubtleLightRays';

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

  // === Ethereal Ground System (depth perception) ===
  /**
   * Enable ethereal ground system for depth perception.
   * Adds subtle ground plane, mist, and shadows without losing ethereal aesthetic.
   * @default true
   */
  showEtherealGround?: boolean;
  /**
   * Y position of the ground plane.
   * Lower values push ground further down for more open feel.
   * @default -3.5
   */
  groundY?: number;
  /**
   * Ground plane radius in world units.
   * Larger values create more expansive sense of space.
   * @default 25
   */
  groundRadius?: number;
  /**
   * Ground plane opacity (very subtle).
   * Keep low (0.02-0.08) for ethereal feel.
   * @min 0 @max 0.2 @step 0.01
   * @default 0.04
   */
  groundOpacity?: number;
  /**
   * Ground plane color - should complement background gradient.
   * @default '#e8e4e0'
   */
  groundColor?: string;
  /**
   * Enable breath-synchronized mist rising from ground.
   * Mist is denser on exhale, rises gently.
   * @default true
   */
  showMist?: boolean;
  /**
   * Number of mist particles.
   * More particles = denser atmosphere.
   * @min 20 @max 150 @step 10
   * @default 60
   */
  mistCount?: number;
  /**
   * Mist particle opacity.
   * Keep subtle (0.05-0.2) to avoid overwhelming scene.
   * @min 0 @max 0.3 @step 0.02
   * @default 0.12
   */
  mistOpacity?: number;
  /**
   * Enable soft contact shadow beneath particle swarm.
   * Creates spatial grounding without hard edges.
   * @default true
   */
  showGroundShadow?: boolean;
  /**
   * Contact shadow radius.
   * Should roughly match particle swarm spread.
   * @min 2 @max 10 @step 0.5
   * @default 4
   */
  shadowRadius?: number;
  /**
   * Contact shadow opacity.
   * Keep subtle (0.05-0.15) for soft look.
   * @min 0 @max 0.2 @step 0.01
   * @default 0.08
   */
  shadowOpacity?: number;
  /**
   * Show subtle grid pattern on ground.
   * Only visible at certain angles for spatial reference.
   * @default false
   */
  showGroundGrid?: boolean;
  /**
   * Grid pattern opacity (very faint).
   * @min 0 @max 0.1 @step 0.005
   * @default 0.02
   */
  groundGridOpacity?: number;
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
  // Ethereal ground props
  showEtherealGround = true,
  groundY = -3.5,
  groundRadius = 25,
  groundOpacity = 0.04,
  groundColor = '#e8e4e0',
  showMist = true,
  mistCount = 60,
  mistOpacity = 0.12,
  showGroundShadow = true,
  shadowRadius = 4,
  shadowOpacity = 0.08,
  showGroundGrid = false,
  groundGridOpacity = 0.02,
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

      {/* Ethereal ground system for depth perception */}
      {/* Combines: subtle ground plane + breath-synced mist + contact shadow */}
      {showEtherealGround && (
        <EtherealGround
          enabled={true}
          groundY={groundY}
          groundRadius={groundRadius}
          groundOpacity={groundOpacity}
          groundColor={groundColor}
          showMist={showMist}
          mistCount={isMobile ? Math.floor(mistCount * 0.5) : mistCount}
          mistOpacity={mistOpacity}
          showShadow={showGroundShadow}
          shadowRadius={shadowRadius}
          shadowOpacity={shadowOpacity}
          showGrid={showGroundGrid}
          gridOpacity={groundGridOpacity}
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
