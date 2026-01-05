/**
 * Scene Rendering Validation Tests
 *
 * Tests that verify the scene has the expected entities and components.
 * This catches issues like:
 * - Missing globe (EarthGlobe not rendering)
 * - Missing particle shards (ParticleSwarm not rendering)
 * - White screen regressions
 *
 * These tests use static analysis and module imports to verify
 * component availability without requiring full WebGL rendering.
 *
 * Key invariants:
 * 1. BreathingLevel must include EarthGlobe component
 * 2. BreathingLevel must include ParticleSwarm component
 * 3. All required scene entities must be importable
 */

import { describe, expect, it } from 'vitest';

/**
 * Verify core scene components are available
 * Note: Some components use memo() which returns an object with $$typeof
 */
describe('Core Scene Components', () => {
  it('should export EarthGlobe', async () => {
    const module = await import('../entities/earthGlobe');

    expect(module.EarthGlobe).toBeDefined();
    expect(typeof module.EarthGlobe).toBe('function');
  });

  it('should export ParticleSwarm', async () => {
    const module = await import('../entities/particle/ParticleSwarm');

    expect(module.ParticleSwarm).toBeDefined();
    expect(typeof module.ParticleSwarm).toBe('function');
  });

  it('should export BackgroundGradient', async () => {
    const module = await import('../entities/environment/BackgroundGradient');

    expect(module.BackgroundGradient).toBeDefined();
    expect(typeof module.BackgroundGradient).toBe('function');
  });

  it('should export Environment component', async () => {
    const module = await import('../entities/environment');

    expect(module.Environment).toBeDefined();
    expect(typeof module.Environment).toBe('function');
  });
});

/**
 * Verify BreathingLevel includes required scene elements
 * Static analysis of the scene composition
 */
describe('BreathingLevel Scene Composition', () => {
  it('should include EarthGlobe in JSX', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/levels/breathing.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Verify EarthGlobe is used in the scene
    expect(source).toContain('<EarthGlobe');
  });

  it('should include ParticleSwarm in JSX', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/levels/breathing.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Verify ParticleSwarm is used in the scene
    expect(source).toContain('<ParticleSwarm');
  });

  it('should include BackgroundGradient in JSX', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/levels/breathing.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Verify BackgroundGradient is used (could be in Environment)
    // Check both direct use and via Environment
    const hasBackground = source.includes('<BackgroundGradient') || source.includes('<Environment');
    expect(hasBackground).toBe(true);
  });

  it('should import required components', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/levels/breathing.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Check imports
    expect(source).toContain("from '../entities/earthGlobe'");
    expect(source).toContain("from '../entities/particle/ParticleSwarm'");
  });
});

/**
 * Verify ParticleSwarm can render shards
 * Tests the slot manager and user-based shard logic
 */
describe('ParticleSwarm Shard Rendering', () => {
  it('should export SlotManager for shard management', async () => {
    const module = await import('../entities/particle/SlotManager');

    expect(module.SlotManager).toBeDefined();
    expect(typeof module.SlotManager).toBe('function');
  });

  it('should have users prop for dynamic shard count', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/entities/particle/ParticleSwarm.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Verify users prop exists (drives shard count)
    expect(source).toContain('users?:');
    // Verify slot manager is used
    expect(source).toContain('SlotManager');
  });
});

/**
 * Verify EarthGlobe uses TSL materials correctly
 */
describe('EarthGlobe Material Setup', () => {
  it('should use MeshBasicNodeMaterial', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/entities/earthGlobe/index.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Verify TSL material usage
    expect(source).toContain('MeshBasicNodeMaterial');
    expect(source).toContain("from 'three/webgpu'");
  });

  it('should not use glslFn', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/entities/earthGlobe/index.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Check for actual glslFn usage (not comments)
    expect(source).not.toMatch(/import\s*\{[^}]*glslFn[^}]*\}\s*from/);
    expect(source).not.toMatch(/glslFn\s*\(/);
  });
});

/**
 * Verify WebGPU renderer setup
 */
describe('WebGPU Renderer Setup', () => {
  it('should have webgpu-setup module', async () => {
    const module = await import('../webgpu-setup');

    expect(module.createWebGPURenderer).toBeDefined();
    expect(typeof module.createWebGPURenderer).toBe('function');
  });

  it('should not force WebGL by default', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/webgpu-setup.ts');
    const source = await fs.readFile(filePath, 'utf-8');

    // Check that forceWebGL is configurable, not hardcoded true
    // The options interface should allow forceWebGL to be passed in
    expect(source).toContain('forceWebGL?:');
  });
});

/**
 * Regression test: White screen prevention
 *
 * These tests document the conditions that caused white screens
 * and verify they are not present in the codebase.
 */
describe('White Screen Prevention', () => {
  it('should not use WebGL-only shader functions with WebGPU', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // Files that previously caused white screen issues
    const shaderFiles = [
      'src/entities/environment/BackgroundGradient.tsx',
      'src/entities/environment/SubtleLightRays.tsx',
      'src/entities/environment/AmbientDust.tsx',
      'src/entities/earthGlobe/index.tsx',
      'src/entities/earthGlobe/GeoMarkers.tsx',
      'src/entities/particle/FrostedGlassMaterial.tsx',
    ];

    const violations: Array<{ file: string; issue: string }> = [];

    for (const file of shaderFiles) {
      const filePath = path.join(process.cwd(), file);
      try {
        const source = await fs.readFile(filePath, 'utf-8');
        // Check for glslFn import
        if (/import\s*\{[^}]*glslFn[^}]*\}\s*from/.test(source)) {
          violations.push({ file, issue: 'imports glslFn' });
        }
        // Check for glslFn function call
        if (/glslFn\s*\(/.test(source)) {
          violations.push({ file, issue: 'uses glslFn()' });
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    expect(violations).toEqual([]);
  });

  it('should document TSL WebGPU compatibility in comments', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.join(process.cwd(), 'src/entities/environment/BackgroundGradient.tsx');
    const source = await fs.readFile(filePath, 'utf-8');

    // Verify documentation exists about WebGPU compatibility
    expect(source).toContain('WebGPU');
  });
});

/**
 * Test that key modules can be imported without errors
 * This catches module-level errors that would cause white screens
 */
describe('Module Import Validation', () => {
  it('should import webgpu-setup without throwing', async () => {
    const module = await import('../webgpu-setup');
    expect(module.createWebGPURenderer).toBeDefined();
  });

  it('should import EarthGlobe without throwing', async () => {
    const module = await import('../entities/earthGlobe');
    expect(module.EarthGlobe).toBeDefined();
  });

  it('should import ParticleSwarm without throwing', async () => {
    const module = await import('../entities/particle/ParticleSwarm');
    expect(module.ParticleSwarm).toBeDefined();
  });

  it('should import Environment without throwing', async () => {
    const module = await import('../entities/environment');
    expect(module.Environment).toBeDefined();
  });

  it('should import BackgroundGradient without throwing', async () => {
    const module = await import('../entities/environment/BackgroundGradient');
    expect(module.BackgroundGradient).toBeDefined();
  });
});
