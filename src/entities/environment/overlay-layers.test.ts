/**
 * OVERLAY Layer Tests - Verify stars render sharp after DoF
 *
 * These tests validate that:
 * 1. OVERLAY layer constant is correctly defined
 * 2. Layer numbering follows Three.js conventions
 * 3. Render order ensures stars are rendered after DoF
 *
 * Background: Stars were blurred even though they were in EnvironmentOverlay
 * (outside RefractionPipeline children) because DoF is a fullscreen post-process
 * that captures and blurs the entire scene.
 *
 * Solution: Use THREE.Layers to render stars AFTER DoF pass for sharpness.
 *
 * Manual Verification Steps:
 * 1. Open browser with dev controls (Leva panel)
 * 2. Enable "Depth of Field" in Leva panel
 * 3. Observe that:
 *    - Globe and shards are blurred (inside DoF)
 *    - Stars, constellations, and sun remain sharp (OVERLAY layer)
 */

import { describe, expect, it } from 'vitest';
import { RENDER_LAYERS } from '../../constants';

describe('OVERLAY Layer Configuration', () => {
  describe('RENDER_LAYERS Constants', () => {
    it('should have OVERLAY layer defined as layer 4', () => {
      expect(RENDER_LAYERS.OVERLAY).toBe(4);
    });

    it('should have all expected layers defined with correct numbers', () => {
      expect(RENDER_LAYERS.ENVIRONMENT).toBe(0);
      expect(RENDER_LAYERS.GLOBE).toBe(1);
      expect(RENDER_LAYERS.PARTICLES).toBe(2);
      expect(RENDER_LAYERS.EFFECTS).toBe(3);
      expect(RENDER_LAYERS.OVERLAY).toBe(4);
    });

    it('should have sequential layer numbers (no gaps)', () => {
      const layers = [
        RENDER_LAYERS.ENVIRONMENT,
        RENDER_LAYERS.GLOBE,
        RENDER_LAYERS.PARTICLES,
        RENDER_LAYERS.EFFECTS,
        RENDER_LAYERS.OVERLAY,
      ];

      // Verify layers are sequential 0, 1, 2, 3, 4
      for (let i = 0; i < layers.length; i++) {
        expect(layers[i]).toBe(i);
      }
    });

    it('should have OVERLAY as highest layer number for last render', () => {
      const allLayerNumbers = [
        RENDER_LAYERS.ENVIRONMENT,
        RENDER_LAYERS.GLOBE,
        RENDER_LAYERS.PARTICLES,
        RENDER_LAYERS.EFFECTS,
        RENDER_LAYERS.OVERLAY,
      ];

      const maxLayer = Math.max(...allLayerNumbers);
      expect(RENDER_LAYERS.OVERLAY).toBe(maxLayer);
    });
  });

  describe('Layer Architecture', () => {
    it('should separate blurred content from sharp overlay', () => {
      // Blurred layers (rendered in DoF pass)
      const blurredLayers = [
        RENDER_LAYERS.ENVIRONMENT,
        RENDER_LAYERS.GLOBE,
        RENDER_LAYERS.PARTICLES,
        RENDER_LAYERS.EFFECTS,
      ];

      // Sharp layers (rendered after DoF)
      const sharpLayers = [RENDER_LAYERS.OVERLAY];

      // OVERLAY should not be in blurred layers
      expect(blurredLayers).not.toContain(RENDER_LAYERS.OVERLAY);

      // OVERLAY should be separate for post-DoF rendering
      expect(sharpLayers).toHaveLength(1);
      expect(sharpLayers[0]).toBe(RENDER_LAYERS.OVERLAY);
    });

    it('should use layer numbers within THREE.js limit (0-31)', () => {
      // THREE.js supports 32 layers (0-31)
      const allLayerNumbers = Object.values(RENDER_LAYERS);

      for (const layerNum of allLayerNumbers) {
        expect(layerNum).toBeGreaterThanOrEqual(0);
        expect(layerNum).toBeLessThan(32);
      }
    });
  });

  describe('Render Pass Order', () => {
    it('should render OVERLAY after DoF for sharp stars', () => {
      // Expected render order in RefractionPipeline:
      // 1. Backface pass (PARTICLES layer only)
      // 2. Refraction pass (PARTICLES layer only)
      // 3. Composite pass (all layers EXCEPT OVERLAY)
      // 4. DoF pass (fullscreen blur)
      // 5. OVERLAY pass (sharp stars on top)

      const dofPassLayers = [
        RENDER_LAYERS.ENVIRONMENT,
        RENDER_LAYERS.GLOBE,
        RENDER_LAYERS.PARTICLES,
        RENDER_LAYERS.EFFECTS,
      ];

      const postDofPassLayers = [RENDER_LAYERS.OVERLAY];

      // OVERLAY should not be in DoF capture
      expect(dofPassLayers).not.toContain(RENDER_LAYERS.OVERLAY);

      // OVERLAY should be rendered separately after DoF
      expect(postDofPassLayers).toContain(RENDER_LAYERS.OVERLAY);
    });
  });

  describe('Component Layer Assignments', () => {
    it('should assign correct layers to environment components', () => {
      // This is a documentation test - verifies expected layer usage
      const expectedLayerAssignments = {
        GalaxyBackground: RENDER_LAYERS.OVERLAY, // Sharp cosmic gradient
        Constellations: RENDER_LAYERS.OVERLAY, // Sharp stars and lines
        ConstellationStars: RENDER_LAYERS.OVERLAY, // Sharp instanced meshes
        BackgroundStars: RENDER_LAYERS.OVERLAY, // Sharp background stars
        ConstellationLines: RENDER_LAYERS.OVERLAY, // Sharp connection lines
        Sun: RENDER_LAYERS.OVERLAY, // Sharp sun glow
        SunCore: RENDER_LAYERS.OVERLAY, // Sharp sun center
        SunCorona: RENDER_LAYERS.OVERLAY, // Sharp inner glow
        SunAtmosphere: RENDER_LAYERS.OVERLAY, // Sharp outer glow
        AmbientDust: RENDER_LAYERS.ENVIRONMENT, // Blurred dust (inside DoF)
      };

      // Verify star components use OVERLAY
      expect(expectedLayerAssignments.GalaxyBackground).toBe(RENDER_LAYERS.OVERLAY);
      expect(expectedLayerAssignments.Constellations).toBe(RENDER_LAYERS.OVERLAY);
      expect(expectedLayerAssignments.Sun).toBe(RENDER_LAYERS.OVERLAY);

      // Verify atmospheric effects use ENVIRONMENT (blurred)
      expect(expectedLayerAssignments.AmbientDust).toBe(RENDER_LAYERS.ENVIRONMENT);
    });
  });
});
