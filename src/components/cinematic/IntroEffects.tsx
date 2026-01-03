import { Float, Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';

interface IntroEffectsProps {
  /** Whether intro effects should be visible */
  visible?: boolean;
}

/**
 * IntroEffects - Beautiful drei effects for the main menu screen.
 *
 * Creates an ethereal, dreamy atmosphere with:
 * - Floating golden sparkles
 * - Gentle floating orbs
 * - Subtle ambient particles
 */
export function IntroEffects({ visible = true }: IntroEffectsProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Gentle rotation for sparkles
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {/* Primary sparkles - warm golden, concentrated around center */}
      <Sparkles
        count={80}
        scale={12}
        size={3}
        speed={0.3}
        opacity={0.5}
        color="#c9a06c"
        noise={1}
      />

      {/* Secondary sparkles - cooler tone, more spread out */}
      <Sparkles
        count={40}
        scale={18}
        size={2}
        speed={0.2}
        opacity={0.3}
        color="#d4b896"
        noise={1.5}
      />

      {/* Floating orbs - subtle ethereal elements */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh position={[-6, 3, -8]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#c9a06c" transparent opacity={0.4} />
        </mesh>
      </Float>

      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh position={[7, -2, -10]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#d4b896" transparent opacity={0.35} />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.15} floatIntensity={0.6}>
        <mesh position={[-5, -3, -6]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#e8d4b8" transparent opacity={0.3} />
        </mesh>
      </Float>

      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
        <mesh position={[4, 4, -12]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color="#c9a06c" transparent opacity={0.25} />
        </mesh>
      </Float>

      {/* Distant sparkles - creates depth */}
      <Sparkles
        count={30}
        scale={25}
        size={1.5}
        speed={0.1}
        opacity={0.2}
        color="#f5e6d3"
        noise={2}
      />
    </group>
  );
}

export default IntroEffects;
