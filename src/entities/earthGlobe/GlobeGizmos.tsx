/**
 * GlobeGizmos - Debug visualization for Earth globe positioning and orientation.
 *
 * Features:
 * - North/South pole markers with labels
 * - Equator ring visualization
 * - Simplified orbit plane showing Earth-Sun relationship
 * - Day/night terminator line (optional)
 * - Axial tilt indicator
 *
 * All visualizations use accurate astronomical positioning based on UTC time.
 * Controlled via Leva Debug > Globe Gizmos folder.
 */

import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { RENDER_LAYERS } from '../../constants';
import { calculateGMST, calculateSunPosition, celestialToCartesian } from '../../lib/astronomy';

interface GlobeGizmosProps {
  /** Globe radius to match @default 1.5 */
  globeRadius?: number;
  /** Show north/south pole markers @default true */
  showPoles?: boolean;
  /** Show equator ring @default true */
  showEquator?: boolean;
  /** Show simplified orbit plane (Earth-Sun relationship) @default true */
  showOrbitPlane?: boolean;
  /** Show day/night terminator line @default false */
  showTerminator?: boolean;
  /** Show axial tilt indicator @default false */
  showAxialTilt?: boolean;
  /** Pole marker color @default '#00ffff' for north, '#ff00ff' for south */
  northPoleColor?: string;
  southPoleColor?: string;
  /** Equator color @default '#ffaa00' */
  equatorColor?: string;
  /** Orbit plane color @default '#4488ff' */
  orbitColor?: string;
  /** Terminator line color @default '#ff8800' */
  terminatorColor?: string;
}

/**
 * Pole Marker - Shows north or south pole position with label
 */
const PoleMarker = memo(function PoleMarker({
  position,
  color,
  label,
  labelPosition,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  labelPosition: 'above' | 'below';
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Set GIZMOS layer to exclude from DoF blur
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.layers.set(RENDER_LAYERS.GIZMOS);
    }
  }, []);

  const labelY = labelPosition === 'above' ? 0.4 : -0.4;

  return (
    <group position={position}>
      {/* Pole sphere marker */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* Pole spike - extends outward */}
      <mesh rotation={labelPosition === 'above' ? [0, 0, 0] : [Math.PI, 0, 0]}>
        <coneGeometry args={[0.03, 0.2, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
      </mesh>

      {/* Label */}
      <Html position={[0, labelY, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: color,
            padding: '3px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            border: `1px solid ${color}`,
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
});

/**
 * Equator Ring - Shows the equatorial plane
 */
const EquatorRing = memo(function EquatorRing({
  radius,
  color,
}: {
  radius: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Set GIZMOS layer
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.layers.set(RENDER_LAYERS.GIZMOS);
    }
  }, []);

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.99, radius * 1.02, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

/**
 * Simplified Orbit Plane - Shows Earth-Sun relationship
 * This is a pedagogical visualization, not astronomically accurate scale
 */
const OrbitPlaneGizmo = memo(function OrbitPlaneGizmo({
  globeRadius,
  color,
  sunDirection,
}: {
  globeRadius: number;
  color: string;
  sunDirection: THREE.Vector3;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Create orbit ellipse points
  const orbitPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const orbitRadius = globeRadius * 4; // Simplified orbit radius for visualization
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius),
      );
    }

    return points;
  }, [globeRadius]);

  // Sun position indicator on orbit (simplified - just shows direction)
  const simplifiedSunPos = useMemo(() => {
    // Normalize sun direction and place on orbit plane
    const dir = sunDirection.clone().normalize();
    const orbitRadius = globeRadius * 4;
    return new THREE.Vector3(dir.x * orbitRadius, 0, dir.z * orbitRadius);
  }, [sunDirection, globeRadius]);

  // Set GIZMOS layer on group children
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.layers.set(RENDER_LAYERS.GIZMOS);
        }
      });
    }
  }, []);

  return (
    <group ref={groupRef}>
      {/* Orbit path - dashed ellipse */}
      <Line
        points={orbitPoints}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.4}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* Sun direction indicator */}
      <mesh position={simplifiedSunPos}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ffdd44" transparent opacity={0.8} depthWrite={false} />
      </mesh>

      {/* Line from Earth to Sun indicator */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), simplifiedSunPos]}
        color="#ffdd44"
        lineWidth={1}
        transparent
        opacity={0.3}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />

      {/* Orbit plane label */}
      <Html position={[globeRadius * 4.5, 0.5, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            color: color,
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '9px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Orbit Plane (simplified)
        </div>
      </Html>

      {/* Sun direction label */}
      <Html position={[simplifiedSunPos.x, simplifiedSunPos.y + 0.4, simplifiedSunPos.z]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#ffdd44',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '9px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ☀ Sun
        </div>
      </Html>
    </group>
  );
});

/**
 * Day/Night Terminator - Shows the line between day and night
 * Based on actual sun position
 */
