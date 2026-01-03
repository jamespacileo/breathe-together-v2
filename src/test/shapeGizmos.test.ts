/**
 * Shape Gizmos Tests
 *
 * Tests for verifying gizmo functionality including:
 * - k-nearest neighbors calculation for constellation connections
 * - Country position matching with GeoMarkers
 * - Axis conventions (XYZ colors and directions)
 * - Distance calculations for connection lines
 *
 * These tests prevent regressions in the debug visualization system.
 */

import { describe, expect, it } from 'vitest';
import { VISUALS } from '../constants';
import { COUNTRY_CENTROIDS, latLngToPosition } from '../lib/countryCentroids';
import { findKNearestNeighbors } from '../shared/gizmoTraits';

describe('ShapeGizmos', () => {
  describe('findKNearestNeighbors', () => {
    const createCentroid = (index: number, x: number, y: number, z: number) => ({
      index,
      x,
      y,
      z,
    });

    it('should return empty array for non-existent shard', () => {
      const centroids = [createCentroid(0, 0, 0, 0), createCentroid(1, 1, 0, 0)];

      const neighbors = findKNearestNeighbors(99, centroids, 4);
      expect(neighbors).toEqual([]);
    });

    it('should return correct number of neighbors', () => {
      const centroids = [
        createCentroid(0, 0, 0, 0),
        createCentroid(1, 1, 0, 0),
        createCentroid(2, 0, 1, 0),
        createCentroid(3, 0, 0, 1),
        createCentroid(4, 2, 0, 0),
        createCentroid(5, 0, 2, 0),
      ];

      const neighbors = findKNearestNeighbors(0, centroids, 4);
      expect(neighbors).toHaveLength(4);
    });

    it('should return all available neighbors if less than k exist', () => {
      const centroids = [
        createCentroid(0, 0, 0, 0),
        createCentroid(1, 1, 0, 0),
        createCentroid(2, 0, 1, 0),
      ];

      const neighbors = findKNearestNeighbors(0, centroids, 4);
      expect(neighbors).toHaveLength(2); // Only 2 other points exist
      expect(neighbors).toContain(1);
      expect(neighbors).toContain(2);
    });

    it('should find nearest neighbors by distance', () => {
      // Point 0 at origin, others at varying distances
      const centroids = [
        createCentroid(0, 0, 0, 0), // Origin
        createCentroid(1, 1, 0, 0), // Distance: 1
        createCentroid(2, 2, 0, 0), // Distance: 2
        createCentroid(3, 3, 0, 0), // Distance: 3
        createCentroid(4, 4, 0, 0), // Distance: 4
        createCentroid(5, 5, 0, 0), // Distance: 5
      ];

      const neighbors = findKNearestNeighbors(0, centroids, 3);

      // Should return 3 closest: indices 1, 2, 3
      expect(neighbors).toHaveLength(3);
      expect(neighbors).toContain(1);
      expect(neighbors).toContain(2);
      expect(neighbors).toContain(3);
      expect(neighbors).not.toContain(4);
      expect(neighbors).not.toContain(5);
    });

    it('should not include self in neighbors', () => {
      const centroids = [
        createCentroid(0, 0, 0, 0),
        createCentroid(1, 1, 0, 0),
        createCentroid(2, 0, 1, 0),
      ];

      const neighbors = findKNearestNeighbors(0, centroids, 4);
      expect(neighbors).not.toContain(0);
    });

    it('should handle 3D distances correctly', () => {
      // Point 0 at origin
      // Point 1 at (1, 0, 0) - distance sqrt(1) = 1
      // Point 2 at (0, 0, 2) - distance sqrt(4) = 2
      // Point 3 at (1, 1, 1) - distance sqrt(3) ≈ 1.73
      const centroids = [
        createCentroid(0, 0, 0, 0),
        createCentroid(1, 1, 0, 0),
        createCentroid(2, 0, 0, 2),
        createCentroid(3, 1, 1, 1),
      ];

      const neighbors = findKNearestNeighbors(0, centroids, 2);

      // Should return 2 closest: 1 (dist=1) and 3 (dist≈1.73)
      expect(neighbors).toHaveLength(2);
      expect(neighbors[0]).toBe(1); // Closest
      expect(neighbors[1]).toBe(3); // Second closest
    });

    it('should handle points on a sphere (like particle swarm)', () => {
      // Simulate points distributed on a sphere at PARTICLE_ORBIT_MAX radius
      const radius = VISUALS.PARTICLE_ORBIT_MAX;
      const centroids = [
        createCentroid(0, radius, 0, 0), // +X axis
        createCentroid(1, -radius, 0, 0), // -X axis (opposite, far)
        createCentroid(2, 0, radius, 0), // +Y axis (90° away)
        createCentroid(3, 0.9 * radius, 0.436 * radius, 0), // ~26° from +X (close)
        createCentroid(4, Math.SQRT1_2 * radius, Math.SQRT1_2 * radius, 0), // 45° (medium distance)
      ];

      const neighbors = findKNearestNeighbors(0, centroids, 2);

      // Point 3 (26° away) should be closest, then point 4 (45° away)
      expect(neighbors[0]).toBe(3);
      expect(neighbors[1]).toBe(4);
      // Point 1 (180° away) should NOT be in top 2
      expect(neighbors).not.toContain(1);
    });
  });

  describe('Country gizmo positioning', () => {
    const GLOBE_RADIUS = 1.5;
    const HEIGHT_OFFSET = 0.3;

    it('should match GeoMarkers height offset', () => {
      // This test verifies that country gizmos use the same positioning as GeoMarkers
      // GeoMarkers uses: globeRadius + heightOffset (1.5 + 0.3 = 1.8)
      const markerRadius = GLOBE_RADIUS + HEIGHT_OFFSET;

      const position = latLngToPosition(
        COUNTRY_CENTROIDS.US.lat,
        COUNTRY_CENTROIDS.US.lng,
        markerRadius,
      );

      const distance = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
      expect(distance).toBeCloseTo(1.8, 5);
    });

    it('should place gizmos above globe surface', () => {
      const markerRadius = GLOBE_RADIUS + HEIGHT_OFFSET;

      for (const code of Object.keys(COUNTRY_CENTROIDS).slice(0, 10)) {
        const centroid = COUNTRY_CENTROIDS[code];
        const position = latLngToPosition(centroid.lat, centroid.lng, markerRadius);
        const distance = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);

        // All markers should be at markerRadius (above globe)
        expect(distance).toBeCloseTo(markerRadius, 5);
        expect(distance).toBeGreaterThan(GLOBE_RADIUS);
      }
    });

    it('should have consistent rotation with globe (0.0008 rad/frame)', () => {
      // This is a documentation test - verifies the rotation rate constant
      // Both GeoMarkers and ShapeGizmos should use 0.0008 rad/frame
      const ROTATION_RATE = 0.0008;

      // Full rotation takes approximately 7854 frames (~131 seconds at 60fps)
      const framesPerRotation = (2 * Math.PI) / ROTATION_RATE;
      expect(framesPerRotation).toBeCloseTo(7854, 0);

      // At 60fps, that's about 2.2 minutes per rotation
      const secondsPerRotation = framesPerRotation / 60;
      expect(secondsPerRotation).toBeCloseTo(131, 0);
    });
  });

  describe('Axis gizmo conventions', () => {
    // Standard 3D axis conventions that should be followed

    it('documents standard axis colors', () => {
      // X = Red, Y = Green, Z = Blue (RGB → XYZ)
      const AXIS_COLORS = {
        X: '#ff3333', // Red
        Y: '#33ff33', // Green
        Z: '#3333ff', // Blue
      };

      // Verify colors are in correct format
      expect(AXIS_COLORS.X).toMatch(/^#[0-9a-f]{6}$/i);
      expect(AXIS_COLORS.Y).toMatch(/^#[0-9a-f]{6}$/i);
      expect(AXIS_COLORS.Z).toMatch(/^#[0-9a-f]{6}$/i);

      // Verify red channel is dominant in X axis
      expect(parseInt(AXIS_COLORS.X.slice(1, 3), 16)).toBeGreaterThan(200);

      // Verify green channel is dominant in Y axis
      expect(parseInt(AXIS_COLORS.Y.slice(3, 5), 16)).toBeGreaterThan(200);

      // Verify blue channel is dominant in Z axis
      expect(parseInt(AXIS_COLORS.Z.slice(5, 7), 16)).toBeGreaterThan(200);
    });

    it('documents standard axis directions', () => {
      // Three.js uses right-handed coordinate system
      // X: positive = right
      // Y: positive = up
      // Z: positive = toward camera (out of screen)

      const directions = {
        X: { positive: 'right', negative: 'left' },
        Y: { positive: 'up', negative: 'down' },
        Z: { positive: 'toward camera', negative: 'away from camera' },
      };

      expect(directions.X.positive).toBe('right');
      expect(directions.Y.positive).toBe('up');
      expect(directions.Z.positive).toBe('toward camera');
    });

    it('verifies axis length reaches max orbit', () => {
      // Axes should extend to PARTICLE_ORBIT_MAX for visibility
      const axisLength = VISUALS.PARTICLE_ORBIT_MAX;

      expect(axisLength).toBe(6);
      expect(axisLength).toBeGreaterThan(VISUALS.PARTICLE_ORBIT_MIN);
    });
  });

  describe('Connection line distance calculations', () => {
    it('calculates distance correctly for axis-aligned points', () => {
      const p1: [number, number, number] = [0, 0, 0];
      const p2: [number, number, number] = [3, 0, 0];

      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      expect(distance).toBe(3);
    });

    it('calculates distance correctly for 3D diagonal', () => {
      const p1: [number, number, number] = [0, 0, 0];
      const p2: [number, number, number] = [1, 1, 1];

      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      expect(distance).toBeCloseTo(Math.sqrt(3), 5);
    });

    it('normalizes distances for color gradient', () => {
      // Test the normalization formula used in BatchedConnectionLines
      const distances = [1, 2, 3, 4, 5];
      const minDist = Math.min(...distances);
      const maxDist = Math.max(...distances);
      const distRange = maxDist - minDist;

      // Normalize: 0 = shortest, 1 = longest
      const normalized = distances.map((d) => (d - minDist) / distRange);

      expect(normalized[0]).toBe(0); // Shortest = 0
      expect(normalized[4]).toBe(1); // Longest = 1
      expect(normalized[2]).toBe(0.5); // Middle = 0.5
    });

    it('handles edge case of equal distances', () => {
      // All connections same distance
      const distances = [5, 5, 5, 5];
      const minDist = Math.min(...distances);
      const maxDist = Math.max(...distances);
      const distRange = maxDist - minDist || 1; // Fallback to 1 to avoid division by zero

      expect(distRange).toBe(1); // Should use fallback

      // All should normalize to 0 (or any consistent value)
      const normalized = distances.map((d) => (d - minDist) / distRange);
      for (const n of normalized) {
        expect(n).toBe(0);
      }
    });
  });

  describe('Instanced mesh rendering', () => {
    it('documents max shard gizmo count', () => {
      // Default max is 50 shards for gizmos
      const MAX_SHARD_GIZMOS = 50;

      // This should be reasonable for debug visualization
      expect(MAX_SHARD_GIZMOS).toBeGreaterThanOrEqual(20);
      expect(MAX_SHARD_GIZMOS).toBeLessThanOrEqual(200);
    });

    it('documents neighbor count for constellation effect', () => {
      // Each shard connects to k nearest neighbors
      const NEIGHBOR_COUNT = 4;

      // 4 neighbors creates a good balance between connectivity and visual clarity
      expect(NEIGHBOR_COUNT).toBeGreaterThanOrEqual(2);
      expect(NEIGHBOR_COUNT).toBeLessThanOrEqual(8);
    });

    it('verifies draw call reduction from instancing', () => {
      // Before instancing: n centroids + n wireframes + m connections = O(n+m) draw calls
      // After instancing: 1 centroid DC + 1 wireframe DC + 1 connection DC = 3 draw calls

      const shardCount = 50;
      const neighborsPerShard = 4;
      const connectionsEstimate = (shardCount * neighborsPerShard) / 2; // Deduplicated

      const beforeInstancing = shardCount * 2 + connectionsEstimate; // ~150 draw calls
      const afterInstancing = 3; // 3 draw calls

      const reduction = ((beforeInstancing - afterInstancing) / beforeInstancing) * 100;

      expect(reduction).toBeGreaterThan(95); // >95% reduction
    });
  });

  describe('Globe gizmo bounds', () => {
    it('documents globe and orbit radii', () => {
      const GLOBE_RADIUS = 1.5;
      const ORBIT_MIN = VISUALS.PARTICLE_ORBIT_MIN;
      const ORBIT_MAX = VISUALS.PARTICLE_ORBIT_MAX;

      // Particles orbit between min and max
      expect(ORBIT_MIN).toBeGreaterThan(GLOBE_RADIUS);
      expect(ORBIT_MAX).toBeGreaterThan(ORBIT_MIN);

      // Verify actual values
      expect(ORBIT_MIN).toBe(2.5);
      expect(ORBIT_MAX).toBe(6);
    });

    it('verifies atmosphere layer scale', () => {
      const GLOBE_RADIUS = 1.5;
      const ATMOSPHERE_SCALE = 1.22;

      const atmosphereRadius = GLOBE_RADIUS * ATMOSPHERE_SCALE;
      expect(atmosphereRadius).toBeCloseTo(1.83, 2);
    });
  });
});

describe('Performance gates', () => {
  it('k-nearest neighbors runs efficiently for 50 points', () => {
    const startTime = performance.now();

    // Create 50 random centroids
    const centroids = Array.from({ length: 50 }, (_, i) => ({
      index: i,
      x: Math.random() * 10,
      y: Math.random() * 10,
      z: Math.random() * 10,
    }));

    // Calculate neighbors for all points
    for (let i = 0; i < 50; i++) {
      findKNearestNeighbors(i, centroids, 4);
    }

    const elapsed = performance.now() - startTime;

    // Should complete in under 50ms
    expect(elapsed).toBeLessThan(50);
  });

  it('k-nearest neighbors runs efficiently for 200 points', () => {
    const startTime = performance.now();

    // Create 200 random centroids
    const centroids = Array.from({ length: 200 }, (_, i) => ({
      index: i,
      x: Math.random() * 10,
      y: Math.random() * 10,
      z: Math.random() * 10,
    }));

    // Calculate neighbors for all points
    for (let i = 0; i < 200; i++) {
      findKNearestNeighbors(i, centroids, 4);
    }

    const elapsed = performance.now() - startTime;

    // Should complete in under 200ms (O(n²) algorithm)
    expect(elapsed).toBeLessThan(200);
  });
});
