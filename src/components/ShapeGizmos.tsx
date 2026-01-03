/**
 * Shape Gizmos - Debug visualization for shape centroids, bounds, and axes
 *
 * Renders visual helpers by querying Koota ECS entities:
 * - Globe centroid (with optional XYZ axes)
 * - Globe bounding sphere
 * - Country centroids on globe surface
 * - Particle swarm centroid
 * - Particle swarm bounding sphere (shows breathing range)
 * - Individual shard centroids and wireframes
 * - Connecting lines between neighboring shards (constellation effect)
 *
 * All positions are read from ECS traits managed by GizmoEntities.
 * This ensures consistency with other systems that may use the same data.
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
import { COUNTRY_CENTROIDS, latLngToPosition } from '../lib/countryCentroids';
import { findKNearestNeighbors } from '../shared/gizmoTraits';

// Pre-allocated objects for matrix decomposition
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();

interface ShapeGizmosProps {
  showGlobeCentroid?: boolean;
  showGlobeBounds?: boolean;
  showCountryCentroids?: boolean;
  showSwarmCentroid?: boolean;
  showSwarmBounds?: boolean;
  showShardCentroids?: boolean;
  showShardWireframes?: boolean;
  showShardConnections?: boolean;
  maxShardGizmos?: number;
  showAxes?: boolean;
  showLabels?: boolean;
  globeRadius?: number;
  axisLength?: number;
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

/**
 * XYZ Axes Gizmo following standard conventions:
 * - X axis: Red (right)
 * - Y axis: Green (up)
 * - Z axis: Blue (forward)
 * - Includes cone arrowheads for direction
 */
function AxesGizmo({
  position,
  length = 3.0,
  opacity = 0.9,
  lineWidth = 3,
  arrowSize = 0.15,
}: {
  position: [number, number, number];
  length?: number;
  opacity?: number;
  lineWidth?: number;
  arrowSize?: number;
}) {
  // Arrow geometry shared by all axes
  const coneGeom = useMemo(() => new THREE.ConeGeometry(arrowSize, arrowSize * 2, 8), [arrowSize]);

  return (
    <group position={position}>
      {/* X Axis - Red (right) */}
      <Line
        points={[
          [0, 0, 0],
          [length, 0, 0],
        ]}
        color="#ff3333"
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />
      <mesh position={[length, 0, 0]} rotation={[0, 0, -Math.PI / 2]} geometry={coneGeom}>
        <meshBasicMaterial color="#ff3333" transparent opacity={opacity} />
      </mesh>

      {/* Y Axis - Green (up) */}
      <Line
        points={[
          [0, 0, 0],
          [0, length, 0],
        ]}
        color="#33ff33"
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />
      <mesh position={[0, length, 0]} geometry={coneGeom}>
        <meshBasicMaterial color="#33ff33" transparent opacity={opacity} />
      </mesh>

      {/* Z Axis - Blue (forward) */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, length],
        ]}
        color="#3333ff"
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />
      <mesh position={[0, 0, length]} rotation={[Math.PI / 2, 0, 0]} geometry={coneGeom}>
        <meshBasicMaterial color="#3333ff" transparent opacity={opacity} />
      </mesh>

      {/* Axis labels */}
      <Html position={[length + arrowSize * 2, 0, 0]} center>
        <span
          style={{
            color: '#ff3333',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '0 0 4px #000',
          }}
        >
          X
        </span>
      </Html>
      <Html position={[0, length + arrowSize * 2, 0]} center>
        <span
          style={{
            color: '#33ff33',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '0 0 4px #000',
          }}
        >
          Y
        </span>
      </Html>
      <Html position={[0, 0, length + arrowSize * 2]} center>
        <span
          style={{
            color: '#3333ff',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '0 0 4px #000',
          }}
        >
          Z
        </span>
      </Html>
    </group>
  );
}

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
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.5, size * 2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
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
 * Breathing-animated bounding sphere
 * Pulses opacity and adds glow effect synchronized with breath
 */
