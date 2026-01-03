/**
 * Shape Gizmos - Debug visualization for shape centroids, bounds, and axes
 *
 * Renders visual helpers for:
 * - Globe centroid (with optional XYZ axes)
 * - Globe bounding sphere
 * - Particle swarm centroid
 * - Particle swarm bounding sphere (shows breathing range)
 * - Sample shard centroids (for debugging particle positions)
 *
 * These gizmos help with:
 * - Debugging shape positioning
 * - Understanding breathing animation bounds
 * - Anchoring future effects/UI elements to shape positions
 *
 * Controlled via Leva Debug > Gizmos folder
 */

import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../constants';
import { breathPhase, orbitRadius } from '../entities/breath/traits';

interface ShapeGizmosProps {
  /**
   * Show globe centroid marker and axes
   * @default false
   */
  showGlobeCentroid?: boolean;

  /**
   * Show globe bounding sphere wireframe
   * @default false
   */
  showGlobeBounds?: boolean;

  /**
   * Show particle swarm centroid marker
   * @default false
   */
  showSwarmCentroid?: boolean;

  /**
   * Show particle swarm bounding spheres (min/max orbit)
   * @default false
   */
  showSwarmBounds?: boolean;

  /**
   * Show XYZ axes on centroids
   * @default true
   */
  showAxes?: boolean;

  /**
   * Show coordinate labels on gizmos
   * @default false
   */
  showLabels?: boolean;

  /**
   * Globe radius for bounds visualization
   * @default 1.5
   */
  globeRadius?: number;

  /**
   * Axis length for gizmo arrows
   * @default 1.0
   */
  axisLength?: number;
}

/**
 * XYZ Axes Gizmo - renders colored axis lines
 */
function AxesGizmo({
  position,
  length = 1.0,
  opacity = 0.8,
}: {
  position: [number, number, number];
  length?: number;
  opacity?: number;
}) {
  return (
    <group position={position}>
      {/* X axis - Red */}
      <Line
        points={[
          [0, 0, 0],
          [length, 0, 0],
        ]}
        color="#ff4444"
        lineWidth={2}
        transparent
        opacity={opacity}
      />
      {/* Y axis - Green */}
      <Line
        points={[
          [0, 0, 0],
          [0, length, 0],
        ]}
        color="#44ff44"
        lineWidth={2}
        transparent
        opacity={opacity}
      />
      {/* Z axis - Blue */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, length],
        ]}
        color="#4444ff"
        lineWidth={2}
        transparent
        opacity={opacity}
      />
      {/* Axis labels */}
      <Html position={[length + 0.15, 0, 0]} center>
        <span style={{ color: '#ff4444', fontSize: '10px', fontWeight: 'bold' }}>X</span>
      </Html>
      <Html position={[0, length + 0.15, 0]} center>
        <span style={{ color: '#44ff44', fontSize: '10px', fontWeight: 'bold' }}>Y</span>
      </Html>
      <Html position={[0, 0, length + 0.15]} center>
        <span style={{ color: '#4444ff', fontSize: '10px', fontWeight: 'bold' }}>Z</span>
      </Html>
    </group>
  );
}

/**
 * Centroid Marker - small sphere at the centroid position
 */
