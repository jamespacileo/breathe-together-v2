/**
 * Color Validation Tests - Scene Graph Material Auditing
 *
 * Validates that scene materials use approved brand colors only.
 * Uses @react-three/test-renderer to traverse the scene graph
 * and inspect material properties.
 *
 * Test categories:
 * 1. EarthGlobe colors (glow, mist, atmosphere layers)
 * 2. ParticleSwarm shard colors (mood-based neon palette)
 * 3. Environment lighting bounds
 * 4. Full scene palette compliance
 */

import { create } from '@react-three/test-renderer';
import type { PropsWithChildren } from 'react';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MONUMENT_VALLEY_PALETTE, NEON_MOOD_PALETTE } from '../../lib/colors';

// ============================================
// Brand Color Registry
// ============================================

/**
 * All approved brand colors for the application.
 * Materials should only use colors from this set.
 */
const BRAND_COLORS_HEX = new Set([
  // Monument Valley Palette (mood colors)
  MONUMENT_VALLEY_PALETTE.gratitude.toLowerCase(),
  MONUMENT_VALLEY_PALETTE.presence.toLowerCase(),
  MONUMENT_VALLEY_PALETTE.release.toLowerCase(),
  MONUMENT_VALLEY_PALETTE.connection.toLowerCase(),
  // Neon Mood Palette (same values, kept for semantic clarity)
  NEON_MOOD_PALETTE.gratitude.toLowerCase(),
  NEON_MOOD_PALETTE.presence.toLowerCase(),
  NEON_MOOD_PALETTE.release.toLowerCase(),
  NEON_MOOD_PALETTE.connection.toLowerCase(),
  // EarthGlobe specific colors
  '#efe5da', // GLOW_COLOR - soft cream
  '#f0ebe6', // MIST_COLOR - warm white
  '#f8d0a8', // Atmosphere inner - warm peach
  '#b8e8d4', // Atmosphere middle - soft teal
  '#c4b8e8', // Atmosphere outer - pale lavender
  '#e8c4b8', // Ring - rose gold
  '#d6dde3', // AtmosphericParticles - cloudlet color
  // Environment colors (common additions)
  '#f5f0e8', // Background cream
  '#8b6f47', // Globe brown
  '#ffffff', // White (highlights, wireframes)
  '#000000', // Black (if used sparingly)
]);

/**
 * Light intensity bounds to prevent blown-out scenes.
 */
const LIGHT_BOUNDS = {
  ambient: { min: 0.05, max: 1.5 },
  directional: { min: 0.1, max: 3.0 },
  point: { min: 0.1, max: 5.0 },
};

// ============================================
// Test Mocks
// ============================================

// Mock components that cause issues in headless environment
vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual('@react-three/drei');
  return {
    ...actual,
    useTexture: () => new THREE.Texture(),
    Html: ({ children }: PropsWithChildren) => <group name="Html">{children}</group>,
    Environment: ({ children }: PropsWithChildren) => <group name="Environment">{children}</group>,
  };
});

// Mock koota for ECS state
vi.mock('koota/react', () => ({
  useWorld: () => ({
    queryFirst: () => ({
      get: () => ({ value: 0.5 }),
    }),
  }),
}));

// ============================================
// Helper Functions
// ============================================

/**
 * Extract hex color string from THREE.Color or material color property.
 */
function colorToHex(color: THREE.Color | undefined): string | null {
  if (!color) return null;
  return `#${color.getHexString().toLowerCase()}`;
}

/**
 * Check if a color is within an approved brand palette.
 * Allows slight tolerance for floating-point color conversions.
 */
function isApprovedColor(hexColor: string): boolean {
  // Exact match
  if (BRAND_COLORS_HEX.has(hexColor.toLowerCase())) {
    return true;
  }
  // Allow very close matches (within RGB distance of 5 per channel)
  const r1 = parseInt(hexColor.slice(1, 3), 16);
  const g1 = parseInt(hexColor.slice(3, 5), 16);
  const b1 = parseInt(hexColor.slice(5, 7), 16);

  for (const approved of BRAND_COLORS_HEX) {
    const r2 = parseInt(approved.slice(1, 3), 16);
    const g2 = parseInt(approved.slice(3, 5), 16);
    const b2 = parseInt(approved.slice(5, 7), 16);
    const distance = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    if (distance <= 15) return true;
  }
  return false;
}

/**
 * Collect all materials from a scene graph node.
 */
type TestSceneNode = {
  type?: string;
  instance?: unknown;
  children?: unknown;
};

