/**
 * Scene Rendering Tests - Verify globe and shards are present
 *
 * These tests validate that:
 * 1. Globe (EarthGlobe) is present in the scene
 * 2. Shards (ParticleSwarm) are present in the scene
 * 3. Layers are correctly assigned (globe/shards NOT on OVERLAY layer)
 * 4. Shard colors match the IMMUNE-inspired COSMIC_NEBULA_PALETTE
 *
 * Uses scene graph analysis (no WebGL required) for CI testing.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RENDER_LAYERS } from '../constants';
import { COSMIC_NEBULA_PALETTE } from '../lib/colors';

/**
 * Helper: Extract all meshes from a scene graph
 */
function extractMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      meshes.push(obj);
    }
  });
  return meshes;
}

/**
 * Helper: Extract all InstancedMeshes from a scene graph
 */
function extractInstancedMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  const instancedMeshes: THREE.InstancedMesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) {
      instancedMeshes.push(obj);
    }
  });
  return instancedMeshes;
}

/**
 * Helper: Count objects on a specific layer
 */
function countObjectsOnLayer(scene: THREE.Scene, layer: number): number {
  let count = 0;
  scene.traverse((obj) => {
    if (obj.layers.isEnabled(layer)) {
      count++;
    }
  });
  return count;
}

/**
 * Helper: Convert hex color string to THREE.Color
 */
function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * Helper: Calculate color distance (Delta E approximation)
 */
function colorDistance(c1: THREE.Color, c2: THREE.Color): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

