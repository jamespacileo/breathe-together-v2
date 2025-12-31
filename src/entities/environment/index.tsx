import { Cloud, Clouds, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BackgroundGradient } from './BackgroundGradient';

/**
 * Master Craftsman: Equinox awareness - time-of-day color grading
 *
 * Scene color temperature shifts based on UTC hour:
 * - Dawn (5-8): Peachy pink warmth
 * - Day (9-16): Neutral warm white
 * - Dusk (17-20): Golden orange
 * - Night (21-4): Cool lavender
 *
 * Users never consciously see this, but morning sessions "feel" like morning.
 */
function getTimeOfDayColorGrade(): { warmth: number; tint: THREE.Color } {
  const hour = new Date().getUTCHours();

  // Smooth transitions using sine wave
  if (hour >= 5 && hour < 8) {
    // Dawn: peachy pink
    const progress = (hour - 5) / 3;
    return {
      warmth: 0.02 + Math.sin(progress * Math.PI) * 0.015,
      tint: new THREE.Color('#fff0e6'),
    };
  }
  if (hour >= 17 && hour < 20) {
    // Dusk: golden orange
    const progress = (hour - 17) / 3;
    return {
      warmth: 0.02 + Math.sin(progress * Math.PI) * 0.02,
      tint: new THREE.Color('#ffe8d0'),
    };
  }
  if (hour >= 21 || hour < 5) {
    // Night: cool lavender
    return {
      warmth: -0.01, // Slightly cooler
      tint: new THREE.Color('#f0e8ff'),
    };
  }
  // Day: neutral warm
  return {
    warmth: 0.01,
    tint: new THREE.Color('#fff8f0'),
  };
}

/**
 * Master Craftsman: Presence warmth
 *
 * When more users are breathing together, the scene feels warmer.
 * Like a crowded room vs empty space.
 */
function calculatePresenceWarmth(userCount: number): number {
  // Normalize to 0-1 range (100+ users = max warmth)
  const normalizedCount = Math.min(userCount / 100, 1);
  // Subtle warmth addition: 0-2% extra warmth
  return normalizedCount * 0.02;
}

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
  /** Current user count for presence warmth @default 0 */
  userCount?: number;
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
 *
 * Master Craftsman additions:
 * - Presence warmth: Scene warms when more users are breathing together
 * - Equinox awareness: Time-of-day color grading (dawn/day/dusk/night)
 * - Atmospheric parallax: Clouds respond to subtle camera drift for depth
 */
export function Environment({
  enabled = true,
  showClouds = true,
  showStars = true,
  cloudOpacity = 0.4,
  cloudSpeed = 0.3,
  userCount = 0,
}: EnvironmentProps = {}) {
  const { scene } = useThree();
  const cloudsRef = useRef<THREE.Group>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);

  // Master Craftsman: Calculate time-of-day and presence-based color grading
  const timeGrade = useMemo(() => getTimeOfDayColorGrade(), []);
  const presenceWarmth = useMemo(() => calculatePresenceWarmth(userCount), [userCount]);

  // Combined warmth effect
  const totalWarmth = timeGrade.warmth + presenceWarmth;

  // Clear any scene background - let BackgroundGradient handle it
  useEffect(() => {
    scene.background = null;
    // Disable fog - it washes out the gradient
    scene.fog = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Animate cloud drift + atmospheric parallax + presence warmth
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Cloud rotation (existing)
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = time * 0.01 * cloudSpeed;

      // Master Craftsman: Atmospheric parallax
      // Subtle camera drift creates different parallax for each cloud layer
      const parallaxX = Math.sin(time * 0.05) * 0.3;
      const parallaxY = Math.cos(time * 0.07) * 0.15;

      // Apply parallax to cloud group (affects all children)
      cloudsRef.current.position.x = parallaxX;
      cloudsRef.current.position.y = parallaxY;
    }

    // Master Craftsman: Update ambient light with presence warmth
    if (ambientLightRef.current) {
      // Base warm color + presence warmth shift
      const baseColor = new THREE.Color('#fff5eb');
      baseColor.r = Math.min(1, baseColor.r + totalWarmth);
      baseColor.g = Math.min(1, baseColor.g + totalWarmth * 0.3);
      ambientLightRef.current.color.copy(baseColor);
    }

    // Master Craftsman: Update key light with time-of-day tint
    if (keyLightRef.current) {
      const baseKeyColor = new THREE.Color('#ffe4c4');
      baseKeyColor.lerp(timeGrade.tint, 0.15); // Subtle blend with time tint
      keyLightRef.current.color.copy(baseKeyColor);
    }
  });

  if (!enabled) return null;

  return (
    <group>
      {/* Animated gradient background - renders behind everything */}
      <BackgroundGradient />

      {/* Volumetric 3D clouds - pastel colored wisps */}
      {showClouds && (
        <Clouds ref={cloudsRef} material={THREE.MeshBasicMaterial}>
          {/* Soft pink cloud - upper left */}
          <Cloud
            position={[-15, 12, -25]}
            opacity={cloudOpacity * 0.5}
            speed={cloudSpeed}
            segments={30}
            bounds={[12, 3, 8]}
            volume={6}
            color="#f8b4c4"
            fade={40}
          />
          {/* Soft lavender cloud - upper right */}
          <Cloud
            position={[18, 14, -30]}
            opacity={cloudOpacity * 0.45}
            speed={cloudSpeed * 0.8}
            segments={25}
            bounds={[10, 2.5, 6]}
            volume={5}
            color="#c4b8e8"
            fade={35}
          />
          {/* Soft sky blue cloud - center high */}
          <Cloud
            position={[0, 20, -40]}
            opacity={cloudOpacity * 0.4}
            speed={cloudSpeed * 1.2}
            segments={20}
            bounds={[8, 2, 5]}
            volume={4}
            color="#a8d4e8"
            fade={30}
          />
          {/* Soft peach cloud - left horizon */}
          <Cloud
            position={[-20, 5, -45]}
            opacity={cloudOpacity * 0.4}
            speed={cloudSpeed * 0.5}
            segments={25}
            bounds={[15, 2, 10]}
            volume={4}
            color="#f8d0a8"
            fade={45}
          />
          {/* Soft mint cloud - right horizon */}
          <Cloud
            position={[22, 6, -42]}
            opacity={cloudOpacity * 0.35}
            speed={cloudSpeed * 0.6}
            segments={22}
            bounds={[12, 1.5, 8]}
            volume={3}
            color="#b8e8d4"
            fade={40}
          />
        </Clouds>
      )}

      {/* Subtle distant stars - very faint for dreamy atmosphere */}
      {showStars && (
        <Stars radius={100} depth={50} count={500} factor={2} saturation={0} fade speed={0.5} />
      )}

      {/* Warm ambient light - fills shadows softly */}
      {/* Master Craftsman: ref for presence warmth updates */}
      <ambientLight ref={ambientLightRef} intensity={0.5} color="#fff5eb" />

      {/* Key light - warm golden from upper right (sunrise/sunset feel) */}
      {/* Master Craftsman: ref for time-of-day color grading */}
      <directionalLight
        ref={keyLightRef}
        position={[10, 15, 5]}
        intensity={0.8}
        color="#ffe4c4"
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
