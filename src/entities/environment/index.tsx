import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { AmbientDust } from './AmbientDust';
import { BackgroundGradient } from './BackgroundGradient';
import { CloudSystem } from './CloudSystem';
import { EditorGrid } from './EditorGrid';
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
}: EnvironmentProps = {}) {
  const { scene, gl } = useThree();
  const { isMobile, isTablet } = useViewport();

  // Reduce star count on mobile/tablet for better performance
  const starsCount = isMobile ? 150 : isTablet ? 300 : 500;

  // Handle background based on stage mode
  useEffect(() => {
    if (stageMode) {
      // Stage mode: dark gray background like 3D editors
      scene.background = new THREE.Color('#1a1a1a');
      // Also set clear color for consistency
      gl.setClearColor('#1a1a1a', 1);
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

  // Stage mode: minimal environment with grid floor
  if (stageMode) {
    return (
      <group>
        {/* Wireframe grid floor */}
        {showGridFloor && (
          <EditorGrid size={gridSize} divisions={gridDivisions} color={gridColor} showAxes={true} />
        )}

        {/* Neutral white ambient light for even illumination */}
        <ambientLight intensity={0.6} color="#ffffff" />

        {/* Key light - white directional from upper right */}
        <directionalLight
          position={[10, 15, 5]}
          intensity={0.8}
          color="#ffffff"
          castShadow={false}
        />

        {/* Fill light - from left for balanced shadows */}
        <directionalLight position={[-8, 10, 3]} intensity={0.4} color="#ffffff" />
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
