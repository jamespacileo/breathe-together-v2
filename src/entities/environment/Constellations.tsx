/**
 * Constellations - Render accurate constellation patterns with connecting lines
 *
 * Features:
 * - Instanced star rendering for performance
 * - Constellation line connections
 * - Background star field using Fibonacci sphere distribution
 * - Size based on star magnitude (brightness)
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { RENDER_LAYERS } from '../../constants';
import {
  CONSTELLATIONS,
  generateBackgroundStars,
  raDecToCartesian,
} from '../../lib/constellations';

interface ConstellationsProps {
  /** Show constellation lines @default true */
  showLines?: boolean;
  /** Background star count @default 2000 */
  backgroundStarCount?: number;
  /** Constellation star brightness @default 1.0 */
  brightness?: number;
  /** Constellation line opacity @default 0.4 */
  lineOpacity?: number;
  /** Enable subtle star twinkle @default true */
  enableTwinkle?: boolean;
}

export function Constellations({
  showLines = true,
  backgroundStarCount = 2000,
  brightness = 1.0,
  lineOpacity = 0.4,
  enableTwinkle = true,
}: ConstellationsProps = {}) {
  const constellationStarsRef = useRef<THREE.InstancedMesh>(null);
  const backgroundStarsRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  // Collect all constellation stars with positions
  const { constellationStars, linePositions } = useMemo(() => {
    const stars: Array<{ position: Vector3; magnitude: number }> = [];
    const lines: number[] = [];

    for (const constellation of CONSTELLATIONS) {
      const startIndex = stars.length;

      // Add all stars in this constellation
      for (const star of constellation.stars) {
        const position = raDecToCartesian(star.ra, star.dec, 100);
        stars.push({ position, magnitude: star.magnitude });
      }

      // Add line connections (convert local indices to global)
      if (showLines) {
        for (const [a, b] of constellation.connections) {
          const posA = stars[startIndex + a].position;
          const posB = stars[startIndex + b].position;

          lines.push(posA.x, posA.y, posA.z);
          lines.push(posB.x, posB.y, posB.z);
        }
      }
    }

    return { constellationStars: stars, linePositions: lines };
  }, [showLines]);

  // Generate background stars
  const backgroundStars = useMemo(() => {
    return generateBackgroundStars(backgroundStarCount, 100);
  }, [backgroundStarCount]);

  // Create geometries and materials
  // Increased star size for better visibility against bright background
  const starGeometry = useMemo(() => new SphereGeometry(0.15, 8, 8), []);

  const constellationMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: new Color('#e8f4ff'), // Cool blue-white like real stars
      emissive: new Color('#b8d8ff'), // Bright blue-white glow
      emissiveIntensity: brightness * 4.5, // Increased for vivid stellar glow
      toneMapped: false,
      metalness: 0,
      roughness: 1,
    });
  }, [brightness]);

  const backgroundMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: new Color('#dde8ff'), // Soft blue-white
      emissive: new Color('#9ec5ff'), // Gentle blue glow
      emissiveIntensity: brightness * 1.2, // Slightly brighter for deep space feel
      toneMapped: false,
      metalness: 0,
      roughness: 1,
    });
  }, [brightness]);

  const lineMaterial = useMemo(() => {
    return new LineBasicMaterial({
      color: new Color('#7da3d9'), // Celestial blue for constellation lines
      opacity: lineOpacity * 2.0, // Enhanced visibility
      transparent: true,
      toneMapped: false,
      linewidth: 2, // Thicker lines (note: may not work on all platforms)
    });
  }, [lineOpacity]);

  // Setup constellation star instances
  useEffect(() => {
    if (!constellationStarsRef.current) return;

    const matrix = new Matrix4();

    for (let i = 0; i < constellationStars.length; i++) {
      const star = constellationStars[i];

      // Size based on magnitude (brighter = larger)
      // Magnitude scale is logarithmic, lower = brighter
      const scale = Math.max(0.5, 2.0 - star.magnitude * 0.3);

      matrix.identity();
      matrix.setPosition(star.position.x, star.position.y, star.position.z);
      matrix.scale(new Vector3(scale, scale, scale));

      constellationStarsRef.current.setMatrixAt(i, matrix);
    }

    constellationStarsRef.current.instanceMatrix.needsUpdate = true;
  }, [constellationStars]);

  // Setup background star instances
  useEffect(() => {
    if (!backgroundStarsRef.current) return;

    const matrix = new Matrix4();

    for (let i = 0; i < backgroundStars.length; i++) {
      const star = backgroundStars[i];

      // Random scale variation for background stars
      const scale = 0.2 + Math.random() * 0.3;

      matrix.identity();
      matrix.setPosition(star.x, star.y, star.z);
      matrix.scale(new Vector3(scale, scale, scale));

      backgroundStarsRef.current.setMatrixAt(i, matrix);
    }

    backgroundStarsRef.current.instanceMatrix.needsUpdate = true;
  }, [backgroundStars]);

  // Create line geometry
  const lineGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
    return geometry;
  }, [linePositions]);

  // Subtle star twinkle animation
  useFrame((state) => {
    if (!enableTwinkle) return;

    const time = state.clock.elapsedTime;

    // Very subtle opacity variation
    if (constellationStarsRef.current) {
      const baseIntensity = brightness * 1.5;
      const variation = Math.sin(time * 0.5) * 0.1;
      (constellationStarsRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        baseIntensity + variation;
    }

    if (backgroundStarsRef.current) {
      const baseIntensity = brightness * 0.3;
      const variation = Math.sin(time * 0.7 + 1.5) * 0.05;
      (backgroundStarsRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        baseIntensity + variation;
    }
  });

  // Set layer to OVERLAY for sharp rendering after DoF
  useEffect(() => {
    if (constellationStarsRef.current) {
      constellationStarsRef.current.layers.set(RENDER_LAYERS.OVERLAY);
    }
    if (backgroundStarsRef.current) {
      backgroundStarsRef.current.layers.set(RENDER_LAYERS.OVERLAY);
    }
    if (linesRef.current) {
      linesRef.current.layers.set(RENDER_LAYERS.OVERLAY);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      starGeometry.dispose();
      constellationMaterial.dispose();
      backgroundMaterial.dispose();
      lineMaterial.dispose();
      lineGeometry.dispose();
    };
  }, [starGeometry, constellationMaterial, backgroundMaterial, lineMaterial, lineGeometry]);

  return (
    <group name="constellations">
      {/* Constellation stars (brighter, larger) */}
      <instancedMesh
        ref={constellationStarsRef}
        args={[starGeometry, constellationMaterial, constellationStars.length]}
        frustumCulled={false}
      />

      {/* Background stars (dimmer, smaller) */}
      <instancedMesh
        ref={backgroundStarsRef}
        args={[starGeometry, backgroundMaterial, backgroundStars.length]}
        frustumCulled={false}
      />

      {/* Constellation connection lines */}
      {showLines && linePositions.length > 0 && (
        <lineSegments ref={linesRef} geometry={lineGeometry}>
          <primitive object={lineMaterial} attach="material" />
        </lineSegments>
      )}
    </group>
  );
}
