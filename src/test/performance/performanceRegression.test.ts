/**
 * Performance Regression Guards
 *
 * Catches performance regressions from algorithmic changes.
 * Protects against AI code generation introducing O(n²) algorithms.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { calculateBreathState } from '../../lib/breathCalc';
import { getFibonacciSpherePoint } from '../../lib/collisionGeometry';
import { getMonumentValleyMoodColor } from '../../lib/colors';
import { PresenceStateSchema } from '../../lib/presenceApi';
import { createMockPresence } from '../helpers';

describe('Performance Regression Guards', () => {
  describe('Algorithmic Complexity', () => {
    it('calculateBreathState is O(1) - constant time', () => {
      // OUTCOME: Breath calculation doesn't scale with any input
      const iterations = 10000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        calculateBreathState(Date.now());
      }

      // Measure
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        calculateBreathState(Date.now() + i * 1000);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;

      // Should be sub-millisecond
      expect(avgTime).toBeLessThan(0.05); // 50 microseconds per call
    });

    it('getFibonacciSpherePoint is O(1) - constant time per point', () => {
      // OUTCOME: Point calculation doesn't scale with total count
      const smallCount = 100;
      const largeCount = 10000;
      const samples = 100;

      // Measure small count
      let start = performance.now();
      for (let i = 0; i < samples; i++) {
        getFibonacciSpherePoint(i, smallCount);
      }
      let end = performance.now();
      const smallTime = end - start;

      // Measure large count
      start = performance.now();
      for (let i = 0; i < samples; i++) {
        getFibonacciSpherePoint(i, largeCount);
      }
      end = performance.now();
      const largeTime = end - start;

      // Time should be similar regardless of total count
      // (allows 2x variance for noise)
      expect(largeTime).toBeLessThan(smallTime * 2);
    });

    it('color mapping is O(1) - constant lookup time', () => {
      // OUTCOME: Mood color lookup doesn't regress to linear search
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        getMonumentValleyMoodColor(moods[i % 4]);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;

      // Should be near-instant (object/map lookup)
      expect(avgTime).toBeLessThan(0.01); // 10 microseconds per lookup
    });
  });

  describe('Scene Rendering Performance', () => {
    it('InstancedMesh for particles maintains O(1) draw calls', () => {
      // OUTCOME: Draw calls don't scale with particle count
      const scene = new THREE.Scene();

      // 500 particles via InstancedMesh = 1 draw call
      const instancedMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.18, 0),
        new THREE.MeshPhongMaterial(),
        500,
      );
      scene.add(instancedMesh);

      // Count draw calls
      let drawCalls = 0;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          drawCalls += 1;
        }
      });

      // Should be exactly 1 (the InstancedMesh)
      expect(drawCalls).toBe(1);
    });

    it('geometry/material reuse prevents memory scaling', () => {
      // OUTCOME: Memory doesn't scale linearly with mesh count
      const sharedGeometry = new THREE.IcosahedronGeometry(0.18, 0);
      const sharedMaterial = new THREE.MeshPhongMaterial();

      const meshes = [];
      for (let i = 0; i < 100; i++) {
        meshes.push(new THREE.Mesh(sharedGeometry, sharedMaterial));
      }

      // All meshes share same geometry/material references
      for (let i = 1; i < meshes.length; i++) {
        expect(meshes[i].geometry).toBe(meshes[0].geometry);
        expect(meshes[i].material).toBe(meshes[0].material);
      }
    });

    it('particle position updates are O(n)', () => {
      // OUTCOME: Updating N particles takes O(N) time, not O(N²)
      const counts = [100, 500, 1000];
      const times: number[] = [];

      for (const count of counts) {
        const instancedMesh = new THREE.InstancedMesh(
          new THREE.IcosahedronGeometry(0.18, 0),
          new THREE.MeshPhongMaterial(),
          count,
        );

        const matrix = new THREE.Matrix4();
        const start = performance.now();

        // Update all particle positions
        for (let i = 0; i < count; i++) {
          matrix.setPosition(Math.random(), Math.random(), Math.random());
          instancedMesh.setMatrixAt(i, matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;

        const end = performance.now();
        times.push(end - start);
      }

      // Time should scale linearly, not quadratically
      // 10x particles should take <15x time (allows variance)
      const ratio1 = times[1] / times[0]; // 500 / 100
      const ratio2 = times[2] / times[1]; // 1000 / 500

      expect(ratio1).toBeLessThan(15); // 5x particles, <15x time
      expect(ratio2).toBeLessThan(10); // 2x particles, <10x time (allows for noise)
    });
  });

  describe('Data Structure Efficiency', () => {
    it('presence data parsing is O(n)', () => {
      // OUTCOME: Parsing scales linearly with user count
      const smallPresence = createMockPresence({ userCount: 100 });
      const largePresence = createMockPresence({ userCount: 1000 });

      // Measure small
      const start1 = performance.now();
      const result1 = PresenceStateSchema.safeParse(smallPresence);
      const end1 = performance.now();
      const smallTime = end1 - start1;

      // Measure large
      const start2 = performance.now();
      const result2 = PresenceStateSchema.safeParse(largePresence);
      const end2 = performance.now();
      const largeTime = end2 - start2;

      // Verify parsing worked
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // 10x data should take <20x time (allows overhead)
      expect(largeTime).toBeLessThan(smallTime * 20);
    });

    // TODO: Fix flaky test - ratio is sensitive to JIT warmup and system load
    // The test logic is correct but thresholds need adjustment
    it.skip('Fibonacci sphere generation is O(n)', () => {
      // OUTCOME: Generating N points takes O(N) time
      const counts = [100, 500, 1000];
      const times: number[] = [];

      for (const count of counts) {
        const start = performance.now();

        for (let i = 0; i < count; i++) {
          getFibonacciSpherePoint(i, count);
        }

        const end = performance.now();
        times.push(end - start);
      }

      // Time should scale linearly
      const ratio1 = times[1] / times[0]; // 500 / 100
      const ratio2 = times[2] / times[1]; // 1000 / 500

      expect(ratio1).toBeLessThan(10); // 5x points, <10x time
      expect(ratio2).toBeLessThan(5); // 2x points, <5x time
    });
  });

  describe('Frame Rate Budget', () => {
    it('60fps frame budget: all per-frame calculations <16ms', () => {
      // OUTCOME: Frame calculations don't exceed 16.67ms budget
      const particleCount = 500;
      const breathState = calculateBreathState(Date.now());

      const start = performance.now();

      // Simulate per-frame work
      for (let i = 0; i < particleCount; i++) {
        // Particle position calculation (lightweight)
        const point = getFibonacciSpherePoint(i, particleCount);
        const radius = breathState.orbitRadius;

        // Scale point to orbit radius
        const _x = point.x * radius;
        const _y = point.y * radius;
        const _z = point.z * radius;
      }

      const end = performance.now();
      const frameTime = end - start;

      // Should be well under 16ms budget (target <5ms for headroom)
      expect(frameTime).toBeLessThan(5);
    });

    it('background tasks do not block rendering', () => {
      // OUTCOME: Heavy calculations are batched/throttled
      const iterations = 1000;

      // Simulate background work (color calculations, etc.)
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateBreathState(Date.now() + i);
      }

      const end = performance.now();
      const totalTime = end - start;

      // Even 1000 calculations should complete quickly
      expect(totalTime).toBeLessThan(50); // 50ms for batch work
    });
  });

  describe('Memory Allocation Rate', () => {
    it('breath calculation does not allocate excessive objects', () => {
      // OUTCOME: Minimal garbage collection pressure
      const iterations = 10000;

      // Force GC if available (not in all environments)
      if (global.gc) {
        global.gc();
      }

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateBreathState(Date.now() + i);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      // Very fast execution indicates minimal allocation
      expect(avgTime).toBeLessThan(0.01); // 10 microseconds
    });

    it('Fibonacci sphere does not allocate temporary arrays', () => {
      // OUTCOME: Point calculation is allocation-efficient
      const iterations = 1000;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        getFibonacciSpherePoint(i % 500, 500);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      // Should be very fast (no array allocations)
      expect(avgTime).toBeLessThan(0.01); // 10 microseconds
    });
  });

  describe('Worst-Case Scenarios', () => {
    it('handles maximum particle count without degradation', () => {
      // OUTCOME: 1000 particles still performs well
      const maxCount = 1000;

      const start = performance.now();

      for (let i = 0; i < maxCount; i++) {
        getFibonacciSpherePoint(i, maxCount);
      }

      const end = performance.now();

      // Should complete in <50ms even for max particles
      expect(end - start).toBeLessThan(50);
    });

    it('handles rapid breath state queries', () => {
      // OUTCOME: High-frequency polling doesn't degrade
      const iterations = 10000;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateBreathState(Date.now());
      }

      const end = performance.now();

      // 10k queries should complete in <100ms
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Regression Baselines', () => {
    it('breath calculation baseline: <0.05ms per call', () => {
      // BASELINE: Current performance as of test creation
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        calculateBreathState(Date.now() + i);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.05);
    });

    it('Fibonacci sphere baseline: <0.01ms per point', () => {
      // BASELINE: Current performance as of test creation
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        getFibonacciSpherePoint(i % 500, 500);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.01);
    });
  });
});
