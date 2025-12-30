import { Cloud, Clouds, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

  // Add subtle fog to blend the horizon
  useEffect(() => {
    scene.fog = new THREE.Fog(0xfff5eb, 15, 60);
    scene.background = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Animate cloud drift
  useFrame((state) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = state.clock.elapsedTime * 0.01 * cloudSpeed;
    }
  });

  if (!enabled) return null;

  return (
    <group>
      {/* Note: Background gradient is rendered by RefractionPipeline shader */}

      {/* Volumetric 3D clouds - soft, dreamy formations */}
      {showClouds && (
        <Clouds ref={cloudsRef} material={THREE.MeshBasicMaterial}>
          {/* Main cloud bank - upper left */}
          <Cloud
            position={[-15, 12, -25]}
            opacity={cloudOpacity * 0.6}
            speed={cloudSpeed}
            segments={40}
            bounds={[12, 3, 8]}
            volume={8}
            color="#fff5eb"
            fade={30}
          />
          {/* Secondary cloud - upper right */}
          <Cloud
            position={[18, 14, -30]}
            opacity={cloudOpacity * 0.5}
            speed={cloudSpeed * 0.8}
            segments={35}
            bounds={[10, 2.5, 6]}
            volume={6}
            color="#ffe8d6"
            fade={25}
          />
          {/* Wispy cloud - center high */}
          <Cloud
            position={[0, 18, -35]}
            opacity={cloudOpacity * 0.3}
            speed={cloudSpeed * 1.2}
            segments={25}
            bounds={[8, 2, 5]}
            volume={4}
            color="#fff8f0"
            fade={20}
          />
          {/* Low horizon cloud - left */}
          <Cloud
            position={[-20, 5, -40]}
            opacity={cloudOpacity * 0.4}
            speed={cloudSpeed * 0.5}
            segments={30}
            bounds={[15, 2, 10]}
            volume={5}
            color="#ffecd9"
            fade={35}
          />
          {/* Low horizon cloud - right */}
          <Cloud
            position={[22, 6, -38]}
            opacity={cloudOpacity * 0.35}
            speed={cloudSpeed * 0.6}
            segments={28}
            bounds={[12, 1.5, 8]}
            volume={4}
            color="#fff0e0"
            fade={30}
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
