import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { VISUAL_OPACITY } from '../../constants';
import { createShardMaterial } from './materials';

describe('Shard material defaults', () => {
  it('returns a translucent MeshPhysicalMaterial tuned for glassy shards', () => {
    const material = createShardMaterial();

    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    const physical = material as THREE.MeshPhysicalMaterial;

    expect(physical.transparent).toBe(true);
    expect(physical.depthWrite).toBe(false);
    expect(physical.vertexColors).toBe(true);
    expect(physical.opacity).toBe(VISUAL_OPACITY.SHARD_GLASS);
    expect(physical.transmission).toBeGreaterThanOrEqual(0.9);
    expect(physical.roughness).toBeLessThanOrEqual(0.1);
  });
});