function BreathingBoundingSphere({
  radius,
  color = '#ffff00',
  baseOpacity = 0.3,
  label,
}: {
  radius: number;
  color?: string;
  baseOpacity?: number;
  label?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Animate opacity with breathing
  useFrame(() => {
    if (!meshRef.current) return;

    try {
      const breath = world.queryFirst(breathPhase, orbitRadius);
      if (breath) {
        const phase = breath.get(breathPhase);
        if (phase) {
          // Use breath phase to modulate opacity (0.3 to 0.7)
          const pulseOpacity = baseOpacity + phase.value * 0.4;
          const material = meshRef.current.material as THREE.MeshBasicMaterial;
          material.opacity = pulseOpacity;
        }
      }
    } catch (_e) {
      // Ignore ECS errors
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={baseOpacity} />
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
              textShadow: `0 0 8px ${color}`,
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================
// DATA TYPES
// ============================================================

interface ShardData {
  index: number;
  position: [number, number, number];
  quaternion: THREE.Quaternion;
  scale: number;
  neighbors: number[];
}

interface CountryGizmoData {
  code: string;
  position: [number, number, number];
}

// ============================================================
// SHARD GIZMOS (constellation connections) - Optimized with instancing
// ============================================================

/**
 * Instanced shard centroids - single draw call for all centroids
 */
function InstancedCentroids({ shards, size = 0.04 }: { shards: ShardData[]; size?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(size, 8, 6), [size]);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ff66ff', transparent: true, opacity: 0.9 }),
    [],
  );

  // Update instance matrices when shards change
  useFrame(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      _tempMatrix.makeTranslation(shard.position[0], shard.position[1], shard.position[2]);
      mesh.setMatrixAt(i, _tempMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = shards.length;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, shards.length]} frustumCulled={false} />
  );
}

/**
 * Instanced wireframes - single draw call for all wireframes
 */
function InstancedWireframes({ shards, shardSize }: { shards: ShardData[]; shardSize: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(shardSize, 0), [shardSize]);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#00ffff',
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      }),
    [],
  );

  // Update instance matrices when shards change
  useFrame(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      _tempMatrix.compose(
        new THREE.Vector3(...shard.position),
        shard.quaternion,
        new THREE.Vector3(shard.scale, shard.scale, shard.scale),
      );
      mesh.setMatrixAt(i, _tempMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = shards.length;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, shards.length]} frustumCulled={false} />
  );
}

/**
 * Batched connection lines with distance-based coloring
 * Single draw call for all connections using LineSegments
 */
function BatchedConnectionLines({ shards }: { shards: ShardData[] }) {
  const linesRef = useRef<THREE.LineSegments>(null);

  // Build connection data with distances
  const connectionData = useMemo(() => {
    const shardMap = new Map(shards.map((s) => [s.index, s]));
    const drawnConnections = new Set<string>();
    const connections: Array<{
      from: [number, number, number];
      to: [number, number, number];
      distance: number;
    }> = [];

    for (const shard of shards) {
      for (const neighborIndex of shard.neighbors) {
        const connectionKey =
          shard.index < neighborIndex
            ? `${shard.index}-${neighborIndex}`
            : `${neighborIndex}-${shard.index}`;

        if (drawnConnections.has(connectionKey)) continue;
        drawnConnections.add(connectionKey);

        const neighbor = shardMap.get(neighborIndex);
        if (neighbor) {
          const dx = shard.position[0] - neighbor.position[0];
          const dy = shard.position[1] - neighbor.position[1];
          const dz = shard.position[2] - neighbor.position[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          connections.push({
            from: shard.position,
            to: neighbor.position,
            distance,
          });
        }
      }
    }

    return connections;
  }, [shards]);

  // Create geometry with vertex colors based on distance
  const { geometry, material } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    // Find min/max distance for normalization
    let minDist = Infinity;
    let maxDist = 0;
    for (const conn of connectionData) {
      if (conn.distance < minDist) minDist = conn.distance;
      if (conn.distance > maxDist) maxDist = conn.distance;
    }
    const distRange = maxDist - minDist || 1;

    // Build positions and colors
    for (const conn of connectionData) {
      positions.push(...conn.from, ...conn.to);

      // Normalize distance: 0 = shortest (bright), 1 = longest (dim)
      const t = (conn.distance - minDist) / distRange;

      // Color gradient: magenta (short) -> cyan (long)
      const r = 1.0 - t * 0.5;
      const g = 0.4 + t * 0.6;
      const b = 1.0;
      const alpha = 0.8 - t * 0.4;

      // Both vertices get same color
      colors.push(r, g, b, alpha, r, g, b, alpha);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 1,
    });

    return { geometry: geo, material: mat };
  }, [connectionData]);

  if (connectionData.length === 0) return null;

  return <lineSegments ref={linesRef} geometry={geometry} material={material} />;
}

