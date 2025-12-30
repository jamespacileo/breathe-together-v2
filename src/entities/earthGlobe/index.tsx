/**
 * EarthGlobe - Central Earth visualization with Monument Valley aesthetic
 *
 * A single r3f-globe instance that:
 * - Renders Earth with Monument Valley styled texture
 * - Breathes subtly with the meditation cycle (via ECS breathPhase trait)
 * - Rotates slowly on Y-axis (0.08 rad/s)
 * - Simple frosted glass overlay (no complex refraction)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import Globe from 'r3f-globe';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  globeScale?: number;
  globeTexture?: string;
  breathingScale?: number;
  rotationSpeed?: number;
  atmosphereIntensity?: number;
  atmosphereColor?: string;
  showAtmosphere?: boolean;
  enableRotation?: boolean;
}

/**
 * EarthGlobe - Renders r3f-globe with simple frosted glass overlay
 *
 * Uses breathing synchronization from ECS breathPhase trait to animate scale.
 * Rotates on Y-axis for subtle dynamic effect.
 */
export function EarthGlobe({
  globeScale = 2.5,
  globeTexture = '/textures/earth-texture.png',
  breathingScale = 0.02,
  rotationSpeed = 0.08,
  atmosphereIntensity = 0.15,
  atmosphereColor = '#7ec8d4',
  showAtmosphere = true,
  enableRotation = true,
}: Partial<EarthGlobeProps> = {}) {
  // biome-ignore lint/suspicious/noExplicitAny: r3f-globe component type not exported from library
  const globeRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const overlayRef = useRef<THREE.Mesh>(null);
  const world = useWorld();
  const rotationRef = useRef(0);

  // Create frosted glass overlay geometry and material
  const overlayGeometry = useMemo(() => new THREE.SphereGeometry(2.52, 32, 32), []);
  const overlayMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.12,
        metalness: 0.3,
        roughness: 0.6,
        envMapIntensity: 0.2,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Cleanup overlay resources on unmount
  useEffect(() => {
    return () => {
      overlayGeometry.dispose();
      overlayMaterial.dispose();
    };
  }, [overlayGeometry, overlayMaterial]);

  /**
   * Update globe scale based on breathing animation
   */
  useFrame(() => {
    if (!groupRef.current) return;

    const breathEntity = world?.queryFirst?.(breathPhase);
    if (!breathEntity) return;

    const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
    const scaleFactor = 1 + (phase - 0.5) * breathingScale * 2;
    const currentScale = globeScale * scaleFactor;

    groupRef.current.scale.set(currentScale, currentScale, currentScale);
  });

  /**
   * Handle rotation
   */
  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    if (enableRotation) {
      rotationRef.current += rotationSpeed * delta;
      groupRef.current.rotation.y = rotationRef.current;
    }
  });

  return (
    <group ref={groupRef}>
      <Globe
        ref={globeRef}
        globeImageUrl={globeTexture}
        showAtmosphere={showAtmosphere}
        atmosphereColor={atmosphereColor}
        atmosphereAltitude={atmosphereIntensity}
      />
      {/* Frosted glass overlay for subtle frosted appearance */}
      <mesh ref={overlayRef} geometry={overlayGeometry} material={overlayMaterial} />
    </group>
  );
}

export default EarthGlobe;
