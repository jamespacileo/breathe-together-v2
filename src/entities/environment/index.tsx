import { Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { breathPhase, phaseType } from '../breath/traits';
import { AmbientDust } from './AmbientDust';
import { BackgroundGradient } from './BackgroundGradient';
import { CloudSystem } from './CloudSystem';
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
}

/**
 * Environment - Monument Valley inspired atmosphere
 *
 * Features:
 * - Gradient background via RefractionPipeline (shader-based clouds)
 * - Volumetric 3D clouds using drei Cloud component
 * - Warm three-point lighting for soft shadows
 * - Breathing-synchronized ambient light (brighter/warmer on inhale)
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
}: EnvironmentProps = {}) {
  const { scene } = useThree();
  const { isMobile, isTablet } = useViewport();
  const world = useWorld();

  // Light refs for breathing animation
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);

  // Color objects for smooth transitions (pre-allocated)
  const warmColor = useRef(new THREE.Color('#fff8f0')); // Warmer on inhale
  const coolColor = useRef(new THREE.Color('#f0f4ff')); // Cooler on exhale
  const currentAmbientColor = useRef(new THREE.Color(ambientLightColor));

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

  // Breathing-synchronized light animation
  useFrame(() => {
    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      if (!breathEntity) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;

      // === AMBIENT LIGHT BREATHING ===
      // Intensity: brighter on inhale (0.5 → 0.65), dimmer on exhale
      // Color: warmer on inhale, slightly cooler on exhale
      if (ambientLightRef.current) {
        const breathIntensityBoost = phase * 0.15;
        ambientLightRef.current.intensity = ambientLightIntensity + breathIntensityBoost;

        // Lerp color toward warm on inhale, cool on exhale
        currentAmbientColor.current.lerp(phase > 0.5 ? warmColor.current : coolColor.current, 0.02);
        ambientLightRef.current.color.copy(currentAmbientColor.current);
      }

      // === KEY LIGHT BREATHING ===
      // Intensity boost on inhale for more dramatic highlights
      if (keyLightRef.current) {
        const keyBreathIntensity = keyLightIntensity + phase * 0.2;
        keyLightRef.current.intensity = keyBreathIntensity;
      }

      // === FILL LIGHT BREATHING ===
      // Subtle intensity change for balanced fill
      if (fillLightRef.current) {
        fillLightRef.current.intensity = 0.3 + phase * 0.1;
      }

      // === HEMISPHERE LIGHT BREATHING ===
      // Ground color gets warmer on inhale
      if (hemisphereLightRef.current) {
        hemisphereLightRef.current.intensity = 0.4 + phase * 0.1;
      }
    } catch {
      // Silently catch ECS errors during unmount/remount in Triplex
    }
  });

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

      {/* Warm ambient light - fills shadows softly, breathes with intensity/color */}
      <ambientLight
        ref={ambientLightRef}
        intensity={ambientLightIntensity}
        color={ambientLightColor}
      />

      {/* Key light - warm golden from upper right (sunrise/sunset feel), breathes */}
      <directionalLight
        ref={keyLightRef}
        position={[10, 15, 5]}
        intensity={keyLightIntensity}
        color={keyLightColor}
        castShadow={false}
      />

      {/* Fill light - cooler tone from left (sky bounce), breathes */}
      <directionalLight ref={fillLightRef} position={[-8, 10, 3]} intensity={0.3} color="#e8f0ff" />

      {/* Rim light - subtle backlight for depth */}
      <directionalLight position={[0, 5, -10]} intensity={0.2} color="#ffd9c4" />

      {/* Subtle hemisphere light for natural sky/ground color blending, breathes */}
      <hemisphereLight ref={hemisphereLightRef} args={['#ffe8d6', '#f5e6d3', 0.4]} />
    </group>
  );
}
