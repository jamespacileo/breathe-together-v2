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
// Color helpers for breathing-synced dynamic lighting
const inhaleKeyColor = new THREE.Color('#ffe4c4'); // Warm golden
const exhaleKeyColor = new THREE.Color('#ffd0a0'); // Warmer/deeper golden
const inhaleAmbientColor = new THREE.Color('#fff5eb'); // Bright warm
const exhaleAmbientColor = new THREE.Color('#fff0e0'); // Softer warm

export function Environment({
  enabled = true,
  showClouds = true,
  showStars = true,
  cloudOpacity = 0.4,
  cloudSpeed = 0.3,
}: EnvironmentProps = {}) {
  const { scene } = useThree();
  const world = useWorld();
  const cloudsRef = useRef<THREE.Group>(null);

  // Refs for dynamic lighting
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  // Clear any scene background - let BackgroundGradient handle it
  useEffect(() => {
    scene.background = null;
    // Disable fog - it washes out the gradient
    scene.fog = null;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Animate cloud drift AND dynamic lighting
  useFrame((state) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = state.clock.elapsedTime * 0.01 * cloudSpeed;
    }

    // Get breathing phase for dynamic lighting
    let phase = 0;
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        phase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore stale world errors during Triplex hot-reload
    }

    // === DYNAMIC LIGHTING ===
    // Inhale (phase → 1): Brighter, cooler lighting (alertness, energy)
    // Exhale (phase → 0): Warmer, softer lighting (relaxation, calm)

    if (keyLightRef.current) {
      // Key light: Intensity pulses with breathing (brighter on inhale)
      keyLightRef.current.intensity = 0.7 + phase * 0.25;
      // Color shifts from warm (exhale) to golden (inhale)
      keyLightRef.current.color.lerpColors(exhaleKeyColor, inhaleKeyColor, phase);
    }

    if (ambientLightRef.current) {
      // Ambient: Slightly brighter on inhale
      ambientLightRef.current.intensity = 0.45 + phase * 0.15;
      ambientLightRef.current.color.lerpColors(exhaleAmbientColor, inhaleAmbientColor, phase);
    }

    if (fillLightRef.current) {
      // Fill light: Cooler on inhale, warmer on exhale
      fillLightRef.current.intensity = 0.25 + phase * 0.1;
    }

    if (rimLightRef.current) {
      // Rim light: Subtle pulse for depth
      rimLightRef.current.intensity = 0.15 + phase * 0.1;
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

      {/* === DYNAMIC LIGHTS (refs for breathing sync) === */}

      {/* Warm ambient light - fills shadows softly */}
      <ambientLight ref={ambientLightRef} intensity={0.5} color="#fff5eb" />

      {/* Key light - warm golden from upper right (sunrise/sunset feel) */}
      <directionalLight
        ref={keyLightRef}
        position={[10, 15, 5]}
        intensity={0.8}
        color="#ffe4c4"
        castShadow={false}
      />

      {/* Fill light - cooler tone from left (sky bounce) */}
      <directionalLight ref={fillLightRef} position={[-8, 10, 3]} intensity={0.3} color="#e8f0ff" />

      {/* Rim light - subtle backlight for depth */}
      <directionalLight ref={rimLightRef} position={[0, 5, -10]} intensity={0.2} color="#ffd9c4" />

      {/* Subtle hemisphere light for natural sky/ground color blending */}
      <hemisphereLight args={['#ffe8d6', '#f5e6d3', 0.4]} />
    </group>
  );
}