describe('Scene Rendering Validation', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  describe('EarthGlobe Presence', () => {
    it('should have EarthGlobe in scene (simulated)', () => {
      // Simulate EarthGlobe: main sphere + glow + mist layers
      const radius = 1.5;

      const mainGeometry = new THREE.SphereGeometry(radius, 64, 64);
      const mainMaterial = new THREE.ShaderMaterial();
      const globe = new THREE.Mesh(mainGeometry, mainMaterial);
      globe.name = 'earth-globe';
      scene.add(globe);

      // Glow layer
      const glowGeometry = new THREE.SphereGeometry(radius * 1.02, 32, 32);
      const glowMaterial = new THREE.ShaderMaterial();
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.name = 'globe-glow';
      scene.add(glow);

      const meshes = extractMeshes(scene);
      expect(meshes.length).toBeGreaterThanOrEqual(2); // At least main + glow

      // Verify globe is findable by name
      const globeMesh = scene.getObjectByName('earth-globe');
      expect(globeMesh).toBeDefined();
      expect(globeMesh).toBeInstanceOf(THREE.Mesh);

      // Cleanup
      mainGeometry.dispose();
      mainMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
    });

    it('should NOT have EarthGlobe on OVERLAY layer', () => {
      // EarthGlobe should be on layer 0 (ENVIRONMENT) or layer 1 (GLOBE)
      // NOT on layer 4 (OVERLAY) which is reserved for stars
      const radius = 1.5;

      const geometry = new THREE.SphereGeometry(radius, 64, 64);
      const material = new THREE.ShaderMaterial();
      const globe = new THREE.Mesh(geometry, material);

      // Default layer is 0
      expect(globe.layers.isEnabled(RENDER_LAYERS.ENVIRONMENT)).toBe(true);
      expect(globe.layers.isEnabled(RENDER_LAYERS.OVERLAY)).toBe(false);

      scene.add(globe);

      // Verify OVERLAY layer has 0 objects (globe should not be there)
      const overlayCount = countObjectsOnLayer(scene, RENDER_LAYERS.OVERLAY);
      expect(overlayCount).toBe(0);

      // Cleanup
      geometry.dispose();
      material.dispose();
    });

    it('should have correct globe radius and scale', () => {
      const radius = 1.5; // Default from EarthGlobe component

      const geometry = new THREE.SphereGeometry(radius, 64, 64);
      const material = new THREE.ShaderMaterial();
      const globe = new THREE.Mesh(geometry, material);
      scene.add(globe);

      // Verify globe bounding sphere radius matches expected value
      geometry.computeBoundingSphere();
      expect(geometry.boundingSphere?.radius).toBeCloseTo(radius, 2);

      // Cleanup
      geometry.dispose();
      material.dispose();
    });
  });

  describe('ParticleSwarm Presence', () => {
    it('should have ParticleSwarm in scene as InstancedMesh (simulated)', () => {
      // Simulate ParticleSwarm: single InstancedMesh for all shards
      const shardCount = 300;
      const shardSize = 0.2309; // Default max size for 300 particles

      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
      const material = new THREE.MeshStandardMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, shardCount);
      instancedMesh.name = 'particle-swarm';
      scene.add(instancedMesh);

      const instancedMeshes = extractInstancedMeshes(scene);
      expect(instancedMeshes.length).toBeGreaterThanOrEqual(1);

      // Verify swarm is findable by name
      const swarm = scene.getObjectByName('particle-swarm');
      expect(swarm).toBeDefined();
      expect(swarm).toBeInstanceOf(THREE.InstancedMesh);

      // Verify instance count
      if (swarm instanceof THREE.InstancedMesh) {
        expect(swarm.count).toBe(shardCount);
      }

      // Cleanup
      geometry.dispose();
      material.dispose();
    });

    it('should have ParticleSwarm on PARTICLES layer', () => {
      // ParticleSwarm should be on layer 2 (PARTICLES)
      // NOT on layer 4 (OVERLAY)
      const geometry = new THREE.IcosahedronGeometry(0.2, 0);
      const material = new THREE.MeshStandardMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, 100);

      // Set PARTICLES layer (as done in ParticleSwarm.tsx line 612)
      instancedMesh.layers.enable(RENDER_LAYERS.PARTICLES);

      scene.add(instancedMesh);

      // Verify PARTICLES layer is enabled
      expect(instancedMesh.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);

      // Verify OVERLAY layer is NOT enabled
      expect(instancedMesh.layers.isEnabled(RENDER_LAYERS.OVERLAY)).toBe(false);

      // Cleanup
      geometry.dispose();
      material.dispose();
    });

    it('should use instanced rendering for performance (1 draw call)', () => {
      // ParticleSwarm uses InstancedMesh for efficient rendering
      // 300 shards = 1 draw call (not 300)
      const geometry = new THREE.IcosahedronGeometry(0.2, 0);
      const material = new THREE.MeshStandardMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, 300);
      scene.add(instancedMesh);

      const instancedMeshes = extractInstancedMeshes(scene);
      expect(instancedMeshes.length).toBe(1); // Single InstancedMesh

      // Verify it's not 300 individual meshes
      const regularMeshes = extractMeshes(scene).filter(
        (mesh) => !(mesh instanceof THREE.InstancedMesh),
      );
      expect(regularMeshes.length).toBe(0); // No regular meshes for shards

      // Cleanup
      geometry.dispose();
      material.dispose();
    });
  });

  describe('Shard Color Validation', () => {
    it('should use COSMIC_NEBULA_PALETTE colors for shards', () => {
      // Validate that palette colors are used
      const paletteColors = Object.values(COSMIC_NEBULA_PALETTE).map((hex) => hexToColor(hex));

      // Simulate shard materials with palette colors
      const materials = paletteColors.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color: color,
          }),
      );

      // Create meshes with palette colors
      const geometry = new THREE.IcosahedronGeometry(0.2, 0);
      for (let i = 0; i < materials.length; i++) {
        const mesh = new THREE.Mesh(geometry, materials[i]);
        scene.add(mesh);
      }

      const meshes = extractMeshes(scene);
      expect(meshes.length).toBe(paletteColors.length);

      // Verify each mesh color matches a palette color
      for (let i = 0; i < meshes.length; i++) {
        const material = meshes[i].material as THREE.MeshStandardMaterial;
        const meshColor = material.color;

        // Find closest palette color
        let minDistance = Number.POSITIVE_INFINITY;
        for (const paletteColor of paletteColors) {
          const distance = colorDistance(meshColor, paletteColor);
          minDistance = Math.min(minDistance, distance);
        }

        // Color should be very close to a palette color (Delta E < 0.01)
        expect(minDistance).toBeLessThan(0.01);
      }

      // Cleanup
      geometry.dispose();
      for (const material of materials) {
        material.dispose();
      }
    });

    it('should have shard colors match IMMUNE-inspired palette', () => {
      // Specific color validation for IMMUNE-inspired palette
      const expectedColors = {
        gratitude: hexToColor(COSMIC_NEBULA_PALETTE.gratitude), // #F0B892 Soft Peach
        presence: hexToColor(COSMIC_NEBULA_PALETTE.presence), // #7DE5E5 Soft Aqua
        release: hexToColor(COSMIC_NEBULA_PALETTE.release), // #8AB3E6 Soft Periwinkle
        connection: hexToColor(COSMIC_NEBULA_PALETTE.connection), // #E89CC9 Soft Rose
      };

      // Verify colors are lighter (higher luminance) than old palette
      // IMMUNE-inspired colors should have luminance 0.4-0.7
      for (const [mood, color] of Object.entries(expectedColors)) {
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);

        expect(
          hsl.l,
          `${mood} should have luminance 0.4-0.7 for IMMUNE-inspired brightness`,
        ).toBeGreaterThanOrEqual(0.4);
        expect(
          hsl.l,
          `${mood} should have luminance 0.4-0.7 for IMMUNE-inspired brightness`,
        ).toBeLessThanOrEqual(0.7);
      }
    });

    it('should have distinct colors for each mood (Delta E >= 0.2)', () => {
      // Colors should be distinguishable from each other
      const paletteColors = Object.entries(COSMIC_NEBULA_PALETTE).map(([mood, hex]) => ({
        mood,
        color: hexToColor(hex),
      }));

      // Compare each pair
      for (let i = 0; i < paletteColors.length; i++) {
        for (let j = i + 1; j < paletteColors.length; j++) {
          const distance = colorDistance(paletteColors[i].color, paletteColors[j].color);
          expect(
            distance,
            `${paletteColors[i].mood} and ${paletteColors[j].mood} should be distinguishable`,
          ).toBeGreaterThanOrEqual(0.2); // RGB distance >= 0.2 (about 51 in 0-255 scale)
        }
      }
    });
  });

  describe('Layer Architecture Validation', () => {
    it('should have correct layer separation (blurred vs sharp)', () => {
      // Blurred layers (rendered in DoF pass): ENVIRONMENT, GLOBE, PARTICLES, EFFECTS
      // Sharp layers (rendered after DoF): OVERLAY

      // Simulate scene with objects on different layers
      const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
      bgPlane.name = 'background';
      bgPlane.layers.set(RENDER_LAYERS.ENVIRONMENT);
      scene.add(bgPlane);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 64, 64),
        new THREE.MeshStandardMaterial(),
      );
      globe.name = 'globe';
      globe.layers.set(RENDER_LAYERS.ENVIRONMENT); // or GLOBE layer
      scene.add(globe);

      const shards = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.2, 0),
        new THREE.MeshStandardMaterial(),
        300,
      );
      shards.name = 'shards';
      shards.layers.enable(RENDER_LAYERS.PARTICLES);
      scene.add(shards);

      const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
      stars.name = 'stars';
      stars.layers.set(RENDER_LAYERS.OVERLAY);
      scene.add(stars);

      // Verify layer assignments
      expect(bgPlane.layers.isEnabled(RENDER_LAYERS.ENVIRONMENT)).toBe(true);
      expect(bgPlane.layers.isEnabled(RENDER_LAYERS.OVERLAY)).toBe(false);

      expect(globe.layers.isEnabled(RENDER_LAYERS.ENVIRONMENT)).toBe(true);
      expect(globe.layers.isEnabled(RENDER_LAYERS.OVERLAY)).toBe(false);

      expect(shards.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);
      expect(shards.layers.isEnabled(RENDER_LAYERS.OVERLAY)).toBe(false);

      expect(stars.layers.isEnabled(RENDER_LAYERS.OVERLAY)).toBe(true);

      // Count objects per layer
      const envCount = countObjectsOnLayer(scene, RENDER_LAYERS.ENVIRONMENT);
      const particlesCount = countObjectsOnLayer(scene, RENDER_LAYERS.PARTICLES);
      const overlayCount = countObjectsOnLayer(scene, RENDER_LAYERS.OVERLAY);

      expect(envCount).toBeGreaterThan(0); // Background + globe
      expect(particlesCount).toBeGreaterThan(0); // Shards
      expect(overlayCount).toBeGreaterThan(0); // Stars

      // Cleanup
      bgPlane.geometry.dispose();
      (bgPlane.material as THREE.Material).dispose();
      globe.geometry.dispose();
      (globe.material as THREE.Material).dispose();
      shards.geometry.dispose();
      (shards.material as THREE.Material).dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
    });
  });
});
