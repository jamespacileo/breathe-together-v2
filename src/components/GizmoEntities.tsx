/**
 * GizmoEntities - Manages Koota ECS entities for shape gizmos
 *
 * Spawns and updates ECS entities for:
 * - Globe: Central globe with centroid and bounds
 * - Swarm: Particle swarm with orbit bounds
 * - Shards: Individual particle positions with neighbor connections
 * - Countries: Country centroids on the globe surface
 *
 * These entities can be queried by other systems for:
 * - Anchoring effects to shape positions
 * - Collision detection
 * - Spawning particles at shape locations
 * - UI element positioning
 */

import { useFrame, useThree } from '@react-three/fiber';
import type { World } from 'koota';
import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../constants';
import { breathPhase, orbitRadius } from '../entities/breath/traits';
import { COUNTRY_CENTROIDS, latLngToPosition } from '../lib/countryCentroids';
import {
  countryData,
  findKNearestNeighbors,
  globeRotation,
  isCountry,
  isGlobe,
  isShard,
  isSwarm,
  shapeBounds,
  shapeCentroid,
  shapeOrientation,
  shapeScale,
  shardIndex,
  shardNeighbors,
  swarmState,
} from '../shared/gizmoTraits';

// Pre-allocated objects for matrix decomposition
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();

// Configuration
const NEIGHBOR_COUNT = 4; // Number of neighbors to connect each shard to
const UPDATE_INTERVAL = 4; // Update every N frames

interface GizmoEntitiesProps {
  /** Enable gizmo entity updates (set to false when gizmos not visible) */
  enabled?: boolean;
  /** Maximum shards to track */
  maxShards?: number;
  /** Globe radius */
  globeRadius?: number;
}

/**
 * Initialize globe and swarm entities (called once on mount)
 */
function initializeStaticEntities(world: World, globeRadius: number) {
  // Spawn Globe entity
  world.spawn(
    isGlobe(),
    shapeCentroid({ shapeId: 'globe', shapeType: 'globe', x: 0, y: 0, z: 0 }),
    shapeBounds({ shapeId: 'globe', radius: globeRadius, innerRadius: 0 }),
    globeRotation({ rotationY: 0 }),
  );

  // Spawn Swarm entity
  world.spawn(
    isSwarm(),
    shapeCentroid({ shapeId: 'swarm', shapeType: 'swarm', x: 0, y: 0, z: 0 }),
    shapeBounds({
      shapeId: 'swarm',
      radius: VISUALS.PARTICLE_ORBIT_MAX,
      innerRadius: VISUALS.PARTICLE_ORBIT_MIN,
    }),
    swarmState({ currentOrbit: VISUALS.PARTICLE_ORBIT_MAX, visibleCount: 0 }),
  );

  // Spawn Country entities
  for (const [code, centroid] of Object.entries(COUNTRY_CENTROIDS)) {
    const position = latLngToPosition(centroid.lat, centroid.lng, globeRadius);
    world.spawn(
      isCountry(),
      shapeCentroid({
        shapeId: `country-${code}`,
        shapeType: 'country',
        x: position[0],
        y: position[1],
        z: position[2],
      }),
      countryData({
        code,
        name: centroid.name,
        lat: centroid.lat,
        lng: centroid.lng,
      }),
    );
  }
}

