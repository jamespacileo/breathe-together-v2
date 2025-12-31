/**
 * OrbitalTravelers - Small glowing particles with trails orbiting the globe
 *
 * Creates ethereal "satellites" or "planes" that circle the Earth with
 * soft trailing ribbons. Evokes a sense of global connection and movement.
 *
 * Features:
 * - 3-5 small glowing spheres orbiting at different altitudes/angles
 * - drei Trail component for smooth ribbon trails
 * - Breathing-synchronized trail intensity
 * - Varied orbital speeds and tilts for organic feel
 *
 * Performance: Very lightweight - just a few meshes with trail geometry
 */

import { Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

interface TravelerConfig {
  /** Orbit radius from center */
  radius: number;
  /** Orbit speed (radians per second) */
  speed: number;
  /** Orbit tilt on X axis */
  tiltX: number;
  /** Orbit tilt on Z axis */
  tiltZ: number;
  /** Starting angle on orbit */
  startAngle: number;
  /** Trail color */
  color: string;
  /** Size of the traveler sphere */
  size: number;
}

// Configuration for each orbital traveler - like satellites at different orbits
const TRAVELERS: TravelerConfig[] = [
  {
    radius: 3.2,
    speed: 0.15,
    tiltX: 0.3,
    tiltZ: 0.1,
    startAngle: 0,
    color: '#f8d0a8', // Warm peach
    size: 0.06,
  },
  {
    radius: 3.8,
    speed: -0.12,
    tiltX: -0.2,
    tiltZ: 0.4,
    startAngle: Math.PI * 0.7,
    color: '#b8e8d4', // Soft teal
    size: 0.05,
  },
  {
    radius: 4.2,
    speed: 0.08,
    tiltX: 0.5,
    tiltZ: -0.15,
    startAngle: Math.PI * 1.3,
    color: '#c4b8e8', // Pale lavender
    size: 0.045,
  },
  {
    radius: 2.8,
    speed: -0.18,
    tiltX: -0.4,
    tiltZ: 0.25,
    startAngle: Math.PI * 0.4,
    color: '#e8c4b8', // Rose gold
    size: 0.055,
  },
];

interface OrbitalTravelerProps {
  config: TravelerConfig;
  breathValue: number;
}

/**
 * Individual orbital traveler with trail
 */
function OrbitalTraveler({ config, breathValue }: OrbitalTravelerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(config.startAngle);

  // Create rotation matrix for orbit tilt
  const orbitMatrix = useMemo(() => {
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromEuler(new THREE.Euler(config.tiltX, 0, config.tiltZ));
    return matrix;
  }, [config.tiltX, config.tiltZ]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Update orbital angle
    angleRef.current += config.speed * delta;

    // Calculate position on orbit circle
    const x = Math.cos(angleRef.current) * config.radius;
    const z = Math.sin(angleRef.current) * config.radius;

    // Apply orbit tilt
    const pos = new THREE.Vector3(x, 0, z);
    pos.applyMatrix4(orbitMatrix);

    meshRef.current.position.copy(pos);
  });

  // Trail opacity modulated by breathing
  const trailOpacity = 0.4 + breathValue * 0.3;

  return (
    <Trail
      width={config.size * 8}
      length={12}
      color={config.color}
      attenuation={(t) => t * t}
      decay={1.5}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[config.size, 8, 8]} />
        <meshBasicMaterial color={config.color} transparent opacity={trailOpacity} />
      </mesh>
    </Trail>
  );
}

export interface OrbitalTravelersProps {
  /**
   * Number of travelers to show (1-4)
   * @default 4
   * @min 1
   * @max 4
   */
  count?: number;

  /**
   * Enable/disable the travelers
   * @default true
   */
  enabled?: boolean;
}

/**
 * OrbitalTravelers - Renders multiple satellites orbiting the globe with trails
 */
export function OrbitalTravelers({ count = 4, enabled = true }: OrbitalTravelersProps) {
  const world = useWorld();
  const breathValueRef = useRef(0);

  // Update breath value each frame
  useFrame(() => {
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        breathValueRef.current = breathEntity.get?.(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  // Limit count to available travelers
  const visibleTravelers = TRAVELERS.slice(0, Math.min(count, TRAVELERS.length));

  return (
    <group name="Orbital Travelers">
      {visibleTravelers.map((config, i) => (
        <OrbitalTraveler
          key={`traveler-${config.color}-${i}`}
          config={config}
          breathValue={breathValueRef.current}
        />
      ))}
    </group>
  );
}

export default OrbitalTravelers;
