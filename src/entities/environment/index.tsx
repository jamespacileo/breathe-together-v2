/**
 * Environment - Simple calming meditation environment with gradient background and clouds.
 * Provides a serene blue-violet gradient with slowly drifting clouds and soft lighting.
 */

import { Cloud } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface EnvironmentProps {
  /**
   * Enable/disable environment rendering.
   *
   * @group "Configuration"
   * @default true
   */
  enabled?: boolean;
}

/**
 * Environment component - renders calming gradient background with clouds and lighting.
 *
 * Features:
 * - Static gradient background (dark blue → violet)
 * - Slowly drifting clouds for subtle animation
 * - Simple three-light setup for optimal sphere + particle visibility
 */
export function Environment({ enabled = true }: EnvironmentProps = {}) {
  const gradientMesh = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Group>(null);

  // Create gradient colors
  const gradientMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;

    // biome-ignore lint/style/noNonNullAssertion: Canvas is freshly created, getContext('2d') is guaranteed to return CanvasRenderingContext2D on valid canvases
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

    // Dark blue → Violet gradient
    gradient.addColorStop(0, '#3d2b52'); // Top: violet
    gradient.addColorStop(1, '#1a1f3a'); // Bottom: dark blue

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({ map: texture });
  }, []);

  // Cleanup Three.js material and texture on unmount
  useEffect(() => {
    return () => {
      if (gradientMaterial.map) {
        gradientMaterial.map.dispose();
      }
      gradientMaterial.dispose();
    };
  }, [gradientMaterial]);

  // Animate cloud drift
  useFrame(({ clock }) => {
    if (cloudRef.current) {
      cloudRef.current.position.x = Math.sin(clock.elapsedTime * 0.1) * 2;
      cloudRef.current.position.z = Math.cos(clock.elapsedTime * 0.08) * 3;
    }
  });

  if (!enabled) return null;

  return (
    <>
      {/* Gradient background plane */}
      <mesh ref={gradientMesh} position={[0, 0, -100]} scale={100}>
        <planeGeometry args={[1, 1]} />
        <primitive object={gradientMaterial} attach="material" />
      </mesh>

      {/* Drifting clouds */}
      <group ref={cloudRef}>
        <Cloud
          seed={42}
          segments={20}
          bounds={[20, 5, 20]}
          volume={10}
          color="#e8f4f8"
          opacity={0.3}
          fade={100}
          speed={0.1}
          growth={4}
          position={[0, 8, -30]}
        />
      </group>

      {/* Lighting setup */}
      {/* Base ambient light for even illumination */}
      <ambientLight intensity={0.4} color="#fffef7" />

      {/* Key light: main directional light for sphere definition and shadows */}
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" castShadow={false} />

      {/* Fill light: subtle back-side lighting for particle depth */}
      <directionalLight position={[-3, 2, -5]} intensity={0.2} color="#7ec8d4" castShadow={false} />
    </>
  );
}