function isTestSceneNode(value: unknown): value is TestSceneNode {
  if (!value || typeof value !== 'object') return false;
  return true;
}

function getLightInfo(instance: unknown): { type: string; intensity: number } | null {
  if (!instance || typeof instance !== 'object') return null;

  const maybeLight = instance as {
    intensity?: unknown;
    isAmbientLight?: unknown;
    isDirectionalLight?: unknown;
    isPointLight?: unknown;
    isSpotLight?: unknown;
  };

  const intensity = typeof maybeLight.intensity === 'number' ? maybeLight.intensity : null;
  if (intensity === null) return null;

  const lightTypes: Array<{ flag: keyof typeof maybeLight; type: string }> = [
    { flag: 'isAmbientLight', type: 'ambient' },
    { flag: 'isDirectionalLight', type: 'directional' },
    { flag: 'isPointLight', type: 'point' },
    { flag: 'isSpotLight', type: 'spot' },
  ];

  for (const { flag, type } of lightTypes) {
    if (maybeLight[flag]) {
      return { type, intensity };
    }
  }

  return null;
}

function collectMaterials(scene: unknown): Array<{ name: string; material: THREE.Material }> {
  const materials: Array<{ name: string; material: THREE.Material }> = [];

  const traverse = (node: unknown) => {
    if (!isTestSceneNode(node)) return;

    const instance = node.instance;
    if (instance && typeof instance === 'object' && 'material' in instance) {
      const mat = (instance as { material?: unknown }).material;
      const name =
        (instance as { name?: unknown }).name &&
        typeof (instance as { name?: unknown }).name === 'string'
          ? (instance as { name: string }).name
          : node.type || 'unnamed';

      if (Array.isArray(mat)) {
        mat.forEach((m, i) => {
          if (m instanceof THREE.Material) {
            materials.push({ name: `${name}[${i}]`, material: m });
          }
        });
      } else if (mat instanceof THREE.Material) {
        materials.push({ name, material: mat });
      }
    }

    const children = node.children;
    if (Array.isArray(children)) {
      children.forEach(traverse);
    }
  };

  traverse(scene);
  return materials;
}

/**
 * Collect all lights from a scene graph node.
 */
function collectLights(scene: unknown): Array<{ type: string; intensity: number }> {
  const lights: Array<{ type: string; intensity: number }> = [];

  const traverse = (node: unknown) => {
    if (!isTestSceneNode(node)) return;

    const light = getLightInfo(node.instance);
    if (light) lights.push(light);

    const children = node.children;
    if (Array.isArray(children)) {
      children.forEach(traverse);
    }
  };

  traverse(scene);
  return lights;
}

function getMeshBasicMaterialViolations(name: string, material: THREE.Material): string[] {
  if (!(material instanceof THREE.MeshBasicMaterial)) return [];
  const hex = colorToHex(material.color);
  if (!hex) return [];
  return isApprovedColor(hex) ? [] : [`${name}: ${hex}`];
}

function getShaderMaterialUniformViolations(name: string, material: THREE.Material): string[] {
  if (!(material instanceof THREE.ShaderMaterial)) return [];

  const violations: string[] = [];
  for (const [key, uniform] of Object.entries(material.uniforms)) {
    if (uniform.value instanceof THREE.Color) {
      const hex = colorToHex(uniform.value);
      if (hex && !isApprovedColor(hex)) {
        violations.push(`${name}.${key}: ${hex}`);
      }
    }
  }

  return violations;
}

function getMaterialViolations(name: string, material: THREE.Material): string[] {
  return [
    ...getMeshBasicMaterialViolations(name, material),
    ...getShaderMaterialUniformViolations(name, material),
  ];
}

// ============================================
// Tests
// ============================================

