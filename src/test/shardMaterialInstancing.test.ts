import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createFrostedGlassMaterial } from '../entities/particle/FrostedGlassMaterial';
import { createBubbleGlassMaterial } from '../entities/particle/materials/BubbleGlassMaterial';
import { createCelShadedGlassMaterial } from '../entities/particle/materials/CelShadedGlassMaterial';
import { createChromaticGlassMaterial } from '../entities/particle/materials/ChromaticGlassMaterial';
import { createPolishedGlassMaterial } from '../entities/particle/materials/PolishedGlassMaterial';
import { createTransmissionMaterial } from '../entities/particle/materials/TransmissionMaterial';

function expectInstancingSupport(material: THREE.Material, label: string) {
  if (!('vertexShader' in material)) {
    throw new Error(`${label} does not expose a vertex shader for instancing checks.`);
  }

  const shader = (material as THREE.ShaderMaterial).vertexShader;
  expect(shader).toMatch(/USE_INSTANCING/);
  expect(shader).toMatch(/instanceMatrix/);
}

describe('Shard material instancing', () => {
  it('uses instanceMatrix transforms in vertex shaders', () => {
    const materials: Array<[string, THREE.Material]> = [
      ['frosted', createFrostedGlassMaterial(true)],
      ['polished', createPolishedGlassMaterial(true)],
      ['cel', createCelShadedGlassMaterial(true, 3.0)],
      ['bubble', createBubbleGlassMaterial(true)],
      ['chromatic', createChromaticGlassMaterial(true, 0.6)],
      ['transmission', createTransmissionMaterial({ roughness: 0.1 })],
    ];

    for (const [label, material] of materials) {
      expectInstancingSupport(material, label);
      material.dispose();
    }
  });
});
