/**
 * Ribbon System Configuration
 *
 * Data-driven configuration for the globe ribbon text system.
 * Follows AAA game dev patterns: separate config from logic.
 *
 * ARCHITECTURE:
 * - Layers: Fixed vertical positions (guarantees no overlap)
 * - Styles: Visual properties with randomization ranges
 * - Runtime: Resolves random values within constraints
 *
 * To customize:
 * 1. Modify DEFAULT_CONFIG for global changes
 * 2. Create variant configs for different moods/themes
 * 3. Use seed for reproducible randomness
 */

// =============================================================================
// Types
// =============================================================================

/** Numeric range for randomization */
export interface Range {
  min: number;
  max: number;
}

/** A layer defines a fixed vertical position on the globe */
export interface RibbonLayer {
  /** Unique identifier */
  id: string;
  /** Vertical offset from equator (-1 to 1 range, 0 = equator) */
  height: number;
  /** Base tilt angle in radians */
  baseTilt: number;
  /** Tilt variance range (randomized) */
  tiltVariance: Range;
  /** Scroll direction: 1 = with globe, -1 = against */
  scrollDirection: 1 | -1;
  /** Purpose determines content source */
  purpose: 'top' | 'bottom' | 'combined' | 'decorative';
  /** Whether this layer is enabled */
  enabled: boolean;
  /** Layer priority (higher = renders on top) */
  zIndex: number;
}

/** Visual style with randomization ranges */
export interface RibbonStyle {
  /** Color palette (random selection) */
  colors: string[];
  /** Font size range */
  fontSize: Range;
  /** Base opacity (breath-scaled) */
  opacity: {
    base: number;
    /** Multiplier during exhale (lower = more fade) */
    breathMin: number;
  };
  /** Scroll speed multiplier range */
  scrollSpeed: Range;
  /** Letter spacing */
  letterSpacing: number;
  /** Font weight */
  fontWeight: number;
  /** Glyph detail for curved text */
  glyphDetail: number;
}

/** Complete ribbon system configuration */
export interface RibbonSystemConfig {
  /** Globe radius (for positioning calculations) */
  globeRadius: number;
  /** Offset from globe surface */
  surfaceOffset: number;
  /** Base scroll speed (before per-layer multiplier) */
  baseScrollSpeed: number;
  /** Globe rotation sync speed */
  globeSyncSpeed: number;
  /** Layer definitions */
  layers: RibbonLayer[];
  /** Style definitions by purpose */
  styles: {
    primary: RibbonStyle;
    secondary: RibbonStyle;
    accent: RibbonStyle;
  };
  /** Random seed for reproducibility (null = truly random) */
  seed: number | null;
}

// =============================================================================
// Color Palettes
// =============================================================================

/** Teal/cyan palette - calming, oceanic */
export const PALETTE_TEAL = [
  '#7ec8c8', // Light teal
  '#5eb3b2', // Medium teal
  '#4aa3a3', // Deep teal
  '#6bc4c4', // Soft teal
  '#8dd3d3', // Pale teal
];

/** Warm gold palette - comforting, sunrise */
export const PALETTE_GOLD = [
  '#d4a574', // Warm gold
  '#c9956a', // Amber
  '#deb887', // Soft gold
  '#e6c9a0', // Light gold
  '#bf8a5e', // Deep gold
];

/** Neutral white palette - subtle, ethereal */
export const PALETTE_WHITE = ['#ffffff', '#f8f8f8', '#f0f0f0', '#fafafa'];