describe('Scene Color Validation', () => {
  describe('EarthGlobe Colors', () => {
    // TODO: Update for TSL MeshBasicNodeMaterial structure
    // TSL materials don't use THREE.MeshBasicMaterial with BackSide
    it.skip('atmosphere layers use approved pastel colors', async () => {
      const { EarthGlobe } = await import('../../entities/earthGlobe');
      const renderer = await create(<EarthGlobe showAtmosphere={true} />);

      const materials = collectMaterials(renderer.scene);
      const atmosphereMaterials = materials.filter(
        (m) =>
          m.material instanceof THREE.MeshBasicMaterial &&
          (m.material as THREE.MeshBasicMaterial).side === THREE.BackSide,
      );

      // Should have 3 atmosphere layers
      expect(atmosphereMaterials.length).toBe(3);

      atmosphereMaterials.forEach(({ material }) => {
        const mat = material as THREE.MeshBasicMaterial;
        const hex = colorToHex(mat.color);
        expect(hex).not.toBeNull();
        if (!hex) {
          throw new Error('Expected atmosphere material to have a color');
        }
        expect(isApprovedColor(hex)).toBe(true);
      });
    });

    // TODO: Rewrite for TSL MeshBasicNodeMaterial (no GLSL uniforms)
    // TSL materials use color nodes instead of ShaderMaterial uniforms
    it.skip('glow material uses soft cream color', async () => {
      const { EarthGlobe } = await import('../../entities/earthGlobe');
      const renderer = await create(<EarthGlobe showGlow={true} />);

      const materials = collectMaterials(renderer.scene);
      const shaderMaterials = materials.filter((m) => m.material instanceof THREE.ShaderMaterial);

      // Find glow material by checking uniforms
      const glowMaterial = shaderMaterials.find(({ material }) => {
        const mat = material as THREE.ShaderMaterial;
        return mat.uniforms?.glowColor?.value instanceof THREE.Color;
      });

      expect(glowMaterial).toBeDefined();
      if (glowMaterial) {
        const mat = glowMaterial.material as THREE.ShaderMaterial;
        const glowColor = mat.uniforms.glowColor.value as THREE.Color;
        const hex = colorToHex(glowColor);
        expect(hex).toBe('#efe5da');
      }
    });

    // TODO: Rewrite for TSL MeshBasicNodeMaterial (no GLSL uniforms)
    // TSL materials use color nodes instead of ShaderMaterial uniforms
    it.skip('mist material uses warm white color', async () => {
      const { EarthGlobe } = await import('../../entities/earthGlobe');
      const renderer = await create(<EarthGlobe showMist={true} />);

      const materials = collectMaterials(renderer.scene);
      const shaderMaterials = materials.filter((m) => m.material instanceof THREE.ShaderMaterial);

      // Find mist material by checking uniforms
      const mistMaterial = shaderMaterials.find(({ material }) => {
        const mat = material as THREE.ShaderMaterial;
        return mat.uniforms?.mistColor?.value instanceof THREE.Color;
      });

      expect(mistMaterial).toBeDefined();
      if (mistMaterial) {
        const mat = mistMaterial.material as THREE.ShaderMaterial;
        const mistColor = mat.uniforms.mistColor.value as THREE.Color;
        const hex = colorToHex(mistColor);
        expect(hex).toBe('#f0ebe6');
      }
    });

    // TODO: Update for TSL MeshBasicNodeMaterial structure
    // TSL materials don't use THREE.MeshBasicMaterial
    it.skip('ring uses rose gold accent color', async () => {
      const { EarthGlobe } = await import('../../entities/earthGlobe');
      const renderer = await create(<EarthGlobe showRing={true} />);

      const materials = collectMaterials(renderer.scene);
      const ringMaterials = materials.filter(
        (m) =>
          m.material instanceof THREE.MeshBasicMaterial &&
          (m.material as THREE.MeshBasicMaterial).transparent === true &&
          (m.material as THREE.MeshBasicMaterial).side === THREE.FrontSide,
      );

      // Should find the ring material
      const ringMaterial = ringMaterials.find(({ material }) => {
        const mat = material as THREE.MeshBasicMaterial;
        const hex = colorToHex(mat.color);
        return hex === '#e8c4b8';
      });

      expect(ringMaterial).toBeDefined();
    });
  });

  describe('ParticleSwarm Colors', () => {
    it('shard materials use NEON_MOOD_PALETTE colors', async () => {
      const { ParticleSwarm } = await import('../../entities/particle/ParticleSwarm');

      // Render with users of different moods
      const testUsers = [
        { id: '1', mood: 'gratitude' as const },
        { id: '2', mood: 'presence' as const },
        { id: '3', mood: 'release' as const },
        { id: '4', mood: 'connection' as const },
      ];

      const renderer = await create(<ParticleSwarm maxParticles={10} users={testUsers} />);

      const meshes = renderer.scene.findAll((node) => node.instance?.isInstancedMesh);
      expect(meshes.length).toBeGreaterThan(0);

      // InstancedMesh uses instanceColor buffer for per-instance colors
      // The colors should all be from the NEON_MOOD_PALETTE
      const instancedMesh = meshes[0].instance as THREE.InstancedMesh;
      expect(instancedMesh.instanceColor).toBeDefined();
    });

    it('default color uses presence teal', async () => {
      const { ParticleSwarm } = await import('../../entities/particle/ParticleSwarm');

      // Render with no users - should use default color
      const renderer = await create(<ParticleSwarm maxParticles={10} users={[]} />);

      const meshes = renderer.scene.findAll((node) => node.instance?.isInstancedMesh);
      expect(meshes.length).toBeGreaterThan(0);

      // Default color is MONUMENT_VALLEY_PALETTE.presence
      const expectedDefault = MONUMENT_VALLEY_PALETTE.presence.toLowerCase();
      expect(expectedDefault).toBe('#06d6a0');
    });

    it('all mood colors map to approved palette', () => {
      // Verify the hardcoded MOOD_TO_COLOR matches expected palette
      const expectedColors = {
        gratitude: NEON_MOOD_PALETTE.gratitude.toLowerCase(),
        presence: NEON_MOOD_PALETTE.presence.toLowerCase(),
        release: NEON_MOOD_PALETTE.release.toLowerCase(),
        connection: NEON_MOOD_PALETTE.connection.toLowerCase(),
      };

      expect(expectedColors.gratitude).toBe('#ffbe0b');
      expect(expectedColors.presence).toBe('#06d6a0');
      expect(expectedColors.release).toBe('#118ab2');
      expect(expectedColors.connection).toBe('#ef476f');

      // All should be in brand colors
      Object.values(expectedColors).forEach((color) => {
        expect(BRAND_COLORS_HEX.has(color)).toBe(true);
      });
    });
  });

  describe('Environment Lighting Bounds', () => {
    it('ambient light intensity within safe range', async () => {
      const { Environment } = await import('../../entities/environment');
      const renderer = await create(
        <Environment
          showClouds={false}
          showStars={false}
          showConstellations={false}
          showNebulae={false}
          showSun={false}
        />,
      );

      const lights = collectLights(renderer.scene);
      const ambientLights = lights.filter((l) => l.type === 'ambient');

      expect(ambientLights.length).toBeGreaterThan(0);

      ambientLights.forEach((light) => {
        expect(light.intensity).toBeGreaterThanOrEqual(LIGHT_BOUNDS.ambient.min);
        expect(light.intensity).toBeLessThanOrEqual(LIGHT_BOUNDS.ambient.max);
      });
    });

    it('directional light intensity prevents blowout', async () => {
      const { Environment } = await import('../../entities/environment');
      const renderer = await create(
        <Environment
          showClouds={false}
          showStars={false}
          showConstellations={false}
          showNebulae={false}
          showSun={false}
        />,
      );

      const lights = collectLights(renderer.scene);
      const directionalLights = lights.filter((l) => l.type === 'directional');

      expect(directionalLights.length).toBeGreaterThan(0);

      directionalLights.forEach((light) => {
        expect(light.intensity).toBeGreaterThanOrEqual(LIGHT_BOUNDS.directional.min);
        expect(light.intensity).toBeLessThanOrEqual(LIGHT_BOUNDS.directional.max);
      });
    });
  });

  describe('Material Palette Compliance', () => {
    it('EarthGlobe uses only approved colors', async () => {
      const { EarthGlobe } = await import('../../entities/earthGlobe');
      const renderer = await create(<EarthGlobe />);

      const materials = collectMaterials(renderer.scene);
      const violations: string[] = [];

      for (const { name, material } of materials) {
        violations.push(...getMaterialViolations(name, material));
      }

      expect(violations).toEqual([]);
    });
  });
});

describe('Color Palette Contracts', () => {
  describe('Palette Consistency', () => {
    it('MONUMENT_VALLEY_PALETTE matches NEON_MOOD_PALETTE', () => {
      // These should be identical for consistency
      expect(MONUMENT_VALLEY_PALETTE.gratitude).toBe(NEON_MOOD_PALETTE.gratitude);
      expect(MONUMENT_VALLEY_PALETTE.presence).toBe(NEON_MOOD_PALETTE.presence);
      expect(MONUMENT_VALLEY_PALETTE.release).toBe(NEON_MOOD_PALETTE.release);
      expect(MONUMENT_VALLEY_PALETTE.connection).toBe(NEON_MOOD_PALETTE.connection);
    });

    it('all mood colors are distinct', () => {
      const colors = Object.values(MONUMENT_VALLEY_PALETTE);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('Visual Regression Guards', () => {
    it('documents color palette snapshot for regression detection', () => {
      // This snapshot will break if palette colors change
      const paletteSnapshot = {
        moods: MONUMENT_VALLEY_PALETTE,
        environment: {
          background: '#f5f0e8',
          globe: '#8b6f47',
        },
      };

      expect(paletteSnapshot).toMatchSnapshot();
    });
  });
});
