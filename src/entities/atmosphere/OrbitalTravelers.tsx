/**
 * OrbitalTravelers - Small glowing particles with trails orbiting the globe
 *
 * Creates ethereal "satellites" that circle the Earth with soft trailing
 * ribbons in various orbital patterns.
 *
 * Pattern Options:
 * - 'rings': Saturn-style flat equatorial rings at different radii
 * - 'heart': Romantic heart-shaped orbit path (fun!)
 *
 * Features:
 * - Configurable orbit pattern
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

// Pastel color palette for travelers
const COLORS = {
  peach: '#f8d0a8',
  teal: '#b8e8d4',
  lavender: '#c4b8e8',
  rose: '#e8c4b8',
  sage: '#d4e8c4',
  cream: '#f0e8d8',
};

/**
 * Heart curve parametric function
 * Classic mathematical heart curve, scaled for our scene
 */
function heartPosition(t: number, scale: number): THREE.Vector3 {
  // Classic heart curve equations
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);

  // x = 16 * sin³(t)
  const x = 16 * sinT * sinT * sinT;

  // y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)
  const y = 13 * cosT - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

  // Scale down and position (heart is roughly 32 units wide, 30 tall)
  // Divide by ~8 to get ~4 unit radius, good for our globe
  const scaleFactor = scale / 8;

  return new THREE.Vector3(x * scaleFactor, y * scaleFactor, 0);
}

/**
 * Ring (circular) orbit position
 */
function ringPosition(t: number, radius: number, tiltX: number, tiltZ: number): THREE.Vector3 {
  const x = Math.cos(t) * radius;
  const z = Math.sin(t) * radius;

  const pos = new THREE.Vector3(x, 0, z);

  // Apply tilt
  if (tiltX !== 0 || tiltZ !== 0) {
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromEuler(new THREE.Euler(tiltX, 0, tiltZ));
    pos.applyMatrix4(matrix);
  }

  return pos;
}

interface TravelerState {
  id: string;
  angle: number;
  speed: number;
  color: string;
  size: number;
  // Ring-specific
  radius?: number;
  tiltX?: number;
  tiltZ?: number;
  // Heart-specific
  heartScale?: number;
  zOffset?: number;
}

// Ring pattern: Saturn-style flat rings
const RING_TRAVELERS: TravelerState[] = [
  // Inner ring - 4 travelers, same speed
  {
    id: 'ring-1a',
    angle: 0,
    speed: 0.15,
    color: COLORS.peach,
    size: 0.05,
    radius: 2.6,
    tiltX: 0.15,
    tiltZ: 0,
  },
  {
    id: 'ring-1b',
    angle: Math.PI / 2,
    speed: 0.15,
    color: COLORS.peach,
    size: 0.05,
    radius: 2.6,
    tiltX: 0.15,
    tiltZ: 0,
  },
  {
    id: 'ring-1c',
    angle: Math.PI,
    speed: 0.15,
    color: COLORS.peach,
    size: 0.05,
    radius: 2.6,
    tiltX: 0.15,
    tiltZ: 0,
  },
  {
    id: 'ring-1d',
    angle: Math.PI * 1.5,
    speed: 0.15,
    color: COLORS.peach,
    size: 0.05,
    radius: 2.6,
    tiltX: 0.15,
    tiltZ: 0,
  },

  // Middle ring - 3 travelers, counter-rotation
  {
    id: 'ring-2a',
    angle: 0,
    speed: -0.1,
    color: COLORS.teal,
    size: 0.045,
    radius: 3.2,
    tiltX: 0.15,
    tiltZ: 0,
  },
  {
    id: 'ring-2b',
    angle: (Math.PI * 2) / 3,
    speed: -0.1,
    color: COLORS.teal,
    size: 0.045,
    radius: 3.2,
    tiltX: 0.15,
    tiltZ: 0,
  },
  {
    id: 'ring-2c',
    angle: (Math.PI * 4) / 3,
    speed: -0.1,
    color: COLORS.teal,
    size: 0.045,
    radius: 3.2,
    tiltX: 0.15,
    tiltZ: 0,
  },

  // Outer ring - 2 travelers, slow
  {
    id: 'ring-3a',
    angle: 0,
    speed: 0.06,
    color: COLORS.lavender,
    size: 0.04,
    radius: 3.8,
    tiltX: 0.15,
    tiltZ: 0,
  },
  {
    id: 'ring-3b',
    angle: Math.PI,
    speed: 0.06,
    color: COLORS.lavender,
    size: 0.04,
    radius: 3.8,
    tiltX: 0.15,
    tiltZ: 0,
  },
];

