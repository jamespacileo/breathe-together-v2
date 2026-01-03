/**
 * Shape Gizmos - Debug visualization for shape centroids, bounds, and axes
 *
 * Renders visual helpers for:
 * - Globe centroid (with optional XYZ axes)
 * - Globe bounding sphere
 * - Particle swarm centroid
 * - Particle swarm bounding sphere (shows breathing range)
 * - Individual shard centroids and wireframes
 * - Connecting lines between shard centroids
 *
 * These gizmos help with:
 * - Debugging shape positioning
 * - Understanding breathing animation bounds
 * - Visualizing Fibonacci sphere distribution
 * - Anchoring future effects/UI elements to shape positions
 *
 * Controlled via Leva Debug > Gizmos folder
 */

import { Html, Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef, useState } from 'react';
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
   * Show centroid markers for individual shards
   * @default false
   */
  showShardCentroids?: boolean;

  /**
   * Show wireframe icosahedrons at shard positions
   * @default false
   */
  showShardWireframes?: boolean;

  /**
   * Show lines connecting adjacent shard centroids
   * @default false
   */
  showShardConnections?: boolean;

  /**
   * Maximum number of shard gizmos to render (for performance)
   * @default 50
   */
  maxShardGizmos?: number;

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
 * Shard position data extracted from InstancedMesh
 */
interface ShardPosition {
  position: THREE.Vector3;
  scale: number;
  index: number;
}

/**
 * Pre-allocated objects for matrix decomposition
 */
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();

/**
 * Shard Gizmos - renders centroids, wireframes, and connections for particle shards
 */
function ShardGizmos({
  positions,
  showCentroids,
  showWireframes,
  showConnections,
  showLabels,
  shardSize,
}: {
  positions: ShardPosition[];
  showCentroids: boolean;
  showWireframes: boolean;
  showConnections: boolean;
  showLabels: boolean;
  shardSize: number;
}) {
  // Memoize wireframe geometry
  const wireframeGeometry = useMemo(() => new THREE.IcosahedronGeometry(shardSize, 0), [shardSize]);

  // Memoize wireframe material
  const wireframeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#00ffff',
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      }),
    [],
  );

  // Generate connection line points (connect each shard to its neighbors in Fibonacci order)
  const connectionPoints = useMemo(() => {
    if (!showConnections || positions.length < 2) return [];

    const points: [number, number, number][] = [];
    for (const shard of positions) {
      const p = shard.position;
      points.push([p.x, p.y, p.z]);
    }
    return points;
  }, [positions, showConnections]);

  if (positions.length === 0) return null;

  return (
    <group name="Shard Gizmos">
      {/* Shard centroids */}
      {showCentroids &&
        positions.map((shard) => (
          <CentroidMarker
            key={`centroid-${shard.index}`}
            position={[shard.position.x, shard.position.y, shard.position.z]}
            color="#ff66ff"
            size={0.04}
            label={showLabels ? `#${shard.index}` : undefined}
          />
        ))}

      {/* Shard wireframes */}
      {showWireframes &&
        positions.map((shard) => (
          <mesh
            key={`wireframe-${shard.index}`}
            position={[shard.position.x, shard.position.y, shard.position.z]}
            scale={shard.scale}
            geometry={wireframeGeometry}
            material={wireframeMaterial}
          />
        ))}

      {/* Connection lines between adjacent shards (Fibonacci order) */}
      {showConnections && connectionPoints.length >= 2 && (
        <Line points={connectionPoints} color="#ff66ff" lineWidth={1} transparent opacity={0.4} />
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
  showShardCentroids = false,
  showShardWireframes = false,
  showShardConnections = false,
  maxShardGizmos = 50,
  showAxes = true,
  showLabels = false,
  globeRadius = 1.5,
  axisLength = 1.0,
}: ShapeGizmosProps) {
  const world = useWorld();
  const { scene } = useThree();

  // Track current orbit radius for swarm bounds
  const currentOrbitRef = useRef<number>(VISUALS.PARTICLE_ORBIT_MAX);
  const [shardPositions, setShardPositions] = useState<ShardPosition[]>([]);
  const [shardSize, setShardSize] = useState(0.5);
  const frameCountRef = useRef(0);

  // Find the particle swarm InstancedMesh
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Check if shard gizmos are enabled
  const showShardGizmos = showShardCentroids || showShardWireframes || showShardConnections;

  // Update orbit radius and shard positions from scene
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: useFrame needs to handle ECS queries, scene traversal, and matrix decomposition in one loop for performance
  useFrame(() => {
    try {
      // Update orbit radius from ECS
      const breath = world.queryFirst(breathPhase, orbitRadius);
      if (breath) {
        currentOrbitRef.current = breath.get(orbitRadius)?.value ?? VISUALS.PARTICLE_ORBIT_MAX;
      }

      // Throttle updates to every 4 frames
      frameCountRef.current += 1;
      if (frameCountRef.current % 4 !== 0) return;

      // Find the InstancedMesh if not cached
      if (!instancedMeshRef.current && showShardGizmos) {
        scene.traverse((obj) => {
          if (obj.name === 'Particle Swarm' && obj instanceof THREE.InstancedMesh) {
            instancedMeshRef.current = obj;
          }
        });
      }

      // Extract shard positions from InstancedMesh
      if (instancedMeshRef.current && showShardGizmos) {
        const mesh = instancedMeshRef.current;
        const positions: ShardPosition[] = [];
        const count = Math.min(mesh.count, maxShardGizmos);

        // Get shard size from geometry bounding sphere
        if (mesh.geometry.boundingSphere) {
          setShardSize(mesh.geometry.boundingSphere.radius);
        }

        for (let i = 0; i < count; i++) {
          mesh.getMatrixAt(i, _tempMatrix);
          _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

          // Only include visible shards (scale > 0)
          if (_tempScale.x > 0.01) {
            positions.push({
              position: _tempPosition.clone(),
              scale: _tempScale.x,
              index: i,
            });
          }
        }

        setShardPositions(positions);
      }
    } catch (_e) {
      // Ignore ECS errors during hot-reload
    }
  });

  // Don't render if nothing is enabled
  if (
    !showGlobeCentroid &&
    !showGlobeBounds &&
    !showSwarmCentroid &&
    !showSwarmBounds &&
    !showShardGizmos
  ) {
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

      {/* ============================================================
        INDIVIDUAL SHARD GIZMOS
        ============================================================ */}

      {showShardGizmos && (
        <ShardGizmos
          positions={shardPositions}
          showCentroids={showShardCentroids}
          showWireframes={showShardWireframes}
          showConnections={showShardConnections}
          showLabels={showLabels}
          shardSize={shardSize}
        />
      )}
    </group>
  );
}

export default ShapeGizmos;
