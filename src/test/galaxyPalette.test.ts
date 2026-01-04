/**
 * Galaxy Palette Color Harmony Tests - Kurzgesagt Theme Validation
 *
 * These tests ensure that:
 * 1. All palette colors fall within their defined harmony constraints
 * 2. UI text has sufficient contrast against backgrounds
 * 3. Shard colors have consistent saturation/luminance despite varying hues
 * 4. Scene elements use colors from the approved palette
 * 5. Color distance utilities work correctly for render validation
 */

import { describe, expect, it } from 'vitest';
import {
  COLOR_HARMONY_CONSTRAINTS,
  findClosestPaletteColor,
  GALAXY_PALETTE,
  getAllPaletteColors,
  getColorDistance,
  getContrastRatio,
  hexToHSL,
  hexToRGB,
  isColorInHarmony,
  isColorInPalette,
  SCENE_COLOR_MAPPINGS,
  SHARD_COLORS,
} from '../config/galaxyPalette';

describe('Galaxy Palette Color Harmony - Kurzgesagt Theme', () => {
  describe('hexToHSL conversion', () => {
    it('converts pure red correctly', () => {
      const hsl = hexToHSL('#ff0000');
      expect(hsl.h).toBe(0);
      expect(hsl.s).toBe(100);
      expect(hsl.l).toBe(50);
    });

    it('converts pure green correctly', () => {
      const hsl = hexToHSL('#00ff00');
      expect(hsl.h).toBe(120);
      expect(hsl.s).toBe(100);
      expect(hsl.l).toBe(50);
    });

    it('converts pure blue correctly', () => {
      const hsl = hexToHSL('#0000ff');
      expect(hsl.h).toBe(240);
      expect(hsl.s).toBe(100);
      expect(hsl.l).toBe(50);
    });

    it('converts white correctly', () => {
      const hsl = hexToHSL('#ffffff');
      expect(hsl.l).toBe(100);
      expect(hsl.s).toBe(0);
    });

    it('converts black correctly', () => {
      const hsl = hexToHSL('#000000');
      expect(hsl.l).toBe(0);
      expect(hsl.s).toBe(0);
    });
  });

  describe('hexToRGB conversion', () => {
    it('converts hex to RGB correctly', () => {
      const rgb = hexToRGB('#ff5722');
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(87);
      expect(rgb.b).toBe(34);
    });

    it('handles lowercase hex', () => {
      const rgb = hexToRGB('#00bcd4');
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(188);
      expect(rgb.b).toBe(212);
    });
  });

  describe('Background colors - Deep purple/navy (Kurzgesagt style)', () => {
    it('deep background is very dark purple', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.deep, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background deep issues:', result.issues);
      }
    });

    it('mid background is dark purple-navy', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.mid, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background mid issues:', result.issues);
      }
    });

    it('light background stays within purple range', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.light, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background light issues:', result.issues);
      }
    });

    it('nebula background is vibrant purple', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.background.nebula, 'background');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Background nebula issues:', result.issues);
      }
    });

    it('all backgrounds are in purple hue range (240-280)', () => {
      const backgrounds = Object.values(GALAXY_PALETTE.background);
      for (const color of backgrounds) {
        const hsl = hexToHSL(color);
        expect(hsl.h).toBeGreaterThanOrEqual(240);
        expect(hsl.h).toBeLessThanOrEqual(280);
      }
    });
  });

  describe('Sun colors - Golden/amber (Kurzgesagt highlight)', () => {
    it('sun core is bright warm white', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.sun.core, 'sun');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Sun core issues:', result.issues);
      }
    });

    it('sun corona is golden amber', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.sun.corona, 'sun');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Sun corona issues:', result.issues);
      }
    });

    it('sun glow is warm orange', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.sun.glow, 'sun');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Sun glow issues:', result.issues);
      }
    });

    it('sun colors have hue in golden range (30-55)', () => {
      const sunColors = [
        GALAXY_PALETTE.sun.corona,
        GALAXY_PALETTE.sun.glow,
        GALAXY_PALETTE.sun.highlight,
      ];
      for (const color of sunColors) {
        const hsl = hexToHSL(color);
        expect(hsl.h).toBeGreaterThanOrEqual(30);
        expect(hsl.h).toBeLessThanOrEqual(55);
      }
    });
  });

  describe('Constellation colors - Purple/blue visible stars', () => {
    it('constellation stars are bright blue-white', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.constellations.stars, 'constellations');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Constellation stars issues:', result.issues);
      }
    });

    it('constellation lines are purple (matches Kurzgesagt theme)', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.constellations.lines, 'constellations');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Constellation lines issues:', result.issues);
      }
    });

    it('constellation bright lines are within range', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.constellations.linesBright, 'constellations');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Constellation linesBright issues:', result.issues);
      }
    });
  });

  describe('Globe colors - Cool teal/cyan', () => {
    it('globe ocean is cool teal', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.ocean, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe ocean issues:', result.issues);
      }
    });

    it('globe land is muted green', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.land, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe land issues:', result.issues);
      }
    });

    it('globe atmosphere is bright cyan', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.atmosphere, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe atmosphere issues:', result.issues);
      }
    });

    it('globe glow is light teal', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.globe.glow, 'globe');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Globe glow issues:', result.issues);
      }
    });
  });

  describe('Shard colors - Kurzgesagt cell rainbow', () => {
    const primaryShards = [
      { name: 'gratitude', color: GALAXY_PALETTE.shards.gratitude },
      { name: 'presence', color: GALAXY_PALETTE.shards.presence },
      { name: 'release', color: GALAXY_PALETTE.shards.release },
      { name: 'connection', color: GALAXY_PALETTE.shards.connection },
    ];

    const extendedShards = [
      { name: 'cyan', color: GALAXY_PALETTE.shards.cyan },
      { name: 'magenta', color: GALAXY_PALETTE.shards.magenta },
      { name: 'orange', color: GALAXY_PALETTE.shards.orange },
      { name: 'purple', color: GALAXY_PALETTE.shards.purple },
      { name: 'teal', color: GALAXY_PALETTE.shards.teal },
      { name: 'lime', color: GALAXY_PALETTE.shards.lime },
    ];

    const allShards = [...primaryShards, ...extendedShards];
    const constraints = COLOR_HARMONY_CONSTRAINTS.shards;

    it('all primary shards have consistent luminance (40-70%)', () => {
      for (const { name, color } of primaryShards) {
        const hsl = hexToHSL(color);
        expect(hsl.l).toBeGreaterThanOrEqual(constraints.luminance.min);
        expect(hsl.l).toBeLessThanOrEqual(constraints.luminance.max);
        if (hsl.l < constraints.luminance.min || hsl.l > constraints.luminance.max) {
          console.log(`Shard ${name} luminance out of range: ${hsl.l}`);
        }
      }
    });

    it('all shards have saturation >= 35% for vibrancy', () => {
      for (const { name, color } of allShards) {
        const hsl = hexToHSL(color);
        expect(hsl.s).toBeGreaterThanOrEqual(constraints.saturation.min);
        if (hsl.s < constraints.saturation.min) {
          console.log(`Shard ${name} saturation too low: ${hsl.s}`);
        }
      }
    });

    it('shard luminance delta is within 40 points for visual consistency', () => {
      const luminances = allShards.map(({ color }) => hexToHSL(color).l);
      const maxLuminance = Math.max(...luminances);
      const minLuminance = Math.min(...luminances);
      const delta = maxLuminance - minLuminance;

      expect(delta).toBeLessThanOrEqual(40);
    });

    it('shards cover diverse hues (rainbow effect)', () => {
      const hues = allShards.map(({ color }) => hexToHSL(color).h);
      hues.sort((a, b) => a - b);

      // Should have colors spread across the hue wheel
      // Check that we have hues in at least 5 different 60° sectors
      const sectors = new Set(hues.map((h) => Math.floor(h / 60)));
      expect(sectors.size).toBeGreaterThanOrEqual(5);
    });

    it('SHARD_COLORS array matches palette shards', () => {
      expect(SHARD_COLORS).toContain(GALAXY_PALETTE.shards.gratitude);
      expect(SHARD_COLORS).toContain(GALAXY_PALETTE.shards.presence);
      expect(SHARD_COLORS).toContain(GALAXY_PALETTE.shards.release);
      expect(SHARD_COLORS).toContain(GALAXY_PALETTE.shards.connection);
      expect(SHARD_COLORS).toContain(GALAXY_PALETTE.shards.cyan);
      expect(SHARD_COLORS).toContain(GALAXY_PALETTE.shards.magenta);
    });
  });

  describe('Cosmic dust colors', () => {
    it('cosmic dust blue is bright purple-blue', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.blue, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust blue issues:', result.issues);
      }
    });

    it('cosmic dust purple is light purple', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.purple, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust purple issues:', result.issues);
      }
    });

    it('cosmic dust white is very light', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.white, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust white issues:', result.issues);
      }
    });

    it('cosmic dust gold is soft golden', () => {
      const result = isColorInHarmony(GALAXY_PALETTE.cosmicDust.gold, 'cosmicDust');
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.log('Cosmic dust gold issues:', result.issues);
      }
    });
  });

  describe('UI contrast requirements', () => {
    it('white text has sufficient contrast against deep background (WCAG AA)', () => {
      const contrast = getContrastRatio(GALAXY_PALETTE.ui.text, GALAXY_PALETTE.background.deep);
      // WCAG AA requires 4.5:1 for normal text
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('white text has sufficient contrast against mid background', () => {
      const contrast = getContrastRatio(GALAXY_PALETTE.ui.text, GALAXY_PALETTE.background.mid);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('muted text has sufficient contrast against deep background', () => {
      const contrast = getContrastRatio(
        GALAXY_PALETTE.ui.textMuted,
        GALAXY_PALETTE.background.deep,
      );
      // Muted text should still be readable (at least 3:1)
      expect(contrast).toBeGreaterThanOrEqual(3);
    });

    it('golden accent is visible against dark background', () => {
      const contrast = getContrastRatio(GALAXY_PALETTE.ui.accent, GALAXY_PALETTE.background.deep);
      expect(contrast).toBeGreaterThanOrEqual(3);
    });

    it('cyan accent is visible against dark background', () => {
      const contrast = getContrastRatio(
        GALAXY_PALETTE.ui.accentAlt,
        GALAXY_PALETTE.background.deep,
      );
      expect(contrast).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Overall palette harmony - Kurzgesagt style', () => {
    it('sun provides warm/cool contrast against purple background', () => {
      const bgHue = hexToHSL(GALAXY_PALETTE.background.deep).h;
      const sunHue = hexToHSL(GALAXY_PALETTE.sun.corona).h;

      // Hue difference should be significant for warm/cool contrast
      const hueDiff = Math.abs(bgHue - sunHue);
      const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);

      // Purple (260) vs Gold (42) = ~142° apart
      expect(normalizedDiff).toBeGreaterThanOrEqual(100);
    });

    it('globe complements sun (cool vs warm contrast)', () => {
      const globeHue = hexToHSL(GALAXY_PALETTE.globe.atmosphere).h;
      const sunHue = hexToHSL(GALAXY_PALETTE.sun.corona).h;

      const hueDiff = Math.abs(globeHue - sunHue);
      const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);

      // Cyan (187) vs Gold (42) = ~145° apart
      expect(normalizedDiff).toBeGreaterThanOrEqual(100);
    });

    it('constellation lines are purple-themed (matching background family)', () => {
      const lineHue = hexToHSL(GALAXY_PALETTE.constellations.lines).h;
      // Should be in purple range to match Kurzgesagt theme
      expect(lineHue).toBeGreaterThanOrEqual(200);
      expect(lineHue).toBeLessThanOrEqual(280);
    });
  });
});

describe('Color Distance and Palette Validation Utilities', () => {
  describe('getColorDistance', () => {
    it('returns 0 for identical colors', () => {
      expect(getColorDistance('#ff5722', '#ff5722')).toBe(0);
    });

    it('returns max distance for black and white', () => {
      const distance = getColorDistance('#000000', '#ffffff');
      // sqrt(255^2 * 3) ≈ 441.67
      expect(distance).toBeCloseTo(441.67, 0);
    });

    it('calculates correct distance for similar colors', () => {
      const distance = getColorDistance('#ff0000', '#ff1100');
      // Only green channel differs by 17
      expect(distance).toBe(17);
    });
  });

  describe('findClosestPaletteColor', () => {
    it('finds exact match in palette', () => {
      const result = findClosestPaletteColor(GALAXY_PALETTE.shards.cyan);
      expect(result.distance).toBe(0);
      expect(result.name).toBe('shards.cyan');
    });

    it('finds closest color for similar shade', () => {
      // Slightly modified cyan
      const result = findClosestPaletteColor('#00c0d8');
      expect(result.name).toBe('shards.cyan');
      expect(result.distance).toBeLessThan(10);
    });

    it('can search within specific category', () => {
      const result = findClosestPaletteColor('#ff9900', 'sun');
      expect(result.name).toContain('sun.');
    });
  });

  describe('isColorInPalette', () => {
    it('returns true for exact palette colors', () => {
      expect(isColorInPalette(GALAXY_PALETTE.shards.magenta)).toBe(true);
      expect(isColorInPalette(GALAXY_PALETTE.sun.corona)).toBe(true);
      expect(isColorInPalette(GALAXY_PALETTE.background.deep)).toBe(true);
    });

    it('returns true for colors within threshold', () => {
      // Slightly off from palette color
      expect(isColorInPalette('#00bbd0', 30)).toBe(true); // Close to cyan
    });

    it('returns false for colors outside threshold', () => {
      // Completely different color not in palette
      expect(isColorInPalette('#123456', 10)).toBe(false);
    });
  });

  describe('getAllPaletteColors', () => {
    it('returns all palette colors with names', () => {
      const colors = getAllPaletteColors();

      // Should have colors from all categories
      expect(colors.some((c) => c.name.startsWith('background.'))).toBe(true);
      expect(colors.some((c) => c.name.startsWith('sun.'))).toBe(true);
      expect(colors.some((c) => c.name.startsWith('shards.'))).toBe(true);
      expect(colors.some((c) => c.name.startsWith('globe.'))).toBe(true);
      expect(colors.some((c) => c.name.startsWith('ui.'))).toBe(true);
    });

    it('returns correct number of colors', () => {
      const colors = getAllPaletteColors();
      // Count all colors in palette
      const expectedCount =
        Object.keys(GALAXY_PALETTE.background).length +
        Object.keys(GALAXY_PALETTE.sun).length +
        Object.keys(GALAXY_PALETTE.constellations).length +
        Object.keys(GALAXY_PALETTE.globe).length +
        Object.keys(GALAXY_PALETTE.shards).length +
        Object.keys(GALAXY_PALETTE.cosmicDust).length +
        Object.keys(GALAXY_PALETTE.ui).length;

      expect(colors.length).toBe(expectedCount);
    });
  });
});

describe('Scene Element Color Mappings', () => {
  it('all scene mappings reference valid palette colors', () => {
    const paletteColors = getAllPaletteColors().map((c) => c.hex);

    for (const [_element, color] of Object.entries(SCENE_COLOR_MAPPINGS)) {
      expect(paletteColors).toContain(color);
    }
  });

  it('background shader colors match palette', () => {
    expect(SCENE_COLOR_MAPPINGS.backgroundDeep).toBe(GALAXY_PALETTE.background.deep);
    expect(SCENE_COLOR_MAPPINGS.backgroundMid).toBe(GALAXY_PALETTE.background.mid);
    expect(SCENE_COLOR_MAPPINGS.backgroundNebula).toBe(GALAXY_PALETTE.background.nebula);
  });

  it('sun component colors match palette', () => {
    expect(SCENE_COLOR_MAPPINGS.sunCore).toBe(GALAXY_PALETTE.sun.core);
    expect(SCENE_COLOR_MAPPINGS.sunCorona).toBe(GALAXY_PALETTE.sun.corona);
    expect(SCENE_COLOR_MAPPINGS.sunGlow).toBe(GALAXY_PALETTE.sun.glow);
  });

  it('globe component colors match palette', () => {
    expect(SCENE_COLOR_MAPPINGS.globeAtmosphere).toBe(GALAXY_PALETTE.globe.atmosphere);
    expect(SCENE_COLOR_MAPPINGS.globeGlow).toBe(GALAXY_PALETTE.globe.glow);
  });

  it('shard colors include all mood types', () => {
    expect(SCENE_COLOR_MAPPINGS.shardGratitude).toBe(GALAXY_PALETTE.shards.gratitude);
    expect(SCENE_COLOR_MAPPINGS.shardPresence).toBe(GALAXY_PALETTE.shards.presence);
    expect(SCENE_COLOR_MAPPINGS.shardRelease).toBe(GALAXY_PALETTE.shards.release);
    expect(SCENE_COLOR_MAPPINGS.shardConnection).toBe(GALAXY_PALETTE.shards.connection);
  });

  it('extended shard colors are available', () => {
    expect(SCENE_COLOR_MAPPINGS.shardCyan).toBe(GALAXY_PALETTE.shards.cyan);
    expect(SCENE_COLOR_MAPPINGS.shardMagenta).toBe(GALAXY_PALETTE.shards.magenta);
    expect(SCENE_COLOR_MAPPINGS.shardOrange).toBe(GALAXY_PALETTE.shards.orange);
    expect(SCENE_COLOR_MAPPINGS.shardPurple).toBe(GALAXY_PALETTE.shards.purple);
    expect(SCENE_COLOR_MAPPINGS.shardTeal).toBe(GALAXY_PALETTE.shards.teal);
    expect(SCENE_COLOR_MAPPINGS.shardLime).toBe(GALAXY_PALETTE.shards.lime);
  });
});

describe('Rendered Color Validation (simulated)', () => {
  /**
   * These tests simulate validating colors sampled from the rendered scene.
   * In a real implementation, you would:
   * 1. Render the scene to a canvas
   * 2. Sample pixel colors from specific elements
   * 3. Validate they match the expected palette colors
   */

  it('simulated background color is within palette', () => {
    // Simulate sampling a color from the rendered background
    const sampledBackgroundColor = '#0d0a1a'; // Deep purple-black
    const closest = findClosestPaletteColor(sampledBackgroundColor, 'background');
    expect(closest.distance).toBeLessThan(30);
  });

  it('simulated sun corona is within palette', () => {
    // Simulate sampling the sun corona color
    const sampledSunColor = '#ffb300'; // Golden amber
    const closest = findClosestPaletteColor(sampledSunColor, 'sun');
    expect(closest.distance).toBeLessThan(30);
  });

  it('simulated shard colors are all from palette', () => {
    // Simulate sampling colors from rendered shards
    const sampledShardColors = [
      '#4caf50', // Green
      '#29b6f6', // Blue
      '#f06292', // Pink
      '#ffb300', // Gold
      '#00bcd4', // Cyan
      '#e91e63', // Magenta
    ];

    for (const color of sampledShardColors) {
      expect(isColorInPalette(color, 30)).toBe(true);
    }
  });

  it('validates color variations from shader effects', () => {
    // Shaders may slightly modify colors - validate they're still close
    const originalColor = GALAXY_PALETTE.shards.cyan;
    const shaderModifiedColors = [
      '#00b8d0', // Slightly darker
      '#02c0d8', // Slightly lighter
      '#00bcd6', // Tiny hue shift
    ];

    for (const modified of shaderModifiedColors) {
      const distance = getColorDistance(originalColor, modified);
      // Should be within acceptable shader variation (< 20 RGB units)
      expect(distance).toBeLessThan(20);
    }
  });

  it('detects colors outside the palette', () => {
    // These colors should NOT be in the Kurzgesagt palette
    const offPaletteColors = [
      '#8b4513', // Brown (not in palette)
      '#808080', // Gray (not in palette)
      '#228b22', // Forest green (wrong shade)
    ];

    for (const color of offPaletteColors) {
      const closest = findClosestPaletteColor(color);
      // These should have significant distance from any palette color
      expect(closest.distance).toBeGreaterThan(50);
    }
  });
});

describe('Kurzgesagt Color Coherence', () => {
  it('primary colors create visual hierarchy', () => {
    // Background should be darkest
    const bgLuminance = hexToHSL(GALAXY_PALETTE.background.deep).l;
    // Sun should be brightest
    const sunLuminance = hexToHSL(GALAXY_PALETTE.sun.core).l;
    // Shards should be medium
    const shardLuminance = hexToHSL(GALAXY_PALETTE.shards.presence).l;

    expect(bgLuminance).toBeLessThan(shardLuminance);
    expect(shardLuminance).toBeLessThan(sunLuminance);
  });

  it('warm and cool colors are balanced', () => {
    // Count warm vs cool colors
    const allColors = getAllPaletteColors();
    let warmCount = 0;
    let coolCount = 0;

    for (const { hex } of allColors) {
      const hue = hexToHSL(hex).h;
      if (hue >= 0 && hue < 60)
        warmCount++; // Red/Orange/Yellow
      else if (hue >= 60 && hue < 150)
        warmCount++; // Yellow/Green (warm side)
      else if (hue >= 150 && hue < 270)
        coolCount++; // Cyan/Blue/Purple
      else coolCount++; // Purple/Red transition
    }

    // Should have both warm and cool colors
    expect(warmCount).toBeGreaterThan(0);
    expect(coolCount).toBeGreaterThan(0);
  });

  it('high saturation colors dominate (Kurzgesagt vibrant style)', () => {
    const shardColors = Object.values(GALAXY_PALETTE.shards);
    const avgSaturation =
      shardColors.reduce((sum, color) => {
        return sum + hexToHSL(color).s;
      }, 0) / shardColors.length;

    // Kurzgesagt style uses vibrant, saturated colors
    expect(avgSaturation).toBeGreaterThan(60);
  });
});
