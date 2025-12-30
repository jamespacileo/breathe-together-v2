/**
 * AtmosphericParticles - Ambient floating particles using THREE.Points
 *
 * Features:
 * - 100 floating particles distributed on Fibonacci sphere
 * - Phase-based animation with drifting motion
 * - Breathing-synchronized opacity
 * - Additive blending for ethereal appearance
 * - Warm gray color (#8c7b6c) for Monument Valley aesthetic
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';

interface AtmosphericParticlesProps {
  /**
   * Number of floating particles.
   *
   * @default 100
   * @min 10
   * @max 500
   */
  count?: number;

  /**
   * Base particle size.
   *
   * @default 0.08
   * @min 0.01
   * @max 0.5
   */
  size?: number;

  /**
   * Base opacity (before breathing modulation).
   *
   * @default 0.1
   * @min 0
   * @max 1
   */
  baseOpacity?: number;

  /**
   * Breathing opacity range (added to baseOpacity).
   *
   * @default 0.15
   * @min 0
   * @max 1
   */
  breathingOpacity?: number;
}

/**
 * Helper: Generate Fibonacci sphere distribution
 */
function generateFibonacciSphere(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * i) / count);

    const x = Math.cos(theta) * Math.sin(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(phi);

    // Scale to orbital radius (5-13 units from center)
    const radius = 5 + Math.random() * 8;
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }

  return points;
}

/**
 * AtmosphericParticles - Floating ambient particles
 *
 * Creates a ethereal swarm of floating particles distributed around
 * the central globe. Each particle has a unique phase-based animation
 * that makes them drift in and out, synchronized with the breathing cycle.
 */
export function AtmosphericParticles({
  count = 100,
  size = 0.08,
  baseOpacity = 0.1,
  breathingOpacity = 0.15,
}: AtmosphericParticlesProps = {}) {
  const pointsRef = useRef<THREE.Points>(null);
  const world = useWorld();

  // Generate stable random data for each particle (phase, speed, offset)
  const particleData = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 3] = Math.random() * Math.PI * 2; // phase (0-2π)
      data[i * 3 + 1] = 0.2 + Math.random() * 0.5; // speed (0.2-0.7)
      data[i * 3 + 2] = Math.random(); // offset (0-1)
    }
    return data;
  }, [count]);

  // Generate initial positions using Fibonacci sphere
  const initialPositions = useMemo(() => {
    const positions = generateFibonacciSphere(count);
    const posArray = new Float32Array(count * 3);
    positions.forEach((pos, i) => {
      posArray[i * 3] = pos.x;
      posArray[i * 3 + 1] = pos.y;
      posArray[i * 3 + 2] = pos.z;
    });
    return posArray;
  }, [count]);

  // Create geometry with positions
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(initialPositions);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [initialPositions]);

  // Create material for particles
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x8c7b6c, // Warm gray for Monument Valley
        size,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [size, baseOpacity],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  /**
   * Animation frame: Update particle positions and opacity
   */
  useFrame((state) => {
    if (!pointsRef.current) return;

    const positions = geometry.attributes.position.array as Float32Array;
    const currentTime = state.clock.elapsedTime;

    // Update each particle's position based on its phase animation
    for (let i = 0; i < count; i++) {
      const initialX = initialPositions[i * 3];
      const initialY = initialPositions[i * 3 + 1];
      const initialZ = initialPositions[i * 3 + 2];

      const phase = particleData[i * 3] + currentTime * particleData[i * 3 + 1];
      // offset value is reserved in particleData for future use
      // const _offset = particleData[i * 3 + 2];

      // Drifting motion: combine sin/cos waves for smooth, organic movement
      const driftX = Math.cos(phase) * 0.2;
      const driftY = Math.sin(phase) * 0.3;
      const driftZ = Math.sin(phase * 0.5) * 0.2;

      positions[i * 3] = initialX + driftX;
      positions[i * 3 + 1] = initialY + driftY;
      positions[i * 3 + 2] = initialZ + driftZ;
    }

    geometry.attributes.position.needsUpdate = true;

    // Update opacity based on breathing phase
    const breathEntity = world?.queryFirst?.(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
      material.opacity = baseOpacity + phase * breathingOpacity;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export default AtmosphericParticles;
