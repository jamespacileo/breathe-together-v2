import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Slot } from '../entities/particle/SlotManager';
import { computeSlotTargetDirections } from '../entities/particle/swarmDistribution';

function createSlot(index: number, state: Slot['state']): Slot {
  return {
    index,
    state,
    userId: state === 'empty' ? null : `user-${index}`,
    mood: state === 'empty' ? null : 'presence',
    scale: state === 'empty' ? 0 : 1,
    targetScale: state === 'empty' ? 0 : 1,
    stateChangedAt: 0,
  };
}

describe('computeSlotTargetDirections', () => {
  it('spreads active slots across the full sphere', () => {
    const slots = Array.from({ length: 12 }, (_, i) => createSlot(i, 'active'));
    const fallback = slots.map(() => new THREE.Vector3(0, 1, 0));
    const targets = computeSlotTargetDirections(slots, fallback);

    const ys = targets.map((t) => t.y);
    expect(Math.max(...ys)).toBeGreaterThan(0.5);
    expect(Math.min(...ys)).toBeLessThan(0);
  });

  it('preserves fallback directions for inactive slots', () => {
    const slots = [
      createSlot(0, 'active'),
      createSlot(1, 'empty'),
      createSlot(2, 'exiting'),
      createSlot(3, 'entering'),
    ];
    const fallback = [
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-1, 0, 0),
    ];

    const targets = computeSlotTargetDirections(slots, fallback);

    expect(targets[1].equals(fallback[1])).toBe(true);
    expect(targets[2].equals(fallback[2])).toBe(true);
    expect(targets[1]).not.toBe(fallback[1]);
    expect(targets[2]).not.toBe(fallback[2]);
  });

  it('uses only active/entering slots when distributing directions', () => {
    const slots = [
      createSlot(0, 'active'),
      createSlot(1, 'empty'),
      createSlot(2, 'empty'),
      createSlot(3, 'empty'),
      createSlot(4, 'empty'),
      createSlot(5, 'active'),
    ];
    const fallback = slots.map(() => new THREE.Vector3(0, 1, 0));

    const targets = computeSlotTargetDirections(slots, fallback);
    const ys = targets
      .filter((_, index) => slots[index].state === 'active')
      .map((target) => target.y);

    expect(Math.max(...ys)).toBeGreaterThan(0.9);
    expect(Math.min(...ys)).toBeLessThan(0);
  });
});
