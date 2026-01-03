/**
 * Shape Gizmo Traits
 *
 * Koota ECS traits for storing shape metadata (centroids, bounds, orientation)
 * that can be queried by the gizmo visualization system and reused for
 * positioning/anchoring other elements, effects, or UI components.
 *
 * Architecture:
 * - GlobeShape: Single entity for the central globe
 * - SwarmShape: Single entity for the particle swarm bounds
 * - ShardShape: One entity per visible particle shard
 * - CountryShape: One entity per country centroid
 *
 * Usage:
 * - gizmoSystem updates these traits each frame from scene data
 * - Query traits to get real-time centroid/bounds data
 * - Use for anchoring effects, tooltips, or other elements to shapes
 */
import { trait } from 'koota';

/**
 * Shape types that can have gizmos
 */
export type ShapeType = 'globe' | 'swarm' | 'shard' | 'country';

// ============================================================
// CORE SHAPE TRAITS
// ============================================================

/**
 * Shape centroid trait - stores the center position of a shape
 *
 * Consumed by: ShapeGizmos (debug visualization), future anchoring systems
 */
export const shapeCentroid = trait({
  /** Shape identifier */
  shapeId: '' as string,
  /** Type of shape for filtering */
  shapeType: 'globe' as ShapeType,
  /** X coordinate of centroid (world space) */
  x: 0,
  /** Y coordinate of centroid (world space) */
  y: 0,
  /** Z coordinate of centroid (world space) */
  z: 0,
});

/**
 * Shape bounds trait - stores bounding sphere radius
 *
 * Consumed by: ShapeGizmos (debug visualization), collision detection
 */
export const shapeBounds = trait({
  /** Shape identifier (matches shapeCentroid.shapeId) */
  shapeId: '' as string,
  /** Bounding sphere radius */
  radius: 1,
  /** Inner radius (for hollow shapes like swarm) */
  innerRadius: 0,
});

/**
 * Shape orientation trait - stores rotation as quaternion
 *
 * Consumed by: ShapeGizmos (axis/wireframe visualization), aligned effects
 */
export const shapeOrientation = trait({
  /** Shape identifier */
  shapeId: '' as string,
  /** Quaternion X */
  qx: 0,
  /** Quaternion Y */
  qy: 0,
  /** Quaternion Z */
  qz: 0,
  /** Quaternion W */
  qw: 1,
});

/**
 * Shape scale trait - stores uniform or non-uniform scale
 *
 * Consumed by: ShapeGizmos (wireframe sizing)
 */
export const shapeScale = trait({
  /** Shape identifier */
  shapeId: '' as string,
  /** Scale factor (uniform) or X scale */
  scale: 1,
});

// ============================================================
// SHARD-SPECIFIC TRAITS
// ============================================================

/**
 * Shard index trait - stores the instance index in the InstancedMesh
 *
 * Used for: Identifying specific shards, neighbor calculations
 */
export const shardIndex = trait({
  /** Instance index in the InstancedMesh */
  index: 0,
});

/**
 * Shard neighbors trait - stores indices of neighboring shards
 *
 * Used for: Connection line visualization, constellation effect
 */
export const shardNeighbors = trait({
  /** Array of neighbor shard indices (up to 6 nearest) */
  neighborIndices: [] as number[],
});

// ============================================================
// COUNTRY-SPECIFIC TRAITS
// ============================================================

/**
 * Country data trait - stores country metadata
 *
 * Used for: Country centroid gizmos, GeoMarker alignment
 */
export const countryData = trait({
  /** ISO 3166-1 alpha-2 country code */
  code: '' as string,
  /** Country name */
  name: '' as string,
  /** Latitude in degrees */
  lat: 0,
  /** Longitude in degrees */
  lng: 0,
});

// ============================================================
// GLOBE-SPECIFIC TRAITS
// ============================================================

/**
 * Globe rotation trait - tracks the globe's auto-rotation
 *
 * Used for: Syncing country markers with globe texture
 */
export const globeRotation = trait({
  /** Current Y rotation in radians */
  rotationY: 0,
});

// ============================================================
// SWARM-SPECIFIC TRAITS
// ============================================================

/**
 * Swarm state trait - stores current swarm animation state
 *
 * Used for: Orbit bounds visualization, particle count
 */
export const swarmState = trait({
  /** Current orbit radius (animated) */
  currentOrbit: 4.5,
  /** Number of visible shards */
  visibleCount: 0,
});

// ============================================================
// MARKER TRAITS (for linking gizmos to shapes)
// ============================================================

/**
 * Globe marker - identifies the globe entity
 */
export const isGlobe = trait({});

/**
 * Swarm marker - identifies the swarm entity
 */
export const isSwarm = trait({});

/**
 * Shard marker - identifies shard entities
 */
export const isShard = trait({});

/**
 * Country marker - identifies country entities
 */
export const isCountry = trait({});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate squared distance between two centroids (for neighbor finding)
 */
export function distanceSquared(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Find k nearest neighbors for a shard
 * Returns array of {index, distanceSq} sorted by distance
 */
export function findKNearestNeighbors(
  shardIndex: number,
  allCentroids: Array<{ index: number; x: number; y: number; z: number }>,
  k: number,
): number[] {
  const target = allCentroids.find((c) => c.index === shardIndex);
  if (!target) return [];

  // Calculate distances to all other shards
  const distances: Array<{ index: number; distSq: number }> = [];
  for (const other of allCentroids) {
    if (other.index === shardIndex) continue;
    distances.push({
      index: other.index,
      distSq: distanceSquared(target, other),
    });
  }

  // Sort by distance and take k nearest
  distances.sort((a, b) => a.distSq - b.distSq);
  return distances.slice(0, k).map((d) => d.index);
}