// Heart pattern: travelers following heart-shaped path
const HEART_TRAVELERS: TravelerState[] = [
  // Main heart travelers - evenly spaced around the heart
  {
    id: 'heart-1',
    angle: 0,
    speed: 0.12,
    color: COLORS.rose,
    size: 0.055,
    heartScale: 3.2,
    zOffset: 0,
  },
  {
    id: 'heart-2',
    angle: Math.PI * 0.4,
    speed: 0.12,
    color: COLORS.rose,
    size: 0.055,
    heartScale: 3.2,
    zOffset: 0,
  },
  {
    id: 'heart-3',
    angle: Math.PI * 0.8,
    speed: 0.12,
    color: COLORS.rose,
    size: 0.055,
    heartScale: 3.2,
    zOffset: 0,
  },
  {
    id: 'heart-4',
    angle: Math.PI * 1.2,
    speed: 0.12,
    color: COLORS.rose,
    size: 0.055,
    heartScale: 3.2,
    zOffset: 0,
  },
  {
    id: 'heart-5',
    angle: Math.PI * 1.6,
    speed: 0.12,
    color: COLORS.rose,
    size: 0.055,
    heartScale: 3.2,
    zOffset: 0,
  },

  // Second heart layer - slightly smaller, offset in Z, different color
  {
    id: 'heart-inner-1',
    angle: Math.PI * 0.2,
    speed: -0.08,
    color: COLORS.peach,
    size: 0.04,
    heartScale: 2.4,
    zOffset: 0.5,
  },
  {
    id: 'heart-inner-2',
    angle: Math.PI * 0.7,
    speed: -0.08,
    color: COLORS.peach,
    size: 0.04,
    heartScale: 2.4,
    zOffset: 0.5,
  },
  {
    id: 'heart-inner-3',
    angle: Math.PI * 1.4,
    speed: -0.08,
    color: COLORS.peach,
    size: 0.04,
    heartScale: 2.4,
    zOffset: -0.5,
  },
];

interface OrbitalTravelerProps {
  state: TravelerState;
  pattern: 'rings' | 'heart';
  breathValue: number;
}

/**
 * Individual orbital traveler with trail
 */
function OrbitalTraveler({ state, pattern, breathValue }: OrbitalTravelerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(state.angle);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Update angle
    angleRef.current += state.speed * delta;

    // Calculate position based on pattern
    let pos: THREE.Vector3;

    if (pattern === 'heart') {
      pos = heartPosition(angleRef.current, state.heartScale ?? 3);
      // Apply Z offset for layering
      pos.z += state.zOffset ?? 0;
      // Rotate heart to face camera (tilt back slightly)
      pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.3);
    } else {
      pos = ringPosition(angleRef.current, state.radius ?? 3, state.tiltX ?? 0, state.tiltZ ?? 0);
    }

    meshRef.current.position.copy(pos);
  });

  // Trail opacity modulated by breathing
  const trailOpacity = 0.4 + breathValue * 0.3;

  return (
    <Trail
      width={state.size * 8}
      length={14}
      color={state.color}
      attenuation={(t) => t * t}
      decay={1.5}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[state.size, 8, 8]} />
        <meshBasicMaterial color={state.color} transparent opacity={trailOpacity} />
      </mesh>
    </Trail>
  );
}

export interface OrbitalTravelersProps {
  /**
   * Orbital pattern style
   * - 'rings': Saturn-style flat equatorial rings
   * - 'heart': Romantic heart-shaped orbit (fun!)
   * @default 'heart'
   */
  pattern?: 'rings' | 'heart';

  /**
   * Number of travelers to show
   * @default 8 for heart, 9 for rings
   * @min 1
   * @max 10
   */
  count?: number;

  /**
   * Enable/disable the travelers
   * @default true
   */
  enabled?: boolean;
}

/**
 * OrbitalTravelers - Renders satellites orbiting the globe in various patterns
 */
export function OrbitalTravelers({
  pattern = 'heart',
  count,
  enabled = true,
}: OrbitalTravelersProps) {
  const world = useWorld();
  const breathValueRef = useRef(0);

  // Select travelers based on pattern
  const allTravelers = pattern === 'heart' ? HEART_TRAVELERS : RING_TRAVELERS;
  const defaultCount = pattern === 'heart' ? 8 : 9;
  const travelerCount = count ?? defaultCount;

  // Memoize visible travelers
  const visibleTravelers = useMemo(
    () => allTravelers.slice(0, Math.min(travelerCount, allTravelers.length)),
    [allTravelers, travelerCount],
  );

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

  return (
    <group name="Orbital Travelers">
      {visibleTravelers.map((state) => (
        <OrbitalTraveler
          key={state.id}
          state={state}
          pattern={pattern}
          breathValue={breathValueRef.current}
        />
      ))}
    </group>
  );
}

export default OrbitalTravelers;