function CentroidMarker({
  position,
  color = '#ffffff',
  size = 0.08,
  label,
}: {
  position: [number, number, number];
  color?: string;
  size?: number;
  label?: string;
}) {
  return (
    <group position={position}>
      {/* Centroid sphere */}
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Outer ring for visibility */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.5, size * 2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Label */}
      {label && (
        <Html position={[0, size * 4, 0]} center>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              color: color,
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              border: `1px solid ${color}`,
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Bounding Sphere Wireframe
 */
function BoundingSphere({
  radius,
  color = '#ffffff',
  opacity = 0.3,
  label,
}: {
  radius: number;
  color?: string;
  opacity?: number;
  label?: string;
}) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
      {label && (
        <Html position={[0, radius + 0.3, 0]} center>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              color: color,
              padding: '3px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * ShapeGizmos Component
 *
 * Renders debug visualization for shape centroids and bounds.
 * Integrates with Koota ECS for real-time breath phase data.
 */
export function ShapeGizmos({
  showGlobeCentroid = false,
  showGlobeBounds = false,
  showSwarmCentroid = false,
  showSwarmBounds = false,
  showAxes = true,
  showLabels = false,
  globeRadius = 1.5,
  axisLength = 1.0,
}: ShapeGizmosProps) {
  const world = useWorld();

  // Track current orbit radius for swarm bounds
  const currentOrbitRef = useRef<number>(VISUALS.PARTICLE_ORBIT_MAX);
  const [, setForceUpdate] = useState(0);
  const frameCountRef = useRef(0);

  // Update orbit radius from ECS
  useFrame(() => {
    try {
      const breath = world.queryFirst(breathPhase, orbitRadius);
      if (breath) {
        currentOrbitRef.current = breath.get(orbitRadius)?.value ?? VISUALS.PARTICLE_ORBIT_MAX;
      }

      // Throttle updates to every 4 frames
      frameCountRef.current += 1;
      if (frameCountRef.current % 4 === 0) {
        setForceUpdate((v) => v + 1);
      }
    } catch (_e) {
      // Ignore ECS errors during hot-reload
    }
  });

  // Don't render if nothing is enabled
  if (!showGlobeCentroid && !showGlobeBounds && !showSwarmCentroid && !showSwarmBounds) {
    return null;
  }

  return (
    <group name="Shape Gizmos">
      {/* ============================================================
        GLOBE GIZMOS
        ============================================================ */}

      {/* Globe centroid marker */}
      {showGlobeCentroid && (
        <>
          <CentroidMarker
            position={[0, 0, 0]}
            color="#f8d0a8"
            size={0.1}
            label={showLabels ? 'Globe Centroid (0, 0, 0)' : undefined}
          />
          {showAxes && <AxesGizmo position={[0, 0, 0]} length={axisLength} />}
        </>
      )}

      {/* Globe bounding sphere */}
      {showGlobeBounds && (
        <>
          {/* Core radius */}
          <BoundingSphere
            radius={globeRadius}
            color="#f8d0a8"
            opacity={0.4}
            label={showLabels ? `Core r=${globeRadius}` : undefined}
          />
          {/* Outer atmosphere (approx) */}
          <BoundingSphere
            radius={globeRadius * 1.22}
            color="#c4b8e8"
            opacity={0.2}
            label={showLabels ? `Atmosphere r=${(globeRadius * 1.22).toFixed(2)}` : undefined}
          />
        </>
      )}

      {/* ============================================================
        PARTICLE SWARM GIZMOS
        ============================================================ */}

      {/* Swarm centroid (same as globe - they share the same center) */}
      {showSwarmCentroid && (
        <>
          <CentroidMarker
            position={[0, 0, 0]}
            color="#b8e8d4"
            size={0.15}
            label={showLabels ? 'Swarm Centroid (0, 0, 0)' : undefined}
          />
          {showAxes && !showGlobeCentroid && (
            <AxesGizmo position={[0, 0, 0]} length={axisLength * 1.5} opacity={0.6} />
          )}
        </>
      )}

      {/* Swarm bounding spheres (min/max orbit) */}
      {showSwarmBounds && (
        <>
          {/* Minimum orbit (inhale - particles closest) */}
          <BoundingSphere
            radius={VISUALS.PARTICLE_ORBIT_MIN}
            color="#00ff88"
            opacity={0.25}
            label={showLabels ? `Min Orbit r=${VISUALS.PARTICLE_ORBIT_MIN}` : undefined}
          />

          {/* Maximum orbit (exhale - particles farthest) */}
          <BoundingSphere
            radius={VISUALS.PARTICLE_ORBIT_MAX}
            color="#ff8800"
            opacity={0.25}
            label={showLabels ? `Max Orbit r=${VISUALS.PARTICLE_ORBIT_MAX}` : undefined}
          />

          {/* Current orbit (animated) */}
          <BoundingSphere
            radius={currentOrbitRef.current}
            color="#ffff00"
            opacity={0.5}
            label={showLabels ? `Current r=${currentOrbitRef.current.toFixed(2)}` : undefined}
          />
        </>
      )}
    </group>
  );
}

export default ShapeGizmos;
