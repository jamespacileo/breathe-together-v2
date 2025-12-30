import { Cloud, Clouds, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';
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
  /** Enable breathing synchronization for atmosphere @default true */
  breathingSyncEnabled?: boolean;
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
  breathingSyncEnabled = true,
}: EnvironmentProps = {}) {
  const { scene } = useThree();
  const world = useWorld();
  const cloudsRef = useRef<THREE.Group>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const nearCloudsRef = useRef<THREE.Group>(null);

  // Store base positions for near clouds to animate from
  const nearCloudBasePositions = useRef([
    { x: -4, y: 2, z: -8 },
    { x: 5, y: 3, z: -10 },
    { x: 0, y: -1, z: -7 },
  ]);

  // Clear any scene background - let BackgroundGradient handle it
  useEffect(() => {
    scene.background = null;
    // Disable fog - it washes out the gradient
    scene.fog = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Get current breath phase for synchronization
  const getBreathPhase = (): number => {
    if (!breathingSyncEnabled) return 0.5;
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      return breathEntity?.get?.(breathPhase)?.value ?? 0.5;
    } catch {
      return 0.5;
    }
  };

  // Animate clouds, lights, and atmosphere with breathing sync
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const phase = getBreathPhase();

    // Distant clouds - slow rotation with slight breathing influence
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = t * 0.01 * cloudSpeed;
      // Subtle vertical drift with breathing
      cloudsRef.current.position.y = Math.sin(t * 0.05) * 0.5 + phase * 0.3;
    }

    // Near clouds - individual drift patterns + breathing opacity
    if (nearCloudsRef.current) {
      const children = nearCloudsRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const cloud = children[i];
        const base = nearCloudBasePositions.current[i];
        if (base) {
          // Each cloud drifts in a unique pattern
          cloud.position.x = base.x + Math.sin(t * 0.03 + i * 2) * 1.5;
          cloud.position.y = base.y + Math.cos(t * 0.02 + i) * 0.8 + phase * 0.5;
          cloud.position.z = base.z + Math.sin(t * 0.015 + i * 3) * 0.5;
        }
      }
    }

    // Ambient light breathing - subtle intensity pulse
    if (ambientRef.current && breathingSyncEnabled) {
      // Range: 0.45 (exhale) to 0.55 (inhale) - very subtle
      ambientRef.current.intensity = 0.45 + phase * 0.1;
    }
  });

  if (!enabled) return null;

  return (
    <group>
      {/* Animated gradient background - renders behind everything */}
      <BackgroundGradient breathingSyncEnabled={breathingSyncEnabled} />

      {/* Near cloud wisps - close to the globe for intimacy */}
      {showClouds && (
        <group ref={nearCloudsRef}>
          <Clouds material={THREE.MeshBasicMaterial}>
            {/* Wispy cloud - left of globe */}
            <Cloud
              position={[-4, 2, -8]}
              opacity={cloudOpacity * 0.25}
              speed={cloudSpeed * 0.8}
              segments={12}
              bounds={[3, 1, 2]}
              volume={2}
              color="#f5ebe0"
              fade={15}
            />
            {/* Wispy cloud - right of globe */}
            <Cloud
              position={[5, 3, -10]}
              opacity={cloudOpacity * 0.2}
              speed={cloudSpeed * 0.6}
              segments={10}
              bounds={[2.5, 0.8, 1.5]}
              volume={1.5}
              color="#e8e0d8"
              fade={12}
            />
            {/* Wispy cloud - below globe */}
            <Cloud
              position={[0, -1, -7]}
              opacity={cloudOpacity * 0.18}
              speed={cloudSpeed * 0.5}
              segments={8}
              bounds={[2, 0.6, 1]}
              volume={1}
              color="#f0e8e0"
              fade={10}
            />
          </Clouds>
        </group>
      )}

      {/* Distant volumetric 3D clouds - pastel colored wisps */}
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

      {/* Warm ambient light - fills shadows softly, breathing-synchronized */}
      <ambientLight ref={ambientRef} intensity={0.5} color="#fff5eb" />

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
