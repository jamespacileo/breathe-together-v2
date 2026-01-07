import * as THREE from 'three';
import { getFibonacciSpherePoint } from '../../lib/collisionGeometry';
import type { Slot } from './SlotManager';

/**
 * Compute target directions for each slot based on Fibonacci distribution.
 * Active/entering slots get new Fibonacci directions; others keep their fallback direction.
 */
export function computeSlotTargetDirections(
  slots: readonly Slot[],
  fallbackDirections: readonly THREE.Vector3[],
): THREE.Vector3[] {
  let stableCount = 0;
  for (const slot of slots) {
    if (slot.state === 'entering' || slot.state === 'active') {
      stableCount++;
    }
  }
  const targets: THREE.Vector3[] = [];
  let stableIndex = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.state === 'entering' || slot.state === 'active') {
      if (stableCount > 0) {
        targets[i] = getFibonacciSpherePoint(stableIndex, stableCount);
      } else {
        targets[i] = new THREE.Vector3(0, 1, 0);
      }
      stableIndex++;
      continue;
    }

    const fallback = fallbackDirections[i];
    if (fallback) {
      targets[i] = fallback.clone();
    } else {
      targets[i] = new THREE.Vector3(0, 1, 0);
    }
  }

  return targets;
}
