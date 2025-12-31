import { Cloud, Clouds, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BackgroundGradient } from './BackgroundGradient';

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
  cloudSpeed = 0.3,
}: EnvironmentProps = {}) {
  const { scene } = useThree();
  const cloudsRef = useRef<THREE.Group>(null);

  // Clear any scene background - let BackgroundGradient handle it
  useEffect(() => {
    scene.background = null;
    // Disable fog - it washes out the gradient
    scene.fog = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Animate cloud drift - synchronized with breathing
  // Clouds drift faster during exhale (releasing), slower during hold (stillness)
  useFrame((state) => {
    if (cloudsRef.current) {
      // Calculate breath-synchronized speed multiplier
      const now = Date.now() / 1000;
      const cycleTime = now % 19; // 19-second cycle (4+7+8+0)

      // Speed varies: 0.85x during hold (stillness), 1.15x during exhale (release)
      let speedMultiplier: number;
      if (cycleTime < 4) {
        // Inhale: normal speed (1.0)
        speedMultiplier = 1.0;
      } else if (cycleTime < 11) {
        // Hold-in: slow down (0.85x) - stillness
        speedMultiplier = 0.85;
      } else {
        // Exhale: speed up slightly (1.15x) - releasing
        speedMultiplier = 1.15;
      }

      // Apply breathing-modulated rotation
      cloudsRef.current.rotation.y = state.clock.elapsedTime * 0.01 * cloudSpeed * speedMultiplier;
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
      <ambientLight intensity={0.5} color="#fff5eb" />

      {/* Key light - warm golden from upper right (sunrise/sunset feel) */}
      <directionalLight position={[10, 15, 5]} intensity={0.8} color="#ffe4c4" castShadow={false} />

      {/* Fill light - cooler tone from left (sky bounce) */}
      <directionalLight position={[-8, 10, 3]} intensity={0.3} color="#e8f0ff" />

      {/* Rim light - subtle backlight for depth */}
      <directionalLight position={[0, 5, -10]} intensity={0.2} color="#ffd9c4" />

      {/* Subtle hemisphere light for natural sky/ground color blending */}
      <hemisphereLight args={['#ffe8d6', '#f5e6d3', 0.4]} />
    </group>
  );
}
