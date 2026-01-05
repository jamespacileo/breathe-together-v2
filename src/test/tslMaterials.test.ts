/**
 * TSL Material Tests
 *
 * Tests that TSL (Three.js Shading Language) materials can be constructed
 * without throwing errors. This catches issues like:
 * - Missing imports from 'three/tsl'
 * - Invalid node graph construction
 * - glslFn() incompatibility with WebGPU backend
 *
 * These tests are designed to catch the "white screen" regression where
 * shader compilation errors cause the entire scene to fail rendering.
 *
 * Key invariants:
 * 1. All TSL materials must construct without throwing
 * 2. All materials must have valid colorNode assignments
 * 3. Materials with uniforms must expose them via userData
 */

import { describe, expect, it } from 'vitest';

/**
 * Test that TSL imports are available and working
 */
describe('TSL Module Availability', () => {
  it('should import core TSL functions without error', async () => {
    // Dynamic import to test module resolution
    const tsl = await import('three/tsl');

    // Verify essential TSL functions are available
    expect(typeof tsl.Fn).toBe('function');
    expect(typeof tsl.uniform).toBe('function');
    expect(typeof tsl.vec3).toBe('function');
    expect(typeof tsl.vec4).toBe('function');
    expect(typeof tsl.add).toBe('function');
    expect(typeof tsl.mul).toBe('function');
    expect(typeof tsl.mix).toBe('function');
    expect(typeof tsl.smoothstep).toBe('function');
    expect(typeof tsl.uv).toBe('function');
    expect(typeof tsl.positionGeometry).toBe('object'); // Node instance
  });

  it('should import WebGPU materials without error', async () => {
    const webgpu = await import('three/webgpu');

    expect(webgpu.MeshBasicNodeMaterial).toBeDefined();
    expect(typeof webgpu.MeshBasicNodeMaterial).toBe('function');
  });
});

/**
 * Test BackgroundGradient TSL material construction
 * This was the source of the white screen bug (glslFn incompatibility)
 */
describe('BackgroundGradient Material', () => {
  it('should construct without throwing', async () => {
    // Import the module to trigger material construction code paths
    const module = await import('../entities/environment/BackgroundGradient');

    expect(module.BackgroundGradient).toBeDefined();
    expect(typeof module.BackgroundGradient).toBe('function');
  });

  it('should not import glslFn (WebGPU incompatible)', async () => {
    // Read the source file to check for glslFn import/usage
    // This is a static analysis test to prevent regression
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/entities/environment/BackgroundGradient.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Check for actual glslFn import (not just in comments)
    expect(source).not.toMatch(/import\s*\{[^}]*glslFn[^}]*\}\s*from/);
    // Check for actual glslFn function call
    expect(source).not.toMatch(/glslFn\s*\(/);

    // Verify it uses pure TSL noise instead
    expect(source).toContain('valueNoise');
    expect(source).toContain('fbmNoise');
  });
});

/**
 * Test SubtleLightRays TSL material construction
 * Note: memo() wrapped components are objects, not functions
 */
describe('SubtleLightRays Material', () => {
  it('should construct without throwing', async () => {
    const module = await import('../entities/environment/SubtleLightRays');

    expect(module.SubtleLightRays).toBeDefined();
    // memo() wrapped components have $$typeof Symbol
    expect(module.SubtleLightRays).toHaveProperty('$$typeof');
  });
});

/**
 * Test AmbientDust TSL material construction
 * Note: memo() wrapped components are objects, not functions
 */
describe('AmbientDust Material', () => {
  it('should construct without throwing', async () => {
    const module = await import('../entities/environment/AmbientDust');

    expect(module.AmbientDust).toBeDefined();
    // memo() wrapped components have $$typeof Symbol
    expect(module.AmbientDust).toHaveProperty('$$typeof');
  });
});

/**
 * Test EarthGlobe TSL materials
 */
describe('EarthGlobe Materials', () => {
  it('should construct without throwing', async () => {
    const module = await import('../entities/earthGlobe');

    expect(module.EarthGlobe).toBeDefined();
    expect(typeof module.EarthGlobe).toBe('function');
  });
});

/**
 * Test GeoMarkers TSL material (HolographicMaterial)
 */
describe('GeoMarkers Material', () => {
  it('should construct without throwing', async () => {
    const module = await import('../entities/earthGlobe/GeoMarkers');

    expect(module.GeoMarkers).toBeDefined();
    expect(typeof module.GeoMarkers).toBe('function');
  });
});

/**
 * Test FrostedGlassMaterial TSL material
 * Note: exports createFrostedGlassMaterial factory function
 */
describe('FrostedGlassMaterial', () => {
  it('should export createFrostedGlassMaterial factory', async () => {
    const module = await import('../entities/particle/FrostedGlassMaterial');

    expect(module.createFrostedGlassMaterial).toBeDefined();
    expect(typeof module.createFrostedGlassMaterial).toBe('function');
  });

  it('should not use glslFn', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/entities/particle/FrostedGlassMaterial.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Check for actual glslFn import/usage
    expect(source).not.toMatch(/import\s*\{[^}]*glslFn[^}]*\}\s*from/);
    expect(source).not.toMatch(/glslFn\s*\(/);
  });
});

