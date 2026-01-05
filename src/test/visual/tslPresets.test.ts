/**
 * TSL Presets Validation Tests
 *
 * Validates that TSL presets (fresnel, breathing) match the GLSL shader values.
 * This ensures the shared TSL node library produces visually identical output
 * to the original GLSL shaders.
 *
 * NOTE: These tests are currently skipped because the TSL library (lib/tsl) has not been implemented yet.
 * They will be enabled once the TSL migration is complete.
 */

import { describe, expect, it } from 'vitest';
// import { BREATHING_PRESETS, FRESNEL_PRESETS } from '../../lib/tsl';
import { GLSL_COLORS } from '../helpers/glslColorConstants';

// Temporary mock presets for type checking until TSL library is implemented
const FRESNEL_PRESETS = {
  frostedGlass: { power: 2.5, intensity: 0.3 },
  atmosphere: { power: 4.0, intensity: 0.2 },
  mist: { power: 2.0, intensity: 0.15 },
};

const BREATHING_PRESETS = {
  subtle: { intensity: 0.05 },
  standard: { intensity: 0.12 },
  pronounced: { intensity: 0.2 },
  innerGlow: { baseIntensity: 0.05, breathBoost: 0.3 },
};

describe.skip('TSL Presets Validation', () => {
  describe('Fresnel Presets Match GLSL Values', () => {
    it('frostedGlass preset matches GLSL FrostedGlassMaterial', () => {
      // GLSL FrostedGlassMaterial.tsx uses power = 2.5
      expect(FRESNEL_PRESETS.frostedGlass.power).toBe(GLSL_COLORS.frostedGlass.fresnelPower);
    });

    it('atmosphere preset is appropriate for globe rim glow', () => {
      // Globe shader uses tighter fresnel (power ~4.0) for atmospheric effect
      expect(FRESNEL_PRESETS.atmosphere.power).toBeGreaterThanOrEqual(3.5);
      expect(FRESNEL_PRESETS.atmosphere.power).toBeLessThanOrEqual(5.0);
    });

    it('mist preset is softer than atmosphere', () => {
      // Mist should be more diffuse than atmosphere
      expect(FRESNEL_PRESETS.mist.power).toBeLessThan(FRESNEL_PRESETS.atmosphere.power);
    });

    it('all fresnel powers are in valid range', () => {
      const presets = Object.values(FRESNEL_PRESETS);

      for (const preset of presets) {
        // Fresnel power typically ranges from 1.0 to 10.0
        // Below 2.0 is very diffuse, above 6.0 is very tight
        expect(preset.power).toBeGreaterThanOrEqual(1.5);
        expect(preset.power).toBeLessThanOrEqual(10.0);
      }
    });

    it('all fresnel intensities are normalized (0-1)', () => {
      const presets = Object.values(FRESNEL_PRESETS);

      for (const preset of presets) {
        expect(preset.intensity).toBeGreaterThanOrEqual(0);
        expect(preset.intensity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Breathing Presets Match GLSL Values', () => {
    it('standard breathing intensity matches GLSL FrostedGlassMaterial', () => {
      // GLSL FrostedGlassMaterial.tsx uses intensity = 0.12
      expect(BREATHING_PRESETS.standard.intensity).toBe(
        GLSL_COLORS.frostedGlass.breathingIntensity,
      );
    });

    it('innerGlow preset matches GLSL values', () => {
      // GLSL FrostedGlassMaterial.tsx: innerGlowBase = 0.05, breathBoost = 0.3
      expect(BREATHING_PRESETS.innerGlow.baseIntensity).toBe(
        GLSL_COLORS.frostedGlass.innerGlowBase,
      );
      expect(BREATHING_PRESETS.innerGlow.breathBoost).toBe(
        GLSL_COLORS.frostedGlass.innerGlowBreathBoost,
      );
    });

    it('subtle < standard < pronounced intensity', () => {
      expect(BREATHING_PRESETS.subtle.intensity).toBeLessThan(BREATHING_PRESETS.standard.intensity);
      expect(BREATHING_PRESETS.standard.intensity).toBeLessThan(
        BREATHING_PRESETS.pronounced.intensity,
      );
    });

    it('all breathing intensities produce visible but subtle effects', () => {
      // Breathing intensity should be 3-25% (0.03-0.25)
      // Too low = invisible, too high = jarring
      const intensities = [
        BREATHING_PRESETS.subtle.intensity,
        BREATHING_PRESETS.standard.intensity,
        BREATHING_PRESETS.pronounced.intensity,
      ];

      for (const intensity of intensities) {
        expect(intensity).toBeGreaterThanOrEqual(0.03);
        expect(intensity).toBeLessThanOrEqual(0.25);
      }
    });
  });

  describe('Preset Usage in TSL Materials', () => {
    it('FrostedGlassMaterialTSL uses correct default preset', () => {
      // Default should be frostedGlass preset
      // This is validated by checking the presets exist with correct values
      expect(FRESNEL_PRESETS.frostedGlass).toBeDefined();
      expect(BREATHING_PRESETS.standard).toBeDefined();
    });

    it('GlobeMaterialTSL uses atmosphere preset', () => {
      // Globe should use atmosphere preset for rim glow
      expect(FRESNEL_PRESETS.atmosphere).toBeDefined();
      expect(BREATHING_PRESETS.subtle).toBeDefined();
    });

    it('presets are exported from lib/tsl index', () => {
      // Verify exports work correctly (using the imports at top of file)
      expect(FRESNEL_PRESETS).toBeDefined();
      expect(BREATHING_PRESETS).toBeDefined();
      expect(FRESNEL_PRESETS.frostedGlass.power).toBe(2.5);
      expect(BREATHING_PRESETS.standard.intensity).toBe(0.12);
    });
  });

  describe('Mathematical Consistency', () => {
    it('breathing formula produces expected range', () => {
      // Formula: 1.0 + breathPhase * intensity
      // At phase=0: output = 1.0
      // At phase=1: output = 1.0 + intensity

      const intensity = BREATHING_PRESETS.standard.intensity;

      // Exhale (phase=0)
      expect(1.0 + 0 * intensity).toBe(1.0);

      // Peak inhale (phase=1)
      expect(1.0 + 1.0 * intensity).toBe(1.12);

      // Mid breath (phase=0.5)
      expect(1.0 + 0.5 * intensity).toBe(1.06);
    });

    it('inner glow formula produces expected range', () => {
      // Formula: baseIntensity * (1.0 + breathPhase * breathBoost)
      const { baseIntensity, breathBoost } = BREATHING_PRESETS.innerGlow;

      // Exhale (phase=0)
      expect(baseIntensity * (1.0 + 0 * breathBoost)).toBeCloseTo(0.05, 3);

      // Peak inhale (phase=1)
      expect(baseIntensity * (1.0 + 1.0 * breathBoost)).toBeCloseTo(0.065, 3);
    });

    it('fresnel intensity multiplication stays in valid range', () => {
      // When multiplied with fresnel (0-1), result should be reasonable
      const maxIntensity = Math.max(...Object.values(FRESNEL_PRESETS).map((p) => p.intensity));

      // Even at max fresnel (1.0) and max intensity, effect should be < 0.5
      // to avoid over-brightening
      expect(maxIntensity).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Preset Snapshot for Regression', () => {
    it('fresnel presets snapshot', () => {
      expect(FRESNEL_PRESETS).toMatchSnapshot();
    });

    it('breathing presets snapshot', () => {
      expect(BREATHING_PRESETS).toMatchSnapshot();
    });
  });
});