/** Mixed harmony palette - balanced */
export const PALETTE_HARMONY = [...PALETTE_TEAL.slice(0, 3), ...PALETTE_GOLD.slice(0, 2)];

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_CONFIG: RibbonSystemConfig = {
  globeRadius: 1.5,
  surfaceOffset: 0.12,
  baseScrollSpeed: 0.0015,
  globeSyncSpeed: 0.0008,
  seed: null, // Truly random

  layers: [
    // Primary content: Top message
    {
      id: 'top-content',
      height: 0.38,
      baseTilt: -0.2,
      tiltVariance: { min: -0.06, max: 0.06 },
      scrollDirection: -1,
      purpose: 'top',
      enabled: true,
      zIndex: 10,
    },
    // Primary content: Bottom message
    {
      id: 'bottom-content',
      height: -0.38,
      baseTilt: 0.2,
      tiltVariance: { min: -0.06, max: 0.06 },
      scrollDirection: 1,
      purpose: 'bottom',
      enabled: true,
      zIndex: 10,
    },
    // Accent: Center decorative dots
    {
      id: 'center-accent',
      height: 0,
      baseTilt: 0.08,
      tiltVariance: { min: -0.02, max: 0.02 },
      scrollDirection: -1,
      purpose: 'decorative',
      enabled: true,
      zIndex: 5,
    },
    // Accent: Upper decorative (optional, disabled by default)
    {
      id: 'upper-accent',
      height: 0.65,
      baseTilt: -0.3,
      tiltVariance: { min: -0.05, max: 0.05 },
      scrollDirection: 1,
      purpose: 'decorative',
      enabled: false,
      zIndex: 3,
    },
    // Accent: Lower decorative (optional, disabled by default)
    {
      id: 'lower-accent',
      height: -0.65,
      baseTilt: 0.3,
      tiltVariance: { min: -0.05, max: 0.05 },
      scrollDirection: -1,
      purpose: 'decorative',
      enabled: false,
      zIndex: 3,
    },
  ],

  styles: {
    primary: {
      colors: PALETTE_TEAL,
      fontSize: { min: 0.088, max: 0.102 },
      opacity: { base: 0.88, breathMin: 0.35 },
      scrollSpeed: { min: 1.0, max: 1.4 },
      letterSpacing: 0.08,
      fontWeight: 600,
      glyphDetail: 5,
    },
    secondary: {
      colors: PALETTE_GOLD,
      fontSize: { min: 0.085, max: 0.098 },
      opacity: { base: 0.82, breathMin: 0.3 },
      scrollSpeed: { min: 0.7, max: 1.1 },
      letterSpacing: 0.08,
      fontWeight: 600,
      glyphDetail: 5,
    },
    accent: {
      colors: PALETTE_WHITE,
      fontSize: { min: 0.035, max: 0.045 },
      opacity: { base: 0.18, breathMin: 0.08 },
      scrollSpeed: { min: 0.4, max: 0.7 },
      letterSpacing: 0.15,
      fontWeight: 400,
      glyphDetail: 2,
    },
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/** Seeded random number generator (Mulberry32) */
export function createSeededRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get random value within range */
export function randomInRange(range: Range, random: () => number = Math.random): number {
  return range.min + random() * (range.max - range.min);
}

/** Pick random item from array */
export function randomPick<T>(array: T[], random: () => number = Math.random): T {
  return array[Math.floor(random() * array.length)];
}

/** Resolve a layer's runtime properties with randomization */
export interface ResolvedRibbon {
  layer: RibbonLayer;
  style: RibbonStyle;
  color: string;
  fontSize: number;
  scrollSpeedMultiplier: number;
  tiltOffset: number;
  radius: number;
}

/** Get style for a layer based on its purpose */
export function getStyleForLayer(layer: RibbonLayer, config: RibbonSystemConfig): RibbonStyle {
  switch (layer.purpose) {
    case 'top':
    case 'combined':
      return config.styles.primary;
    case 'bottom':
      return config.styles.secondary;
    case 'decorative':
      return config.styles.accent;
    default:
      return config.styles.primary;
  }
}

/** Resolve all randomized properties for a layer */
export function resolveRibbon(
  layer: RibbonLayer,
  config: RibbonSystemConfig,
  random: () => number = Math.random,
): ResolvedRibbon {
  const style = getStyleForLayer(layer, config);

  return {
    layer,
    style,
    color: randomPick(style.colors, random),
    fontSize: randomInRange(style.fontSize, random),
    scrollSpeedMultiplier: randomInRange(style.scrollSpeed, random),
    tiltOffset: randomInRange(layer.tiltVariance, random),
    radius: config.globeRadius + config.surfaceOffset,
  };
}

/** Resolve all enabled layers */
export function resolveAllRibbons(config: RibbonSystemConfig = DEFAULT_CONFIG): ResolvedRibbon[] {
  const random = config.seed !== null ? createSeededRandom(config.seed) : Math.random;

  return config.layers
    .filter((layer) => layer.enabled)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer) => resolveRibbon(layer, config, random));
}

// =============================================================================
// Decorative Text Generators
// =============================================================================

/** Generate decorative dot pattern */
export function generateDotPattern(length: number = 40): string {
  return Array(length).fill('·').join(' ');
}

/** Generate decorative star pattern */
export function generateStarPattern(length: number = 20): string {
  return Array(length).fill('✦').join('   ');
}

/** Generate decorative dash pattern */
export function generateDashPattern(length: number = 30): string {
  return Array(length).fill('—').join(' ');
}

// =============================================================================
// Preset Configurations
// =============================================================================

/** Minimal config - just the two content ribbons */
export const MINIMAL_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  layers: DEFAULT_CONFIG.layers.map((layer) => ({
    ...layer,
    enabled: layer.purpose === 'top' || layer.purpose === 'bottom',
  })),
};

/** Rich config - all layers enabled */
export const RICH_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  layers: DEFAULT_CONFIG.layers.map((layer) => ({
    ...layer,
    enabled: true,
  })),
};

/** Monochrome config - single color palette */
export const MONOCHROME_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  styles: {
    primary: { ...DEFAULT_CONFIG.styles.primary, colors: PALETTE_TEAL },
    secondary: { ...DEFAULT_CONFIG.styles.secondary, colors: PALETTE_TEAL },
    accent: { ...DEFAULT_CONFIG.styles.accent, colors: PALETTE_WHITE },
  },
};
