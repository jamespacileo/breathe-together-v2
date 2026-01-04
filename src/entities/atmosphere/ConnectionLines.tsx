/**
 * ConnectionLines - Faint lines connecting nearby particles
 *
 * Features:
 * - Creates constellation-like connections between particle shards
 * - Lines fade based on distance (closer = more visible)
 * - Opacity pulses gently with breathing
 * - Represents "breathing together" connectivity
 *
 * Uses drei Line component for smooth rendering
 */

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface ConnectionLinesProps {
  /**
   * Maximum distance for connections
   * @default 2.5
   * @min 1
   * @max 5
   */
  maxDistance?: number;

  /**
   * Maximum number of connections to render
   * @default 30
   * @min 10
   * @max 100
   */
  maxConnections?: number;

  /**
   * Line color
   * @default '#ffffff'
   */
  color?: string;

  /**
   * Maximum line opacity
   * @default 0.15
   * @min 0
   * @max 0.5
   */
  opacity?: number;

  /**
   * Line width
   * @default 0.5
   * @min 0.1
   * @max 2
   */
  lineWidth?: number;

  /**
   * Particle positions to connect (from ParticleSwarm)
   */
  particlePositions?: THREE.Vector3[];

  /**
   * Enable connection lines
   * @default true
   */
  enabled?: boolean;
}

interface Connection {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  distance: number;
  opacity: number;
}

/**
 * Generate connections between nearby particles
 */
function generateConnections(
  positions: THREE.Vector3[],
  maxDistance: number,
  maxConnections: number,
): Connection[] {
  const connections: Connection[] = [];

  for (let i = 0; i < positions.length && connections.length < maxConnections; i++) {
    for (let j = i + 1; j < positions.length && connections.length < maxConnections; j++) {
      const distance = positions[i].distanceTo(positions[j]);

      if (distance < maxDistance) {
        // Opacity based on distance (closer = more visible)
        const opacity = 1 - distance / maxDistance;

        connections.push({
          id: `${i}-${j}`,
          start: positions[i].clone(),
          end: positions[j].clone(),
          distance,
          opacity: opacity * opacity, // Quadratic falloff
        });
      }
    }
  }

  // Sort by opacity (most visible first) and limit
  return connections.sort((a, b) => b.opacity - a.opacity).slice(0, maxConnections);
}

const ConnectionLine = memo(function ConnectionLine({
  connection,
  color,
  baseOpacity,
  lineWidth,
  breathOpacity,
}: {
  connection: Connection;
  color: string;
  baseOpacity: number;
  lineWidth: number;
  breathOpacity: number;
}) {
  const points = useMemo(
    () => [connection.start.toArray(), connection.end.toArray()],
    [connection],
  );

  const finalOpacity = connection.opacity * baseOpacity * breathOpacity;

  return (
    <Line
      points={points as [number, number, number][]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={finalOpacity}
    />
  );
});

/**
 * ConnectionLines - Particle constellation effect
 *
 * If no particlePositions are provided, generates random positions
 * for demonstration purposes.
 */
export const ConnectionLines = memo(function ConnectionLines({
  maxDistance = 2.5,
  maxConnections = 30,
  color = '#ffffff',
  opacity = 0.15,
  lineWidth = 0.5,
  particlePositions,
  enabled = true,
}: ConnectionLinesProps) {
  const world = useWorld();
  const breathOpacityRef = useRef(1);

  // Generate demo positions if none provided
  const positions = useMemo(() => {
    if (particlePositions && particlePositions.length > 0) {
      return particlePositions;
    }

    // Generate random positions on a sphere for demo
    const demoPositions: THREE.Vector3[] = [];
    const count = 40;
    const radius = 4;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      demoPositions.push(
        new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi),
        ),
      );
    }

    return demoPositions;
  }, [particlePositions]);

  // Generate connections
  const connections = useMemo(
    () => generateConnections(positions, maxDistance, maxConnections),
    [positions, maxDistance, maxConnections],
  );

  // Track breath-based opacity
  const [breathOpacity, setBreathOpacity] = useState(1);

  useFrame(() => {
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      // Lines brighten slightly during inhale (togetherness)
      const newOpacity = 0.7 + phase * 0.3;
      breathOpacityRef.current = newOpacity;
      setBreathOpacity(newOpacity);
    }
  });

  if (!enabled || connections.length === 0) return null;

  return (
    <group>
      {connections.map((connection) => (
        <ConnectionLine
          key={connection.id}
          connection={connection}
          color={color}
          baseOpacity={opacity}
          lineWidth={lineWidth}
          breathOpacity={breathOpacity}
        />
      ))}
    </group>
  );
});

export default ConnectionLines;