const TerminatorLine = memo(function TerminatorLine({
  globeRadius,
  color,
  sunDirection,
}: {
  globeRadius: number;
  color: string;
  sunDirection: THREE.Vector3;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate terminator circle points
  // The terminator is a great circle perpendicular to the sun direction
  const terminatorPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 64;

    // Get perpendicular vectors to sun direction
    const sunDir = sunDirection.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);

    // If sun is nearly vertical, use different reference
    const perpRef = Math.abs(sunDir.dot(up)) > 0.99 ? new THREE.Vector3(1, 0, 0) : up;

    const perp1 = new THREE.Vector3().crossVectors(sunDir, perpRef).normalize();
    const perp2 = new THREE.Vector3().crossVectors(sunDir, perp1).normalize();

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const point = new THREE.Vector3()
        .addScaledVector(perp1, Math.cos(angle))
        .addScaledVector(perp2, Math.sin(angle))
        .multiplyScalar(globeRadius * 1.01); // Slightly larger than globe
      points.push(point);
    }

    return points;
  }, [sunDirection, globeRadius]);

  // Set GIZMOS layer
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Line) {
          child.layers.set(RENDER_LAYERS.GIZMOS);
        }
      });
    }
  }, []);

  return (
    <group ref={groupRef}>
      <Line points={terminatorPoints} color={color} lineWidth={2} transparent opacity={0.7} />

      {/* Day side indicator */}
      <Html
        position={sunDirection
          .clone()
          .normalize()
          .multiplyScalar(globeRadius * 1.3)
          .toArray()}
        center
      >
        <div
          style={{
            background: 'rgba(255, 220, 100, 0.9)',
            color: '#333',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '9px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ☀ Day
        </div>
      </Html>

      {/* Night side indicator */}
      <Html
        position={sunDirection
          .clone()
          .normalize()
          .multiplyScalar(-globeRadius * 1.3)
          .toArray()}
        center
      >
        <div
          style={{
            background: 'rgba(40, 40, 80, 0.9)',
            color: '#aab',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '9px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          🌙 Night
        </div>
      </Html>
    </group>
  );
});

/**
 * Axial Tilt Indicator - Shows Earth's 23.4° axial tilt
 */
const AxialTiltIndicator = memo(function AxialTiltIndicator({
  globeRadius,
}: {
  globeRadius: number;
}) {
  const AXIAL_TILT = 23.4 * (Math.PI / 180); // 23.4 degrees in radians

  return (
    <group>
      {/* Vertical reference line (if Earth had no tilt) */}
      <Line
        points={[
          new THREE.Vector3(0, -globeRadius * 1.3, 0),
          new THREE.Vector3(0, globeRadius * 1.3, 0),
        ]}
        color="#666666"
        lineWidth={1}
        transparent
        opacity={0.3}
        dashed
        dashSize={0.1}
        gapSize={0.1}
      />

      {/* Tilted axis line */}
      <group rotation={[0, 0, AXIAL_TILT]}>
        <Line
          points={[
            new THREE.Vector3(0, -globeRadius * 1.3, 0),
            new THREE.Vector3(0, globeRadius * 1.3, 0),
          ]}
          color="#00ff88"
          lineWidth={1.5}
          transparent
          opacity={0.6}
        />
      </group>

      {/* Tilt angle arc */}
      <Html position={[globeRadius * 0.3, globeRadius * 1.1, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#00ff88',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '9px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          23.4° tilt
        </div>
      </Html>
    </group>
  );
});

/**
 * Main GlobeGizmos component
 */
export const GlobeGizmos = memo(function GlobeGizmos({
  globeRadius = 1.5,
  showPoles = true,
  showEquator = true,
  showOrbitPlane = true,
  showTerminator = false,
  showAxialTilt = false,
  northPoleColor = '#00ffff',
  southPoleColor = '#ff00ff',
  equatorColor = '#ffaa00',
  orbitColor = '#4488ff',
  terminatorColor = '#ff8800',
}: GlobeGizmosProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sunDirectionRef = useRef(new THREE.Vector3(1, 0, 0));

  // Update sun direction periodically
  useFrame(() => {
    // Update sun direction every frame for smooth terminator movement
    // (The actual calculation is cheap since we're just getting direction)
    const now = new Date();
    const gmst = calculateGMST(now);
    const sunData = calculateSunPosition(now);
    const [x, y, z] = celestialToCartesian(sunData.ra, sunData.dec, 1, gmst);
    sunDirectionRef.current.set(x, y, z);
  });

  // Nothing to show
  if (!showPoles && !showEquator && !showOrbitPlane && !showTerminator && !showAxialTilt) {
    return null;
  }

  return (
    <group ref={groupRef} name="Globe Gizmos">
      {/* North Pole */}
      {showPoles && (
        <PoleMarker
          position={[0, globeRadius, 0]}
          color={northPoleColor}
          label="N"
          labelPosition="above"
        />
      )}

      {/* South Pole */}
      {showPoles && (
        <PoleMarker
          position={[0, -globeRadius, 0]}
          color={southPoleColor}
          label="S"
          labelPosition="below"
        />
      )}

      {/* Equator */}
      {showEquator && <EquatorRing radius={globeRadius} color={equatorColor} />}

      {/* Orbit Plane */}
      {showOrbitPlane && (
        <OrbitPlaneGizmo
          globeRadius={globeRadius}
          color={orbitColor}
          sunDirection={sunDirectionRef.current}
        />
      )}

      {/* Day/Night Terminator */}
      {showTerminator && (
        <TerminatorLine
          globeRadius={globeRadius}
          color={terminatorColor}
          sunDirection={sunDirectionRef.current}
        />
      )}

      {/* Axial Tilt */}
      {showAxialTilt && <AxialTiltIndicator globeRadius={globeRadius} />}
    </group>
  );
});

export default GlobeGizmos;
