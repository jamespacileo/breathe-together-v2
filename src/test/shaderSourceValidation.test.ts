/**
 * Shader Source Validation Tests
 *
 * CRITICAL: These tests validate that shader source code contains expected colors.
 * This catches issues where shader colors are accidentally changed to black/invisible.
 *
 * Unlike other visual tests that check material properties, these tests directly
 * validate the shader source strings to catch changes that would cause blank screens.
 */

import { describe, expect, it } from 'vitest';

describe('Shader Source Validation', () => {
  describe('BackgroundGradient shader colors', () => {
    it('should contain warm cream background colors (prevents black screen)', async () => {
      // OUTCOME: Background shader produces visible warm colors, not black
      // Note: We read the file directly since shader strings aren't exported
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const filePath = path.resolve(
        process.cwd(),
        'src/entities/environment/BackgroundGradient.tsx',
      );
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for warm cream sky colors - these are critical for visible background
      // #f5f0e8 = vec3(0.96, 0.94, 0.91)
      expect(content).toMatch(/vec3\s*\(\s*0\.9[56]\s*,\s*0\.9[34]\s*,\s*0\.9[01]\s*\)/);

      // Check that we have warm glow colors (not black)
      expect(content).toMatch(/vec3\s*\(\s*0\.9[89]\s*,\s*0\.9[25]\s*,\s*0\.8[58]\s*\)/);

      // Check that cloud color is near-white (not black)
      expect(content).toMatch(/cloudColor\s*=\s*vec3\s*\(\s*1\.0\s*,/);

      // Ensure no all-black colors in main shader body
      // A black shader would have vec3(0.0, 0.0, 0.0) or similar
      const mainShaderSection = content.match(/void main\(\)[\s\S]*?gl_FragColor/);
      expect(mainShaderSection).toBeTruthy();

      // The shader should NOT have all-black color definitions
      // This catches accidental changes that would cause black screen
      const blackColorPattern = /vec3\s*\(\s*0\.0\s*,\s*0\.0\s*,\s*0\.0\s*\)/g;
      const blackMatches = mainShaderSection?.[0].match(blackColorPattern);

      // Should have 0 or very few black colors (some might be used for calculations)
      expect(blackMatches?.length ?? 0).toBeLessThan(2);
    });

    it('should have visible alpha output (not transparent)', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const filePath = path.resolve(
        process.cwd(),
        'src/entities/environment/BackgroundGradient.tsx',
      );
      const content = await fs.readFile(filePath, 'utf-8');

      // gl_FragColor should have alpha = 1.0 (fully visible)
      expect(content).toMatch(/gl_FragColor\s*=\s*vec4\s*\([^)]*,\s*1\.0\s*\)/);
    });
  });

  describe('EarthGlobe shader colors', () => {
    it('should contain visible fresnel rim colors', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const filePath = path.resolve(process.cwd(), 'src/entities/earthGlobe/index.tsx');
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for warm rim color (should be near-white warm tone)
      // vec3(0.94, 0.90, 0.86) or similar
      expect(content).toMatch(/rimColor\s*=\s*vec3\s*\(\s*0\.9/);

      // Should have visible alpha output
      expect(content).toMatch(/gl_FragColor\s*=\s*vec4\s*\([^)]*,\s*1\.0\s*\)/);
    });

    it('should load earth texture file', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      // Verify texture file exists
      const texturePath = path.resolve(process.cwd(), 'public/textures/earth-texture.png');

      let textureExists = false;
      try {
        await fs.access(texturePath);
        textureExists = true;
      } catch {
        textureExists = false;
      }

      expect(textureExists).toBe(true);

      // Verify component references the texture
      const componentPath = path.resolve(process.cwd(), 'src/entities/earthGlobe/index.tsx');
      const content = await fs.readFile(componentPath, 'utf-8');

      expect(content).toMatch(/earth-texture\.png/);
    });
  });

  describe('FrostedGlassMaterial shader colors', () => {
    it('should contain visible color output (not black)', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const filePath = path.resolve(
        process.cwd(),
        'src/entities/particle/FrostedGlassMaterial.tsx',
      );
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for warm rim color
      expect(content).toMatch(/rimColor\s*=\s*vec3\s*\(\s*0\.9/);

      // Check for inner glow (prevents completely dark particles)
      expect(content).toMatch(/innerGlow/);

      // Should have visible alpha output
      expect(content).toMatch(/gl_FragColor\s*=\s*vec4\s*\([^)]*,\s*1\.0\s*\)/);
    });

    it('should have fallback color for non-instanced use', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const filePath = path.resolve(
        process.cwd(),
        'src/entities/particle/FrostedGlassMaterial.tsx',
      );
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for fallback color (warm neutral)
      // vec3(0.85, 0.75, 0.65) or similar
      expect(content).toMatch(/vColor\s*=\s*vec3\s*\(\s*0\.8/);
    });
  });

  describe('Glow shader (EarthGlobe inner glow)', () => {
    it('should have visible glow color output', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const filePath = path.resolve(process.cwd(), 'src/entities/earthGlobe/index.tsx');
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for glow shader fragment
      expect(content).toMatch(/glowFragmentShader/);

      // Glow color should be defined
      expect(content).toMatch(/glowColor/);
    });
  });

  describe('Critical visibility guards', () => {
    it('should NOT have all-black output in any shader', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const { glob } = await import('glob');

      // Find all shader files
      const shaderFiles = await glob('src/**/*.tsx', { cwd: process.cwd() });

      for (const file of shaderFiles) {
        const filePath = path.resolve(process.cwd(), file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Skip files without shaders
        if (!content.includes('gl_FragColor')) continue;

        // Check that gl_FragColor is not set to pure black with alpha 1
        // This would cause invisible black output
        const hasBlackOutput = content.includes('gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0)');

        expect(hasBlackOutput).toBe(false);
      }
    });

    it('should have at least one visible color definition in each shader file', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const shaderFiles = [
        'src/entities/environment/BackgroundGradient.tsx',
        'src/entities/earthGlobe/index.tsx',
        'src/entities/particle/FrostedGlassMaterial.tsx',
      ];

      for (const file of shaderFiles) {
        const filePath = path.resolve(process.cwd(), file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Should have at least one color with values > 0.5 (visible)
        // This catches shaders that output very dark colors
        const visibleColorPattern = /vec3\s*\(\s*0\.[5-9]\d*\s*,\s*0\.[5-9]/;
        expect(content).toMatch(visibleColorPattern);
      }
    });
  });
});
