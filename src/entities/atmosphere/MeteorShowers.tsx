/**
 * MeteorShowers - Shooting star streaks across the atmosphere
 *
 * Features:
 * - Random meteor spawns at atmosphere edge
 * - Fast streaks with glowing trails
 * - Warm golden/white colors
 * - Occasional spawns (not constant)
 *
 * Implementation: Instanced lines with lifecycle management
 */

import { Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';

export interface MeteorShowersProps {
  /**
   * Maximum number of concurrent meteors
   * @default 3
   * @min 1
   * @max 10
   */
  maxMeteors?: number;

  /**
   * Spawn rate (meteors per second on average)
   * @default 0.3
   * @min 0.1
   * @max 2
   */
  spawnRate?: number;

  /**
   * Meteor speed
   * @default 15
   * @min 5
   * @max 30
   */
  speed?: number;

  /**
   * Meteor color
   * @default '#ffffcc'
   */
  color?: string;

  /**
   * Trail length
   * @default 1.5
   * @min 0.5
   * @max 3
   */
  trailLength?: number;

  /**
   * Spawn radius (atmosphere boundary)
   * @default 12
   * @min 6
   * @max 20
   */
  radius?: number;

  /**
   * Enable meteor showers
   * @default true
   */
  enabled?: boolean;
}

interface Meteor {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startTime: number;
  lifetime: number;
}

/**
 * Generate a random spawn point and direction for a meteor
 */
function spawnMeteor(id: number, startTime: number, radius: number, speed: number): Meteor {
  // Random point on upper hemisphere of sphere
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 0.4; // Upper 40% of sphere

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  // Direction: toward center with some randomness, angled downward
  const direction = new THREE.Vector3(-x, -y - radius * 0.5, -z).normalize();

  // Add some random variation
  direction.x += (Math.random() - 0.5) * 0.3;
  direction.y -= Math.random() * 0.2; // Bias downward
  direction.z += (Math.random() - 0.5) * 0.3;
  direction.normalize();

  return {
    id,
    position: new THREE.Vector3(x, y, z),
    velocity: direction.multiplyScalar(speed),
    startTime,
    lifetime: 1.5 + Math.random() * 1, // 1.5-2.5 seconds
  };
}

const MeteorTrail = memo(function MeteorTrail({
  meteor,
  currentTime,
  color,
  trailLength,
  onComplete,
}: {
  meteor: Meteor;
  currentTime: number;
  color: string;
  trailLength: number;
  onComplete: (id: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const positionRef = useRef(meteor.position.clone());

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const elapsed = currentTime - meteor.startTime;

    if (elapsed > meteor.lifetime) {
      onComplete(meteor.id);
      return;
    }

    // Update position
    positionRef.current.add(meteor.velocity.clone().multiplyScalar(delta));
    meshRef.current.position.copy(positionRef.current);
  });

  // Fade based on lifetime
  const elapsed = currentTime - meteor.startTime;
  const progress = elapsed / meteor.lifetime;
  const opacity = 1 - progress;

  return (
    <Trail
      width={0.15}
      length={trailLength}
      color={color}
      attenuation={(t) => t * t * opacity}
      decay={1}
    >
      <mesh ref={meshRef} position={positionRef.current.toArray()}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </Trail>
  );
});

/**
 * MeteorShowers - Shooting stars effect
 */
export const MeteorShowers = memo(function MeteorShowers({
  maxMeteors = 3,
  spawnRate = 0.3,
  speed = 15,
  color = '#ffffcc',
  trailLength = 1.5,
  radius = 12,
  enabled = true,
}: MeteorShowersProps) {
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const nextIdRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const clockRef = useRef(0);

  const removeMeteor = useCallback((id: number) => {
    setMeteors((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime;

    // Check if we should spawn a new meteor
    const timeSinceLastSpawn = state.clock.elapsedTime - lastSpawnTimeRef.current;
    const spawnInterval = 1 / spawnRate;

    // Random spawn with Poisson-like distribution
    if (
      meteors.length < maxMeteors &&
      timeSinceLastSpawn > spawnInterval * 0.5 &&
      Math.random() < spawnRate * 0.016 // ~60fps
    ) {
      const newMeteor = spawnMeteor(nextIdRef.current++, state.clock.elapsedTime, radius, speed);
      setMeteors((prev) => [...prev, newMeteor]);
      lastSpawnTimeRef.current = state.clock.elapsedTime;
    }
  });

  if (!enabled) return null;

  return (
    <group>
      {meteors.map((meteor) => (
        <MeteorTrail
          key={meteor.id}
          meteor={meteor}
          currentTime={clockRef.current}
          color={color}
          trailLength={trailLength}
          onComplete={removeMeteor}
        />
      ))}
    </group>
  );
});

export default MeteorShowers;
