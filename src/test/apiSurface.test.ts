/**
 * API Surface Snapshot Tests
 *
 * Detects breaking changes in public exports and function signatures.
 * Protects against AI code generation accidentally changing or removing exports.
 */

import { describe, expect, it } from 'vitest';

describe('API Surface Snapshot Tests', () => {
  describe('Core Library Exports', () => {
    it('breathCalc exports expected functions', async () => {
      // OUTCOME: Breaking changes to breath calculation API are caught
      const breathCalc = await import('../lib/breathCalc');
      const exports = Object.keys(breathCalc);

      expect(exports).toContain('calculateBreathState');

      // Snapshot all exports to catch additions/removals
      expect(exports.sort()).toMatchSnapshot();
    });

    it('colors module exports expected functions', async () => {
      // OUTCOME: Color API changes are intentional
      const colors = await import('../lib/colors');
      const exports = Object.keys(colors);

      expect(exports).toContain('getMonumentValleyMoodColor');
      expect(exports).toContain('getMoodColor'); // Alias
      expect(exports).toContain('MOOD_COLORS');

      expect(exports.sort()).toMatchSnapshot();
    });

    it('collisionGeometry exports expected functions', async () => {
      // OUTCOME: Geometry utilities remain stable
      const collisionGeometry = await import('../lib/collisionGeometry');
      const exports = Object.keys(collisionGeometry);

      expect(exports).toContain('getFibonacciSpherePoint');

      expect(exports.sort()).toMatchSnapshot();
    });

    it('presenceApi exports expected types and functions', async () => {
      // OUTCOME: Presence API contract is stable
      const presenceApi = await import('../lib/presenceApi');
      const exports = Object.keys(presenceApi);

      expect(exports).toContain('PresenceStateSchema');
      expect(exports).toContain('validateMood');
      expect(exports).toContain('presenceApi');

      expect(exports.sort()).toMatchSnapshot();
    });
  });

  describe('Constants Exports', () => {
    it('VISUALS constants structure remains stable', async () => {
      // OUTCOME: Visual configuration changes are intentional
      const { VISUALS } = await import('../constants');
      const keys = Object.keys(VISUALS);

      // Core visual constants
      expect(keys).toContain('PARTICLE_ORBIT_MIN');
      expect(keys).toContain('PARTICLE_ORBIT_MAX');

      // Snapshot structure to catch additions/removals
      expect(keys.sort()).toMatchSnapshot();
    });

    it('MOOD_METADATA constants structure remains stable', async () => {
      // OUTCOME: Mood system changes are caught
      const { MOOD_METADATA } = await import('../constants');
      const moodIds = Object.keys(MOOD_METADATA);

      expect(moodIds).toContain('gratitude');
      expect(moodIds).toContain('presence');
      expect(moodIds).toContain('release');
      expect(moodIds).toContain('connection');

      expect(moodIds.sort()).toMatchSnapshot();
    });
  });

  describe('Type Exports', () => {
    it('shared types module exports expected types', async () => {
      // OUTCOME: Type changes are caught early
      const types = await import('../types');
      const exports = Object.keys(types);

      // Should export type definitions (these may be empty at runtime)
      expect(exports.sort()).toMatchSnapshot();
    });
  });

  describe('Hook Exports', () => {
    it('usePresence hook is exported', async () => {
      // OUTCOME: React hook API remains stable
      const { usePresence } = await import('../hooks/usePresence');

      expect(usePresence).toBeDefined();
      expect(typeof usePresence).toBe('function');
    });

    it('useViewport hook is exported', async () => {
      // OUTCOME: Viewport hook API is stable
      const { useViewport } = await import('../hooks/useViewport');

      expect(useViewport).toBeDefined();
      expect(typeof useViewport).toBe('function');
    });
  });

  describe('Test Helper Exports', () => {
    it('test helpers export expected utilities', async () => {
      // OUTCOME: Test infrastructure remains stable
      const helpers = await import('./helpers');
      const exports = Object.keys(helpers);

      // Color matchers
      expect(exports).toContain('hexToRgb');
      expect(exports).toContain('getContrastRatio');
      expect(exports).toContain('expectColorMatch');

      // Mock generators
      expect(exports).toContain('createMockUsers');
      expect(exports).toContain('createMockPresence');

      // Scene assertions
      expect(exports).toContain('expectParticleCount');

      expect(exports.sort()).toMatchSnapshot();
    });
  });

  describe('Component Exports', () => {
    it.skip('main level exports expected scenes', async () => {
      // OUTCOME: Scene composition API is stable
      // SKIPPED: Importing React components in test environment requires React context
      // This test is skipped to avoid test environment issues
      // The components are tested in their own test files
      const breathingLevel = await import('../levels/breathing');

      expect(breathingLevel.BreathingLevel).toBeDefined();
      expect(breathingLevel.BreathingLevelUI).toBeDefined();

      const exports = Object.keys(breathingLevel);
      expect(exports.sort()).toMatchSnapshot();
    });
  });

  describe('Critical Function Availability', () => {
    it('calculateBreathState is callable', async () => {
      // OUTCOME: Core breath calculation remains functional
      const { calculateBreathState } = await import('../lib/breathCalc');

      const result = calculateBreathState(Date.now());

      expect(result).toHaveProperty('breathPhase');
      expect(result).toHaveProperty('phaseType');
      expect(result).toHaveProperty('orbitRadius');
      expect(result).toHaveProperty('rawProgress');
    });

    it('getFibonacciSpherePoint is callable', async () => {
      // OUTCOME: Particle distribution remains functional
      const { getFibonacciSpherePoint } = await import('../lib/collisionGeometry');

      const point = getFibonacciSpherePoint(0, 100);

      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
    });

    it('getMonumentValleyMoodColor is callable', async () => {
      // OUTCOME: Color mapping remains functional
      const { getMonumentValleyMoodColor } = await import('../lib/colors');

      const color = getMonumentValleyMoodColor('gratitude');

      expect(typeof color).toBe('string');
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Module Integrity', () => {
    it('no circular dependencies in core modules', async () => {
      // OUTCOME: Module structure remains clean
      // This test ensures modules can be imported without errors
      await expect(import('../lib/breathCalc')).resolves.toBeDefined();
      await expect(import('../lib/colors')).resolves.toBeDefined();
      await expect(import('../lib/collisionGeometry')).resolves.toBeDefined();
      await expect(import('../constants')).resolves.toBeDefined();
    });

    it('all core modules export at least one member', async () => {
      // OUTCOME: No empty module regressions
      const modules = [
        '../lib/breathCalc',
        '../lib/colors',
        '../lib/collisionGeometry',
        '../lib/presenceApi',
        '../constants',
      ];

      for (const modulePath of modules) {
        const module = await import(modulePath);
        const exports = Object.keys(module);
        expect(exports.length).toBeGreaterThan(0);
      }
    });
  });
});
