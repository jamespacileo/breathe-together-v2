/**
 * Galaxy Scene Color Palette
 *
 * A cohesive color palette for the stylized galaxy/universe scene.
 * All colors are designed to work harmoniously together with:
 * - Cool deep space background
 * - Warm sun accent
 * - Balanced globe and shard colors
 *
 * Color Harmony Strategy:
 * - Background: Deep cool blues/purples (low luminance, low saturation)
 * - Accents: Warm golden/orange (sun) for contrast
 * - Globe: Cool teal to complement the warm sun
 * - Shards: Varied hues with consistent saturation (~60-70%) and luminance (~50-60%)
 * - UI/Constellations: Neutral blue-white for visibility
 */

// HSL color type for testing
export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
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
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Galaxy Scene Color Palette
 */
export const GALAXY_PALETTE = {
  // === BACKGROUND ===
  // Deep space colors - very low luminance, cool tones
  background: {
    deep: '#0a0a14', // Near black with blue tint (h:240, s:33, l:6)
    mid: '#0d1020', // Dark navy (h:230, s:43, l:9)
    light: '#151a2e', // Subtle purple-blue (h:232, s:36, l:13)
    nebula: '#1a1533', // Deep purple for nebula (h:255, s:38, l:14)
  },

  // === SUN ===
  // Warm golden accent - high saturation, medium-high luminance
  sun: {
    core: '#fff8e0', // Bright warm white (h:48, s:100, l:94)
    corona: '#ffaa44', // Golden orange (h:36, s:100, l:64)
    glow: '#ff8833', // Deeper orange (h:27, s:100, l:60)
  },

  // === CONSTELLATIONS ===
  // Cool blue-white for visibility against dark background
  constellations: {
    stars: '#e8f4ff', // Blue-white stars (h:210, s:100, l:96)
    lines: '#5577bb', // Muted blue lines (h:225, s:42, l:54) - distinct from shards
    linesBright: '#7799dd', // Brighter on inhale (h:222, s:56, l:67)
  },

  // === GLOBE ===
  // Cool teal to complement warm sun
  globe: {
    ocean: '#1a5c6e', // Deep teal ocean (h:192, s:62, l:27)
    land: '#2d8a6e', // Muted green land (h:158, s:50, l:36)
    atmosphere: '#4db8c4', // Bright teal atmosphere (h:186, s:51, l:54)
    glow: '#66d4e0', // Lighter teal glow (h:186, s:60, l:64)
  },

  // === SHARDS ===
  // Four mood colors with consistent saturation (60-70%) and luminance (50-60%)
  shards: {
    gratitude: '#4cd964', // Green (h:130, s:64, l:56) - growth, appreciation
    presence: '#5ac8fa', // Blue (h:199, s:94, l:67) - calm, awareness
    release: '#ff6b6b', // Coral/Red (h:0, s:100, l:71) - letting go
    connection: '#ffcc00', // Gold (h:48, s:100, l:50) - warmth, unity
  },

  // === COSMIC DUST ===
  // Subtle cool particles
  cosmicDust: {
    blue: '#aaccff', // Light blue (h:220, s:100, l:83)
    purple: '#ccaaff', // Light purple (h:270, s:100, l:83)
    white: '#e8e8ff', // Blue-white (h:240, s:100, l:95)
  },

  // === UI ===
  // Readable against dark background
  ui: {
    text: '#ffffff', // Pure white for text
    textMuted: '#8899aa', // Muted blue-gray (h:210, s:20, l:60)
    accent: '#66aacc', // Teal accent (h:200, s:50, l:60)
  },
} as const;

/**
 * Color harmony constraints for testing
 * These define acceptable ranges for color properties
 */
export const COLOR_HARMONY_CONSTRAINTS = {
  // Background should be very dark and cool
  background: {
    luminance: { min: 3, max: 18 }, // Very low luminance
    saturation: { min: 20, max: 50 }, // Low-medium saturation
    hue: { min: 220, max: 280 }, // Blue to purple range
  },

  // Sun should be warm and bright
  sun: {
    luminance: { min: 55, max: 98 }, // High luminance
    saturation: { min: 80, max: 100 }, // High saturation
    hue: { min: 20, max: 55 }, // Orange to yellow range
  },

  // Constellations should be cool and visible
  constellations: {
    luminance: { min: 40, max: 98 }, // Medium to high luminance
    saturation: { min: 30, max: 100 }, // Medium saturation
    hue: { min: 200, max: 240 }, // Blue range (distinct from teal shards)
  },

  // Globe should be cool teal
  globe: {
    luminance: { min: 25, max: 70 }, // Medium luminance
    saturation: { min: 40, max: 70 }, // Medium saturation
    hue: { min: 150, max: 200 }, // Green to cyan range
  },

  // Shards should have consistent saturation and luminance despite varying hues
  shards: {
    luminance: { min: 45, max: 75 }, // Consistent medium-high luminance
    saturation: { min: 55, max: 100 }, // High saturation for vibrancy
    // Hue varies - no constraint
  },

  // Cosmic dust should be subtle and cool
  cosmicDust: {
    luminance: { min: 75, max: 98 }, // High luminance (subtle)
    saturation: { min: 50, max: 100 }, // Medium-high saturation
    hue: { min: 200, max: 280 }, // Blue to purple range
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