/**
 * Update shard entities from InstancedMesh data
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Shard entity management requires matrix decomposition, entity spawning/updating, and neighbor calculation
function updateShardEntities(
  world: World,
  mesh: THREE.InstancedMesh,
  maxShards: number,
  existingShardEntities: Map<number, ReturnType<World['spawn']>>,
) {
  const count = Math.min(mesh.count, maxShards);
  const visibleShards: Array<{ index: number; x: number; y: number; z: number }> = [];

  // Extract positions from instance matrices
  for (let i = 0; i < count; i++) {
    mesh.getMatrixAt(i, _tempMatrix);
    _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

    // Only process visible shards
    if (_tempScale.x > 0.01) {
      visibleShards.push({
        index: i,
        x: _tempPosition.x,
        y: _tempPosition.y,
        z: _tempPosition.z,
      });

      // Get or create entity for this shard
      let entity = existingShardEntities.get(i);

      if (!entity) {
        // Spawn new shard entity
        entity = world.spawn(
          isShard(),
          shardIndex({ index: i }),
          shapeCentroid({
            shapeId: `shard-${i}`,
            shapeType: 'shard',
            x: _tempPosition.x,
            y: _tempPosition.y,
            z: _tempPosition.z,
          }),
          shapeOrientation({
            shapeId: `shard-${i}`,
            qx: _tempQuaternion.x,
            qy: _tempQuaternion.y,
            qz: _tempQuaternion.z,
            qw: _tempQuaternion.w,
          }),
          shapeScale({ shapeId: `shard-${i}`, scale: _tempScale.x }),
          shardNeighbors({ neighborIndices: [] }),
        );
        existingShardEntities.set(i, entity);
      } else {
        // Update existing entity
        try {
          const centroid = entity.get(shapeCentroid);
          if (centroid) {
            centroid.x = _tempPosition.x;
            centroid.y = _tempPosition.y;
            centroid.z = _tempPosition.z;
          }

          const orientation = entity.get(shapeOrientation);
          if (orientation) {
            orientation.qx = _tempQuaternion.x;
            orientation.qy = _tempQuaternion.y;
            orientation.qz = _tempQuaternion.z;
            orientation.qw = _tempQuaternion.w;
          }

          const scale = entity.get(shapeScale);
          if (scale) {
            scale.scale = _tempScale.x;
          }
        } catch (_e) {
          // Entity may have been destroyed
          existingShardEntities.delete(i);
        }
      }
    }
  }

  // Calculate neighbors for each shard
  for (const shard of visibleShards) {
    const entity = existingShardEntities.get(shard.index);
    if (entity) {
      try {
        const neighbors = entity.get(shardNeighbors);
        if (neighbors) {
          neighbors.neighborIndices = findKNearestNeighbors(
            shard.index,
            visibleShards,
            NEIGHBOR_COUNT,
          );
        }
      } catch (_e) {
        // Entity may have been destroyed
      }
    }
  }

  // Update swarm state
  const swarmEntities = world.query(isSwarm, swarmState);
  for (const swarm of swarmEntities) {
    const state = swarm.get(swarmState);
    if (state) {
      state.visibleCount = visibleShards.length;
    }
  }

  return visibleShards.length;
}

/**
 * GizmoEntities Component
 *
 * Manages ECS entities for shape gizmos. Spawns static entities on mount
 * and updates dynamic entities (shards) each frame.
 */
export function GizmoEntities({
  enabled = true,
  maxShards = 100,
  globeRadius = 1.5,
}: GizmoEntitiesProps) {
  const world = useWorld();
  const { scene } = useThree();

  // Track spawned entities
  const shardEntitiesRef = useRef<Map<number, ReturnType<World['spawn']>>>(new Map());
  const staticEntitiesSpawnedRef = useRef(false);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const frameCountRef = useRef(0);

  // Initialize static entities on mount
  useEffect(() => {
    if (staticEntitiesSpawnedRef.current) return;

    try {
      initializeStaticEntities(world, globeRadius);
      staticEntitiesSpawnedRef.current = true;
    } catch (_e) {
      // World may not be ready yet
    }

    // Cleanup on unmount
    return () => {
      // Destroy all spawned entities
      try {
        for (const entity of world.query(isGlobe)) {
          entity.destroy();
        }
        for (const entity of world.query(isSwarm)) {
          entity.destroy();
        }
        for (const entity of world.query(isShard)) {
          entity.destroy();
        }
        for (const entity of world.query(isCountry)) {
          entity.destroy();
        }
      } catch (_e) {
        // World may already be destroyed
      }
      shardEntitiesRef.current.clear();
      staticEntitiesSpawnedRef.current = false;
    };
  }, [world, globeRadius]);

  // Update entities each frame
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Frame update requires syncing multiple ECS entity types with scene data
  useFrame(() => {
    if (!enabled) return;

    try {
      // Update globe rotation (syncs with EarthGlobe's 0.0008 rad/frame)
      const globeEntities = world.query(isGlobe, globeRotation);
      for (const globe of globeEntities) {
        const rotation = globe.get(globeRotation);
        if (rotation) {
          rotation.rotationY -= 0.0008;
        }
      }

      // Update swarm orbit from breath system
      const breath = world.queryFirst(breathPhase, orbitRadius);
      if (breath) {
        const currentOrbit = breath.get(orbitRadius)?.value ?? VISUALS.PARTICLE_ORBIT_MAX;
        const swarmEntities = world.query(isSwarm, swarmState);
        for (const swarm of swarmEntities) {
          const state = swarm.get(swarmState);
          if (state) {
            state.currentOrbit = currentOrbit;
          }
        }
      }

      // Throttle shard updates
      frameCountRef.current += 1;
      if (frameCountRef.current % UPDATE_INTERVAL !== 0) return;

      // Find InstancedMesh if not cached
      if (!instancedMeshRef.current) {
        scene.traverse((obj) => {
          if (obj.name === 'Particle Swarm' && obj instanceof THREE.InstancedMesh) {
            instancedMeshRef.current = obj;
          }
        });
      }

      // Update shard entities
      if (instancedMeshRef.current) {
        updateShardEntities(world, instancedMeshRef.current, maxShards, shardEntitiesRef.current);
      }
    } catch (_e) {
      // Ignore ECS errors during hot-reload
    }
  });

  // This component doesn't render anything
  return null;
}

export default GizmoEntities;
