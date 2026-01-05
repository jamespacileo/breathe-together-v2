/**
 * Scene Assertion Helpers
 *
 * High-level assertions for testing Three.js scene outcomes.
 */

import * as THREE from 'three';
import { expect } from 'vitest';
import { calculateBreathState } from '../../lib/breathCalc';

/**
 * Assert that a scene contains the expected number of particles
 */
export function expectParticleCount(scene: THREE.Scene, expectedCount: number): void {
  let actualCount = 0;

  scene.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && object.name === 'ParticleSwarm') {
      actualCount = object.count;
    }
  });

  expect(actualCount).toBe(expectedCount);
}

/**
 * Assert that breath phase at a given time matches expected value
 *
 * @param time - Timestamp in milliseconds
 * @param expectedPhase - Expected breath phase (0-1)
 * @param tolerance - Allowed deviation from expected (default 0.01 = within 1%)
 */
export function expectBreathPhase(time: number, expectedPhase: number, tolerance = 0.01): void {
  const { breathPhase } = calculateBreathState(time);
  const diff = Math.abs(breathPhase - expectedPhase);
  expect(diff).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that two timestamps produce the same breath phase (synchronization test)
 *
 * @param time1 - First timestamp in milliseconds
 * @param time2 - Second timestamp in milliseconds
 * @param tolerance - Allowed deviation between phases (default 0.001)
 */
export function expectSynchronizedBreathPhase(
  time1: number,
  time2: number,
  tolerance = 0.001,
): void {
  const phase1 = calculateBreathState(time1).breathPhase;
  const phase2 = calculateBreathState(time2).breathPhase;
  const diff = Math.abs(phase1 - phase2);
  expect(diff).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that a scene contains a specific object by name
 */
export function expectSceneContains(scene: THREE.Scene, objectName: string): void {
  const found = scene.getObjectByName(objectName);
  expect(found).toBeDefined();
}

/**
 * Assert that a scene has the expected draw call count
 */
export function expectDrawCallCount(scene: THREE.Scene, maxDrawCalls: number): void {
  let drawCalls = 0;

  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points ||
      object instanceof THREE.Line
    ) {
      drawCalls += 1;
    }
  });

  expect(drawCalls).toBeLessThanOrEqual(maxDrawCalls);
}

/**
 * Assert that orbit radius is within expected breathing range
 */
export function expectOrbitRadiusInRange(
  orbitRadius: number,
  minRadius = 2.5,
  maxRadius = 6,
): void {
  expect(orbitRadius).toBeGreaterThanOrEqual(minRadius);
  expect(orbitRadius).toBeLessThanOrEqual(maxRadius);
}

/**
 * Assert that breath phase follows 4-7-8 pattern
 */
export function expectValidBreathingCycle(timestamp: number): void {
  const { phaseType, breathPhase } = calculateBreathState(timestamp);

  // Breath phase should always be 0-1
  expect(breathPhase).toBeGreaterThanOrEqual(0);
  expect(breathPhase).toBeLessThanOrEqual(1);

  // Phase type should be 0, 1, 2, or 3
  expect(phaseType).toBeGreaterThanOrEqual(0);
  expect(phaseType).toBeLessThanOrEqual(3);
}

/**
 * Get visible particle count from scene
 */
export function getVisibleParticleCount(scene: THREE.Scene): number {
  let count = 0;

  scene.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) {
      count += object.count;
    } else if (object instanceof THREE.Points) {
      const positions = object.geometry.getAttribute('position');
      if (positions) {
        count += positions.count;
      }
    }
  });

  return count;
}

/**
 * Count objects of a specific type in scene
 */
export function countObjectsOfType<T extends THREE.Object3D>(
  scene: THREE.Scene,
  // biome-ignore lint/suspicious/noExplicitAny: Three.js type checking requires any
  type: new (...args: any[]) => T,
): number {
  let count = 0;
  scene.traverse((object) => {
    if (object instanceof type) {
      count += 1;
    }
  });
  return count;
}
