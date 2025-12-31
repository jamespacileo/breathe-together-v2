/**
 * OrbitalTravelers - Small glowing particles with trails orbiting the globe
 *
 * Creates ethereal "satellites" that circle the Earth with soft trailing
 * ribbons in a harmonious orbital pattern.
 *
 * Pattern Design:
 * - Inner Ring (3): Same orbit plane, 120° apart - creates stable "necklace"
 * - Cross Ring (2): Perpendicular orbit, opposite phases - elegant crossing
 * - Outer Ring (3): Golden-angle tilted orbits - organic variety
 *
 * Features:
 * - 8 glowing spheres in harmonious orbital arrangement
 * - drei Trail component for smooth ribbon trails
 * - Breathing-synchronized trail intensity
 * - Harmonic speed ratios for satisfying visual rhythm
 *
 * Performance: Very lightweight - just a few meshes with trail geometry
 */

import { Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

// Golden angle in radians (137.508°) - creates naturally pleasing spacing
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface TravelerConfig {
  /** Unique identifier */
  id: string;
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

// Orbital configuration for satisfying visual pattern
// Organized in three groups for visual harmony
const TRAVELERS: TravelerConfig[] = [
  // === INNER RING: "Necklace" - 3 travelers, same plane, 120° apart ===
  // Creates a stable, synchronized ring like pearls on a string
  {
    id: 'inner-1',
    radius: 2.8,
    speed: 0.12, // All same speed for synchronized motion
    tiltX: 0.25, // Slight tilt for visual interest
    tiltZ: 0.1,
    startAngle: 0,
    color: '#f8d0a8', // Warm peach
    size: 0.05,
  },
  {
    id: 'inner-2',
    radius: 2.8,
    speed: 0.12,
    tiltX: 0.25,
    tiltZ: 0.1,
    startAngle: (Math.PI * 2) / 3, // 120°
    color: '#f8d0a8',
    size: 0.05,
  },
  {
    id: 'inner-3',
    radius: 2.8,
    speed: 0.12,
    tiltX: 0.25,
    tiltZ: 0.1,
    startAngle: (Math.PI * 4) / 3, // 240°
    color: '#f8d0a8',
    size: 0.05,
  },

  // === CROSS RING: 2 travelers, perpendicular orbit, creates elegant X ===
  {
    id: 'cross-1',
    radius: 3.5,
    speed: -0.08, // Counter-rotation for visual interest
    tiltX: Math.PI / 2 - 0.2, // Nearly perpendicular to inner ring
    tiltZ: 0.15,
    startAngle: 0,
    color: '#b8e8d4', // Soft teal
    size: 0.045,
  },
  {
    id: 'cross-2',
    radius: 3.5,
    speed: -0.08,
    tiltX: Math.PI / 2 - 0.2,
    tiltZ: 0.15,
    startAngle: Math.PI, // Opposite side
    color: '#b8e8d4',
    size: 0.045,
  },

  // === OUTER RING: 3 travelers, golden-angle tilts, varied speeds ===
  // Creates organic, nature-inspired variety
  {
    id: 'outer-1',
    radius: 4.2,
    speed: 0.06,
    tiltX: GOLDEN_ANGLE * 0.3,
    tiltZ: GOLDEN_ANGLE * 0.2,
    startAngle: 0,
    color: '#c4b8e8', // Pale lavender
    size: 0.04,
  },
  {
    id: 'outer-2',
    radius: 4.4,
    speed: -0.05, // Slight speed variation
    tiltX: GOLDEN_ANGLE * 0.6,
    tiltZ: -GOLDEN_ANGLE * 0.3,
    startAngle: GOLDEN_ANGLE,
    color: '#e8c4b8', // Rose gold
    size: 0.04,
  },
  {
    id: 'outer-3',
    radius: 4.0,
    speed: 0.07,
    tiltX: -GOLDEN_ANGLE * 0.4,
    tiltZ: GOLDEN_ANGLE * 0.5,
    startAngle: GOLDEN_ANGLE * 2,
    color: '#d4e8c4', // Soft sage
    size: 0.04,
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
   * Number of travelers to show (1-8)
   * - 3: Inner ring only (synchronized necklace)
   * - 5: Inner + cross rings
   * - 8: All rings (full pattern)
   * @default 8
   * @min 1
   * @max 8
   */
  count?: number;

  /**
   * Enable/disable the travelers
   * @default true
   */
  enabled?: boolean;
}

/**
 * OrbitalTravelers - Renders satellites orbiting the globe in harmonious pattern
 */
export function OrbitalTravelers({ count = 8, enabled = true }: OrbitalTravelersProps) {
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
      {visibleTravelers.map((config) => (
        <OrbitalTraveler key={config.id} config={config} breathValue={breathValueRef.current} />
      ))}
    </group>
  );
}

export default OrbitalTravelers;
