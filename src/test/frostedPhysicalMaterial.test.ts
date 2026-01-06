/**
 * FrostedPhysicalMaterial Tests
 *
 * Guards against washed-out defaults in the pipeline-free frosted material.
 */

import { describe, expect, it } from 'vitest';
import { createFrostedPhysicalMaterial } from '../entities/particle/materials/FrostedPhysicalMaterial';

describe('FrostedPhysicalMaterial defaults', () => {
  it('maintains contrast-friendly glass defaults', () => {
    const material = createFrostedPhysicalMaterial(true);

    expect(material.transparent).toBe(true);
    expect(material.vertexColors).toBe(true);

    expect(material.roughness).toBeLessThanOrEqual(0.4);
    expect(material.transmission).toBeLessThanOrEqual(0.7);
    expect(material.envMapIntensity).toBeGreaterThanOrEqual(0.8);
    expect(material.clearcoat).toBeGreaterThanOrEqual(0.7);
    expect(material.specularIntensity).toBeGreaterThanOrEqual(0.6);
  });
});