/**
 * ShardGizmos - Optimized component using instancing
 * Reduces draw calls from O(n) to O(1) per gizmo type
 */
function ShardGizmos({
  shards,
  showCentroids,
  showWireframes,
  showConnections,
  shardSize,
}: {
  shards: ShardData[];
  showCentroids: boolean;
  showWireframes: boolean;
  showConnections: boolean;
  showLabels: boolean;
  shardSize: number;
}) {
  if (shards.length === 0) return null;

  return (
    <group name="Shard Gizmos">
      {/* Instanced centroids - 1 draw call for all */}
      {showCentroids && <InstancedCentroids shards={shards} size={0.04} />}

      {/* Instanced wireframes - 1 draw call for all */}
      {showWireframes && <InstancedWireframes shards={shards} shardSize={shardSize} />}

      {/* Batched connection lines - 1 draw call for all */}
      {showConnections && <BatchedConnectionLines shards={shards} />}
    </group>
  );
}

// ============================================================
// COUNTRY GIZMOS
// ============================================================

function CountryGizmosRenderer({
  countries,
  showLabels,
  globeRotationY,
}: {
  countries: CountryGizmoData[];
  showLabels: boolean;
  globeRotationY: number;
}) {
  return (
    <group rotation={[0, globeRotationY, 0]} name="Country Gizmos">
      {countries.map((country) => (
        <group key={country.code} position={country.position}>
          <mesh>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial color="#ffaa00" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.04, 0.06, 16]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          {showLabels && (
            <Html position={[0, 0.12, 0]} center>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#ffaa00',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {country.code}
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ShapeGizmos({
  showGlobeCentroid = false,
  showGlobeBounds = false,
  showCountryCentroids = false,
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

  // State for rendering
  const [shards, setShards] = useState<ShardData[]>([]);
  const [countries, setCountries] = useState<CountryGizmoData[]>([]);
  const [currentOrbit, setCurrentOrbit] = useState<number>(VISUALS.PARTICLE_ORBIT_MAX);
  const [globeRotationY, setGlobeRotationY] = useState(0);
  const [shardSize, setShardSize] = useState(0.5);
  const frameCountRef = useRef(0);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);

  const showShardGizmos = showShardCentroids || showShardWireframes || showShardConnections;

  // Read data from scene and Koota ECS
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Scene data synchronization requires matrix decomposition and multiple queries
  useFrame(() => {
    try {
      // Throttle updates to every 2 frames for responsiveness
      frameCountRef.current += 1;
      if (frameCountRef.current % 2 !== 0) return;

      // Track globe rotation (same as GeoMarkers: 0.0008 rad/frame)
      if (showCountryCentroids) {
        setGlobeRotationY((prev) => prev - 0.0008);
      }

      // Read current orbit from breath system
      if (showSwarmBounds) {
        const breath = world.queryFirst(breathPhase, orbitRadius);
        if (breath) {
          const orbit = breath.get(orbitRadius);
          if (orbit) {
            setCurrentOrbit(orbit.value);
          }
        }
      }

      // Calculate country positions directly (matching GeoMarkers exactly)
      // Uses same height offset: globeRadius + 0.3
      if (showCountryCentroids && countries.length === 0) {
        const countryList: CountryGizmoData[] = [];
        const markerRadius = globeRadius + 0.3; // Same as GeoMarkers heightOffset

        for (const [code, centroid] of Object.entries(COUNTRY_CENTROIDS)) {
          const position = latLngToPosition(centroid.lat, centroid.lng, markerRadius);
          countryList.push({ code, position });
        }

        if (countryList.length > 0) {
          setCountries(countryList);
        }
      }

      // Read shard data DIRECTLY from InstancedMesh (not ECS)
      if (showShardGizmos) {
        // Find the InstancedMesh if not cached
        if (!instancedMeshRef.current) {
          scene.traverse((obj) => {
            if (obj.name === 'Particle Swarm' && obj instanceof THREE.InstancedMesh) {
              instancedMeshRef.current = obj;
            }
          });
        }

        const mesh = instancedMeshRef.current;
        if (mesh) {
          const count = Math.min(mesh.count, maxShardGizmos);
          const shardList: ShardData[] = [];
          const positions: Array<{ index: number; x: number; y: number; z: number }> = [];
          let maxScale = 0;

          // Extract positions from instance matrices
          for (let i = 0; i < count; i++) {
            mesh.getMatrixAt(i, _tempMatrix);
            _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

            // Only include visible shards
            if (_tempScale.x > 0.01) {
              positions.push({
                index: i,
                x: _tempPosition.x,
                y: _tempPosition.y,
                z: _tempPosition.z,
              });

              shardList.push({
                index: i,
                position: [_tempPosition.x, _tempPosition.y, _tempPosition.z],
                quaternion: _tempQuaternion.clone(),
                scale: _tempScale.x,
                neighbors: [], // Will fill in below
              });

              if (_tempScale.x > maxScale) {
                maxScale = _tempScale.x;
              }
            }
          }

          // Calculate k-nearest neighbors for each shard
          for (const shard of shardList) {
            shard.neighbors = findKNearestNeighbors(shard.index, positions, 4);
          }

          setShards(shardList);
          if (maxScale > 0) {
            setShardSize(maxScale * 0.5);
          }
        }
      }
    } catch (_e) {
      // Ignore errors during hot-reload
    }
  });

  // Don't render if nothing is enabled
  if (
    !showGlobeCentroid &&
    !showGlobeBounds &&
    !showCountryCentroids &&
    !showSwarmCentroid &&
    !showSwarmBounds &&
    !showShardGizmos
  ) {
    return null;
  }

  return (
    <group name="Shape Gizmos">
      {/* Globe Gizmos - XYZ axes always visible when centroid shown */}
      {showGlobeCentroid && (
        <>
          <CentroidMarker
            position={[0, 0, 0]}
            color="#f8d0a8"
            size={0.1}
            label={showLabels ? 'Globe Centroid (0, 0, 0)' : undefined}
          />
          {/* Always show axes from globe center - extends to max orbit for visibility */}
          <AxesGizmo position={[0, 0, 0]} length={VISUALS.PARTICLE_ORBIT_MAX} opacity={0.9} />
        </>
      )}

      {showGlobeBounds && (
        <>
          <BoundingSphere
            radius={globeRadius}
            color="#f8d0a8"
            opacity={0.4}
            label={showLabels ? `Core r=${globeRadius}` : undefined}
          />
          <BoundingSphere
            radius={globeRadius * 1.22}
            color="#c4b8e8"
            opacity={0.2}
            label={showLabels ? `Atmosphere r=${(globeRadius * 1.22).toFixed(2)}` : undefined}
          />
        </>
      )}

      {showCountryCentroids && countries.length > 0 && (
        <CountryGizmosRenderer
          countries={countries}
          showLabels={showLabels}
          globeRotationY={globeRotationY}
        />
      )}

      {/* Swarm Gizmos */}
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

      {showSwarmBounds && (
        <>
          <BoundingSphere
            radius={VISUALS.PARTICLE_ORBIT_MIN}
            color="#00ff88"
            opacity={0.2}
            label={showLabels ? `Min Orbit r=${VISUALS.PARTICLE_ORBIT_MIN}` : undefined}
          />
          <BoundingSphere
            radius={VISUALS.PARTICLE_ORBIT_MAX}
            color="#ff8800"
            opacity={0.2}
            label={showLabels ? `Max Orbit r=${VISUALS.PARTICLE_ORBIT_MAX}` : undefined}
          />
          {/* Breathing-animated current orbit sphere */}
          <BreathingBoundingSphere
            radius={currentOrbit}
            color="#ffff00"
            baseOpacity={0.3}
            label={showLabels ? `Current r=${currentOrbit.toFixed(2)}` : undefined}
          />
        </>
      )}

      {/* Shard Gizmos */}
      {showShardGizmos && (
        <ShardGizmos
          shards={shards}
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
