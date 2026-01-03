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
import {
  countryData,
  findKNearestNeighbors,
  globeRotation,
  isCountry,
  isGlobe,
  shapeCentroid,
} from '../shared/gizmoTraits';

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
// SHARD GIZMOS (constellation connections)
// ============================================================

function ShardGizmos({
  shards,
  showCentroids,
  showWireframes,
  showConnections,
  showLabels,
  shardSize,
}: {
  shards: ShardData[];
  showCentroids: boolean;
  showWireframes: boolean;
  showConnections: boolean;
  showLabels: boolean;
  shardSize: number;
}) {
  const wireframeGeometry = useMemo(() => new THREE.IcosahedronGeometry(shardSize, 0), [shardSize]);
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

  // Build connection lines (each shard to its neighbors)
  const connectionLines = useMemo(() => {
    if (!showConnections) return [];

    const lines: Array<{
      key: string;
      from: [number, number, number];
      to: [number, number, number];
    }> = [];
    const shardMap = new Map(shards.map((s) => [s.index, s]));
    const drawnConnections = new Set<string>();

    for (const shard of shards) {
      for (const neighborIndex of shard.neighbors) {
        // Create a unique key for this connection (order-independent)
        const connectionKey =
          shard.index < neighborIndex
            ? `${shard.index}-${neighborIndex}`
            : `${neighborIndex}-${shard.index}`;

        // Skip if we already drew this connection
        if (drawnConnections.has(connectionKey)) continue;
        drawnConnections.add(connectionKey);

        const neighbor = shardMap.get(neighborIndex);
        if (neighbor) {
          lines.push({
            key: connectionKey,
            from: shard.position,
            to: neighbor.position,
          });
        }
      }
    }

    return lines;
  }, [shards, showConnections]);

  if (shards.length === 0) return null;

  return (
    <group name="Shard Gizmos">
      {showCentroids &&
        shards.map((shard) => (
          <CentroidMarker
            key={`centroid-${shard.index}`}
            position={shard.position}
            color="#ff66ff"
            size={0.04}
            label={showLabels ? `#${shard.index}` : undefined}
          />
        ))}

      {showWireframes &&
        shards.map((shard) => (
          <mesh
            key={`wireframe-${shard.index}`}
            position={shard.position}
            quaternion={shard.quaternion}
            scale={shard.scale}
            geometry={wireframeGeometry}
            material={wireframeMaterial}
          />
        ))}

      {showConnections &&
        connectionLines.map((line) => (
          <Line
            key={`connection-${line.key}`}
            points={[line.from, line.to]}
            color="#ff66ff"
            lineWidth={1}
            transparent
            opacity={0.5}
          />
        ))}
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

      // Read globe rotation from ECS
      if (showCountryCentroids) {
        const globeEntities = world.query(isGlobe, globeRotation);
        for (const globe of globeEntities) {
          const rotation = globe.get(globeRotation);
          if (rotation) {
            setGlobeRotationY(rotation.rotationY);
          }
        }
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

      // Read country positions from ECS (only once)
      if (showCountryCentroids && countries.length === 0) {
        const countryEntities = world.query(isCountry, shapeCentroid, countryData);
        const countryList: CountryGizmoData[] = [];
        for (const country of countryEntities) {
          const centroid = country.get(shapeCentroid);
          const data = country.get(countryData);
          if (centroid && data) {
            countryList.push({
              code: data.code,
              position: [centroid.x, centroid.y, centroid.z],
            });
          }
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
      {/* Globe Gizmos */}
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
            opacity={0.25}
            label={showLabels ? `Min Orbit r=${VISUALS.PARTICLE_ORBIT_MIN}` : undefined}
          />
          <BoundingSphere
            radius={VISUALS.PARTICLE_ORBIT_MAX}
            color="#ff8800"
            opacity={0.25}
            label={showLabels ? `Max Orbit r=${VISUALS.PARTICLE_ORBIT_MAX}` : undefined}
          />
          <BoundingSphere
            radius={currentOrbit}
            color="#ffff00"
            opacity={0.5}
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