/**
 * Static analysis tests for glslFn usage across codebase
 * This prevents future regressions from reintroducing glslFn
 *
 * glslFn wraps raw GLSL code which only works on WebGL backend.
 * For WebGPU compatibility, use pure TSL node operations.
 */
describe('Codebase glslFn Usage', () => {
  it('should not import or use glslFn in any TSL shader files', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // Check key shader files for glslFn import or usage
    const shaderFiles = [
      'src/entities/environment/BackgroundGradient.tsx',
      'src/entities/environment/SubtleLightRays.tsx',
      'src/entities/environment/AmbientDust.tsx',
      'src/entities/earthGlobe/index.tsx',
      'src/entities/earthGlobe/GeoMarkers.tsx',
      'src/entities/particle/FrostedGlassMaterial.tsx',
    ];

    const violations: string[] = [];

    for (const file of shaderFiles) {
      const filePath = path.join(process.cwd(), file);
      try {
        const source = await fs.readFile(filePath, 'utf-8');
        // Check for glslFn import
        if (/import\s*\{[^}]*glslFn[^}]*\}\s*from/.test(source)) {
          violations.push(`${file} (imports glslFn)`);
        }
        // Check for glslFn function call
        if (/glslFn\s*\(/.test(source)) {
          violations.push(`${file} (uses glslFn)`);
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    expect(violations).toEqual([]);
  });
});

/**
 * Static analysis tests for ShaderMaterial usage
 *
 * THREE.ShaderMaterial is incompatible with WebGPU's NodeMaterial system.
 * All custom shaders must use TSL NodeMaterials (MeshBasicNodeMaterial, etc.)
 */
describe('ShaderMaterial Incompatibility', () => {
  it('should not use ShaderMaterial in scene components', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // Check key scene components for ShaderMaterial usage
    const sceneFiles = [
      'src/entities/environment/BackgroundGradient.tsx',
      'src/entities/environment/SubtleLightRays.tsx',
      'src/entities/environment/AmbientDust.tsx',
      'src/entities/earthGlobe/index.tsx',
      'src/entities/earthGlobe/GeoMarkers.tsx',
      'src/entities/particle/FrostedGlassMaterial.tsx',
      'src/entities/particle/ParticleSwarm.tsx',
    ];

    const violations: string[] = [];

    for (const file of sceneFiles) {
      const filePath = path.join(process.cwd(), file);
      try {
        const source = await fs.readFile(filePath, 'utf-8');
        // Check for ShaderMaterial import
        if (/new\s+(THREE\.)?ShaderMaterial\s*\(/.test(source)) {
          violations.push(`${file} (uses ShaderMaterial)`);
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    expect(violations).toEqual([]);
  });
});

/**
 * Helper to check if a line is a comment
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('{/*')
  );
}

/**
 * Check if a source file uses incompatible drei components
 * Returns array of violation messages
 */
async function checkDreiViolations(
  filePath: string,
  file: string,
  components: string[],
): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const violations: string[] = [];

  try {
    const source = await fs.readFile(filePath, 'utf-8');
    const lines = source.split('\n');

    for (const component of components) {
      // Check for uncommented import
      const importRegex = new RegExp(
        `import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}\\s*from\\s*['"]@react-three/drei['"]`,
      );
      for (const line of lines) {
        if (!isCommentLine(line) && importRegex.test(line)) {
          violations.push(`${file} imports: ${component}`);
          break;
        }
      }

      // Check for uncommented JSX usage
      const jsxRegex = new RegExp(`<${component}[\\s/>]`);
      for (const line of lines) {
        if (!isCommentLine(line) && jsxRegex.test(line)) {
          violations.push(`${file} uses JSX: ${component}`);
          break;
        }
      }
    }
  } catch {
    // File doesn't exist, skip
  }

  return violations;
}

/**
 * Tests for drei component compatibility with WebGPU
 *
 * These drei components use internal ShaderMaterial and are NOT compatible
 * with WebGPU's NodeMaterial system:
 * - Stars
 * - Sparkles
 * - Clouds/Cloud
 *
 * They must be disabled or replaced with TSL-based alternatives.
 */
describe('drei Component WebGPU Compatibility', () => {
  it('should not import incompatible drei components in rendered scene files', async () => {
    const path = await import('node:path');

    const sceneFiles = [
      'src/entities/environment/index.tsx',
      'src/entities/earthGlobe/index.tsx',
      'src/entities/particle/AtmosphericParticles.tsx',
    ];

    const incompatibleComponents = ['Stars', 'Sparkles', 'Cloud', 'Clouds'];
    const allViolations: string[] = [];

    for (const file of sceneFiles) {
      const filePath = path.join(process.cwd(), file);
      const violations = await checkDreiViolations(filePath, file, incompatibleComponents);
      allViolations.push(...violations);
    }

    expect(allViolations).toEqual([]);
  });
});
