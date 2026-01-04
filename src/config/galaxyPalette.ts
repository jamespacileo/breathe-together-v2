/**
 * Galaxy Scene Color Palette - Kurzgesagt Inspired
 *
 * Inspired by the Kurzgesagt "Immune" book cover aesthetic:
 * - Deep purple/navy space backgrounds
 * - Vibrant, highly saturated accent colors
 * - Golden yellow as prominent highlight
 * - Rainbow of cell-like particle colors with consistent luminance
 *
 * Color Harmony Strategy:
 * - Background: Deep purple-navy (Kurzgesagt space feel)
 * - Sun/Highlight: Warm golden/orange for dramatic contrast
 * - Globe: Cool teal to complement the warm accents
 * - Shards: Kurzgesagt cell colors - vibrant rainbow with consistent saturation
 * - UI/Constellations: Neutral blue-white for visibility
 */

// HSL color type for testing
export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// RGB color type
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// Convert hex to HSL
export function hexToHSL(hex: string): HSLColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { h: 0, s: 0, l: 0 };
  }

  const r = Number.parseInt(result[1], 16) / 255;
  const g = Number.parseInt(result[2], 16) / 255;
  const b = Number.parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert hex to RGB
export function hexToRGB(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

// Convert HSL to hex
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Kurzgesagt-Inspired Galaxy Scene Color Palette
 *
 * Sampled and inspired by the "Immune" book cover by Philipp Dettmer
 * Uses deep purple backgrounds with vibrant cell-like accents
 */
export const GALAXY_PALETTE = {
  // === BACKGROUND ===
  // Deep space purple-navy - Kurzgesagt signature style
  background: {
    deep: '#0d0a1a', // Deepest purple-black (h:255, s:40, l:7)
    mid: '#1a1040', // Dark purple-navy (h:260, s:60, l:16)
    light: '#2d1b69', // Lighter purple for nebula glow (h:258, s:59, l:26)
    nebula: '#3d2080', // Vibrant purple for nebula highlights (h:262, s:60, l:31)
  },

  // === SUN/HIGHLIGHT ===
  // Warm golden yellow - Kurzgesagt's signature highlight color
  sun: {
    core: '#fff8e0', // Bright warm white (h:48, s:100, l:94)
    corona: '#ffb300', // Golden amber (h:42, s:100, l:50)
    glow: '#ff9800', // Deep orange (h:36, s:100, l:50)
    highlight: '#ffc107', // Bright yellow accent (h:45, s:100, l:52)
  },

  // === CONSTELLATIONS ===
  // Blue-white stars against purple background
  constellations: {
    stars: '#e8f4ff', // Blue-white stars (h:210, s:100, l:96)
    lines: '#7b68ee', // Medium slate blue (h:249, s:80, l:67) - purple-ish
    linesBright: '#9b8bff', // Brighter on inhale (h:249, s:100, l:77)
  },

  // === GLOBE ===
  // Cool teal to contrast warm sun - ocean/earth feel
  globe: {
    ocean: '#1a5c6e', // Deep teal ocean (h:192, s:62, l:27)
    land: '#2d8a6e', // Muted green land (h:158, s:50, l:36)
    atmosphere: '#26c6da', // Bright cyan atmosphere (h:187, s:70, l:50)
    glow: '#4dd9e8', // Lighter teal glow (h:186, s:75, l:60)
  },

  // === SHARDS (KURZGESAGT CELL COLORS) ===
  // Vibrant rainbow colors like the cells in Immune book
  // All colors have saturation 75-95% and luminance 50-65% for consistency
  shards: {
    // Primary mood colors (core set)
    gratitude: '#4caf50', // Green cell (h:122, s:39, l:50)
    presence: '#29b6f6', // Light blue cell (h:199, s:91, l:56)
    release: '#f06292', // Pink cell (h:340, s:82, l:66)
    connection: '#ffb300', // Amber/gold cell (h:42, s:100, l:50)

    // Extended Kurzgesagt palette (for variety)
    cyan: '#00bcd4', // Cyan cell (h:187, s:100, l:42)
    magenta: '#e91e63', // Magenta cell (h:340, s:82, l:52)
    orange: '#ff5722', // Deep orange cell (h:14, s:100, l:57)
    purple: '#9c27b0', // Purple cell (h:291, s:64, l:42)
    teal: '#009688', // Teal cell (h:174, s:100, l:29)
    lime: '#8bc34a', // Lime cell (h:88, s:50, l:53)
  },

  // === COSMIC DUST ===
  // Subtle particles matching the purple/blue theme
  cosmicDust: {
    blue: '#7c4dff', // Bright purple-blue (h:255, s:100, l:65)
    purple: '#b388ff', // Light purple (h:262, s:100, l:77)
    white: '#e8e8ff', // Blue-white (h:240, s:100, l:95)
    gold: '#ffe082', // Soft gold dust (h:45, s:100, l:76)
  },

  // === UI ===
  // Readable against dark purple background
  ui: {
    text: '#ffffff', // Pure white for text
    textMuted: '#b39ddb', // Muted purple (h:262, s:44, l:74)
    accent: '#ffb300', // Golden accent (matches sun)
    accentAlt: '#29b6f6', // Cyan accent (matches presence)
  },
} as const;

/**
 * Color harmony constraints for testing
 * These define acceptable ranges for color properties
 * Based on Kurzgesagt visual style analysis
 */
export const COLOR_HARMONY_CONSTRAINTS = {
  // Background should be deep purple-navy
  background: {
    luminance: { min: 3, max: 35 }, // Dark but allows purple glow
    saturation: { min: 35, max: 70 }, // Medium-high saturation
    hue: { min: 240, max: 280 }, // Purple range
  },

  // Sun should be warm golden
  sun: {
    luminance: { min: 45, max: 98 }, // Medium to high luminance
    saturation: { min: 80, max: 100 }, // High saturation
    hue: { min: 30, max: 55 }, // Golden/amber range
  },

  // Constellations should be cool and visible
  constellations: {
    luminance: { min: 60, max: 98 }, // High luminance for visibility
    saturation: { min: 40, max: 100 }, // Medium-high saturation
    hue: { min: 200, max: 280 }, // Blue to purple range
  },

  // Globe should be cool teal/cyan
  globe: {
    luminance: { min: 25, max: 65 }, // Medium luminance
    saturation: { min: 45, max: 100 }, // Medium-high saturation
    hue: { min: 150, max: 200 }, // Green to cyan range
  },

  // Shards should have vibrant, consistent appearance
  shards: {
    luminance: { min: 40, max: 70 }, // Consistent medium-high luminance
    saturation: { min: 35, max: 100 }, // High saturation for vibrancy
    // Hue varies for rainbow effect - no constraint
  },

  // Cosmic dust should be purple/blue themed
  cosmicDust: {
    luminance: { min: 55, max: 98 }, // High luminance (subtle glow)
    saturation: { min: 40, max: 100 }, // Medium-high saturation
    hue: { min: 40, max: 280 }, // Yellow to purple (includes gold)
  },
} as const;

/**
 * Check if a color falls within harmony constraints
 */
export function isColorInHarmony(
  hex: string,
  category: keyof typeof COLOR_HARMONY_CONSTRAINTS,
): { valid: boolean; issues: string[] } {
  const hsl = hexToHSL(hex);
  const constraints = COLOR_HARMONY_CONSTRAINTS[category];
  const issues: string[] = [];

  if (hsl.l < constraints.luminance.min || hsl.l > constraints.luminance.max) {
    issues.push(
      `Luminance ${hsl.l} outside range [${constraints.luminance.min}, ${constraints.luminance.max}]`,
    );
  }

  if (hsl.s < constraints.saturation.min || hsl.s > constraints.saturation.max) {
    issues.push(
      `Saturation ${hsl.s} outside range [${constraints.saturation.min}, ${constraints.saturation.max}]`,
    );
  }

  if ('hue' in constraints) {
    const hueConstraint = constraints.hue as { min: number; max: number };
    // Handle hue wrap-around
    const hueInRange =
      hueConstraint.min <= hueConstraint.max
        ? hsl.h >= hueConstraint.min && hsl.h <= hueConstraint.max
        : hsl.h >= hueConstraint.min || hsl.h <= hueConstraint.max;

    if (!hueInRange) {
      issues.push(`Hue ${hsl.h} outside range [${hueConstraint.min}, ${hueConstraint.max}]`);
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Calculate color contrast ratio (WCAG)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;

    const [r, g, b] = [
      Number.parseInt(result[1], 16) / 255,
      Number.parseInt(result[2], 16) / 255,
      Number.parseInt(result[3], 16) / 255,
    ].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate color distance (Euclidean in RGB space)
 * Useful for validating rendered colors match palette
 */
export function getColorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRGB(hex1);
  const rgb2 = hexToRGB(hex2);

  return Math.sqrt((rgb1.r - rgb2.r) ** 2 + (rgb1.g - rgb2.g) ** 2 + (rgb1.b - rgb2.b) ** 2);
}

/**
 * Find the closest palette color to a given color
 * Useful for validating rendered colors are from the palette
 */
export function findClosestPaletteColor(
  hex: string,
  paletteCategory?: keyof typeof GALAXY_PALETTE,
): { color: string; name: string; distance: number } {
  let minDistance = Number.POSITIVE_INFINITY;
  let closestColor = '';
  let closestName = '';

  const searchInCategory = (category: Record<string, string>, categoryName: string) => {
    for (const [name, color] of Object.entries(category)) {
      const distance = getColorDistance(hex, color);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
        closestName = `${categoryName}.${name}`;
      }
    }
  };

  if (paletteCategory) {
    const category = GALAXY_PALETTE[paletteCategory];
    if (typeof category === 'object') {
      searchInCategory(category as Record<string, string>, paletteCategory);
    }
  } else {
    // Search all categories
    for (const [categoryName, category] of Object.entries(GALAXY_PALETTE)) {
      if (typeof category === 'object') {
        searchInCategory(category as Record<string, string>, categoryName);
      }
    }
  }

  return { color: closestColor, name: closestName, distance: minDistance };
}

/**
 * Validate that a color is within acceptable distance of a palette color
 * Default threshold of 30 allows for slight shader variations
 */
export function isColorInPalette(hex: string, threshold = 30): boolean {
  const closest = findClosestPaletteColor(hex);
  return closest.distance <= threshold;
}

/**
 * Get all palette colors as a flat array for validation
 */
export function getAllPaletteColors(): { name: string; hex: string }[] {
  const colors: { name: string; hex: string }[] = [];

  for (const [categoryName, category] of Object.entries(GALAXY_PALETTE)) {
    if (typeof category === 'object') {
      for (const [name, hex] of Object.entries(category)) {
        colors.push({ name: `${categoryName}.${name}`, hex: hex as string });
      }
    }
  }

  return colors;
}

/**
 * Scene element color mappings
 * Maps scene elements to their expected palette colors
 * Used by tests to validate rendered colors
 */
export const SCENE_COLOR_MAPPINGS = {
  // Background shader colors
  backgroundDeep: GALAXY_PALETTE.background.deep,
  backgroundMid: GALAXY_PALETTE.background.mid,
  backgroundNebula: GALAXY_PALETTE.background.nebula,

  // Sun component colors
  sunCore: GALAXY_PALETTE.sun.core,
  sunCorona: GALAXY_PALETTE.sun.corona,
  sunGlow: GALAXY_PALETTE.sun.glow,

  // Globe component colors
  globeAtmosphere: GALAXY_PALETTE.globe.atmosphere,
  globeGlow: GALAXY_PALETTE.globe.glow,
  globeOcean: GALAXY_PALETTE.globe.ocean,

  // Constellation colors
  constellationStars: GALAXY_PALETTE.constellations.stars,
  constellationLines: GALAXY_PALETTE.constellations.lines,

  // Shard colors (mood-based)
  shardGratitude: GALAXY_PALETTE.shards.gratitude,
  shardPresence: GALAXY_PALETTE.shards.presence,
  shardRelease: GALAXY_PALETTE.shards.release,
  shardConnection: GALAXY_PALETTE.shards.connection,

  // Extended shard colors
  shardCyan: GALAXY_PALETTE.shards.cyan,
  shardMagenta: GALAXY_PALETTE.shards.magenta,
  shardOrange: GALAXY_PALETTE.shards.orange,
  shardPurple: GALAXY_PALETTE.shards.purple,
  shardTeal: GALAXY_PALETTE.shards.teal,
  shardLime: GALAXY_PALETTE.shards.lime,

  // Cosmic dust
  cosmicDustBlue: GALAXY_PALETTE.cosmicDust.blue,
  cosmicDustPurple: GALAXY_PALETTE.cosmicDust.purple,
  cosmicDustWhite: GALAXY_PALETTE.cosmicDust.white,
  cosmicDustGold: GALAXY_PALETTE.cosmicDust.gold,

  // UI colors
  uiText: GALAXY_PALETTE.ui.text,
  uiAccent: GALAXY_PALETTE.ui.accent,
} as const;

/**
 * Shard palette array for random selection
 * Includes all Kurzgesagt cell colors for visual variety
 */
export const SHARD_COLORS = [
  GALAXY_PALETTE.shards.gratitude,
  GALAXY_PALETTE.shards.presence,
  GALAXY_PALETTE.shards.release,
  GALAXY_PALETTE.shards.connection,
  GALAXY_PALETTE.shards.cyan,
  GALAXY_PALETTE.shards.magenta,
  GALAXY_PALETTE.shards.orange,
  GALAXY_PALETTE.shards.purple,
  GALAXY_PALETTE.shards.teal,
  GALAXY_PALETTE.shards.lime,
] as const;
