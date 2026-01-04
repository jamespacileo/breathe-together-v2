/**
 * Ribbon System Configuration v2 - Message Pool Architecture
 *
 * Data-driven configuration for the globe ribbon text system.
 *
 * ARCHITECTURE:
 * - Zones: Vertical bands where messages can appear (guarantees no overlap)
 * - Pools: Message sources (inspiration, welcome, decorative)
 * - Instances: Individual placements of complete messages within zones
 *
 * KEY CONCEPT: A "message instance" is a complete message (both lines together)
 * placed at a random angular position within its zone. Multiple instances of
 * the same or different messages can coexist.
 */

// =============================================================================
// Types
// =============================================================================

/** Numeric range for randomization */
export interface Range {
  min: number;
  max: number;
}

/** A complete message with two lines */
export interface Message {
  line1: string;
  line2: string;
  /** Optional language code for multi-language support */
  language?: string;
}

/** Message source type */
export type MessageSource =
  | 'inspiration' // Current inspirational message from hook
  | 'welcome' // Multi-language welcome messages
  | 'decorative' // Decorative patterns
  | 'custom'; // Custom messages passed via props

/** A zone defines a vertical band where message instances can appear */
export interface MessageZone {
  /** Unique identifier */
  id: string;
  /** Vertical height range (0 = equator, -1/+1 = poles) */
  heightRange: Range;
  /** Number of message instances in this zone */
  instanceCount: number;
  /** Message source for this zone */
  source: MessageSource;
  /** Visual style key */
  styleKey: 'primary' | 'secondary' | 'accent';
  /** Scroll direction: 1 = with globe, -1 = against */
  scrollDirection: 1 | -1;
  /** Base tilt angle in radians */
  baseTilt: number;
  /** Tilt variance range */
  tiltVariance: Range;
  /** Whether this zone is enabled */
  enabled: boolean;
  /** Render priority (higher = on top) */
  zIndex: number;
  /** Vertical spacing between line1 and line2 */
  lineSpacing: number;
}

/** Visual style with randomization ranges */
export interface RibbonStyle {
  /** Color palette (random selection per instance) */
  colors: string[];
  /** Font size range */
  fontSize: Range;
  /** Opacity settings */
  opacity: {
    base: number;
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
  /** Globe radius */
  globeRadius: number;
  /** Offset from globe surface */
  surfaceOffset: number;
  /** Base scroll speed */
  baseScrollSpeed: number;
  /** Globe rotation sync speed */
  globeSyncSpeed: number;
  /** Zone definitions */
  zones: MessageZone[];
  /** Style definitions */
  styles: {
    primary: RibbonStyle;
    secondary: RibbonStyle;
    accent: RibbonStyle;
  };
  /** Random seed (null = truly random) */
  seed: number | null;
}

/** Resolved instance ready for rendering */
export interface ResolvedInstance {
  /** Zone this instance belongs to */
  zone: MessageZone;
  /** Instance index within zone */
  instanceIndex: number;
  /** Angular position around globe (0-2π) */
  angularPosition: number;
  /** Height within zone */
  height: number;
  /** Final tilt (baseTilt + random variance) */
  tilt: number;
  /** Resolved color from palette */
  color: string;
  /** Resolved font size */
  fontSize: number;
  /** Scroll speed multiplier */
  scrollSpeedMultiplier: number;
  /** Computed radius from globe center */
  radius: number;
  /** Style reference */
  style: RibbonStyle;
}

// =============================================================================
// Color Palettes
// =============================================================================

/** Teal/cyan palette - calming, oceanic */
export const PALETTE_TEAL = ['#7ec8c8', '#5eb3b2', '#4aa3a3', '#6bc4c4', '#8dd3d3'];

/** Warm gold palette - comforting, sunrise */
export const PALETTE_GOLD = ['#d4a574', '#c9956a', '#deb887', '#e6c9a0', '#bf8a5e'];

/** Neutral white palette - subtle, ethereal */
export const PALETTE_WHITE = ['#ffffff', '#f8f8f8', '#f0f0f0', '#fafafa'];

/** Mixed harmony palette */
export const PALETTE_HARMONY = [...PALETTE_TEAL.slice(0, 3), ...PALETTE_GOLD.slice(0, 2)];

// =============================================================================
// Welcome Messages (Multi-Language)
// =============================================================================

export const WELCOME_MESSAGES: Message[] = [
  { line1: 'Welcome', line2: 'Breathe together', language: 'en' },
  { line1: 'Bienvenue', line2: 'Respirons ensemble', language: 'fr' },
  { line1: 'Willkommen', line2: 'Gemeinsam atmen', language: 'de' },
  { line1: 'Benvenuto', line2: 'Respiriamo insieme', language: 'it' },
  { line1: 'Bienvenido', line2: 'Respiremos juntos', language: 'es' },
  { line1: 'Bem-vindo', line2: 'Respirar juntos', language: 'pt' },
  { line1: 'ようこそ', line2: '一緒に呼吸しよう', language: 'ja' },
  { line1: '환영합니다', line2: '함께 호흡해요', language: 'ko' },
  { line1: '欢迎', line2: '一起呼吸', language: 'zh' },
  { line1: 'Добро пожаловать', line2: 'Дышим вместе', language: 'ru' },
  { line1: 'مرحبا', line2: 'نتنفس معا', language: 'ar' },
  { line1: 'स्वागत है', line2: 'साथ में साँस लें', language: 'hi' },
];

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_CONFIG: RibbonSystemConfig = {
  globeRadius: 1.5,
  surfaceOffset: 0.12,
  baseScrollSpeed: 0.0012,
  globeSyncSpeed: 0.0008,
  seed: null,

  zones: [
    // Primary zone: Inspiration messages (duplicated for visibility)
    {
      id: 'inspiration-upper',
      heightRange: { min: 0.25, max: 0.45 },
      instanceCount: 3,
      source: 'inspiration',
      styleKey: 'primary',
      scrollDirection: -1,
      baseTilt: -0.15,
      tiltVariance: { min: -0.08, max: 0.08 },
      enabled: true,
      zIndex: 10,
      lineSpacing: 0.18,
    },
    // Mirror zone: Same inspiration (bottom of globe)
    {
      id: 'inspiration-lower',
      heightRange: { min: -0.45, max: -0.25 },
      instanceCount: 3,
      source: 'inspiration',
      styleKey: 'secondary',
      scrollDirection: 1,
      baseTilt: 0.15,
      tiltVariance: { min: -0.08, max: 0.08 },
      enabled: true,
      zIndex: 10,
      lineSpacing: 0.18,
    },
    // Equator zone: Multi-language welcome (optional)
    {
      id: 'welcome-equator',
      heightRange: { min: -0.12, max: 0.12 },
      instanceCount: 4,
      source: 'welcome',
      styleKey: 'primary',
      scrollDirection: -1,
      baseTilt: 0.05,
      tiltVariance: { min: -0.03, max: 0.03 },
      enabled: false, // Disabled by default, enable for intro
      zIndex: 8,
      lineSpacing: 0.15,
    },
    // Decorative accent (center)
    {
      id: 'decorative-center',
      heightRange: { min: -0.05, max: 0.05 },
      instanceCount: 1,
      source: 'decorative',
      styleKey: 'accent',
      scrollDirection: -1,
      baseTilt: 0.08,
      tiltVariance: { min: -0.02, max: 0.02 },
      enabled: true,
      zIndex: 5,
      lineSpacing: 0.1,
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

/** Distribute N items evenly around a circle with random jitter */
export function distributeAngular(
  count: number,
  jitterRange: number = 0.3,
  random: () => number = Math.random,
): number[] {
  const baseStep = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const base = i * baseStep;
    const jitter = (random() - 0.5) * baseStep * jitterRange;
    return (base + jitter + Math.PI * 2) % (Math.PI * 2);
  });
}

/** Get style by key */
export function getStyleByKey(
  key: 'primary' | 'secondary' | 'accent',
  config: RibbonSystemConfig,
): RibbonStyle {
  return config.styles[key];
}

/** Resolve all instances for a zone */
export function resolveZoneInstances(
  zone: MessageZone,
  config: RibbonSystemConfig,
  random: () => number = Math.random,
): ResolvedInstance[] {
  const style = getStyleByKey(zone.styleKey, config);
  const angles = distributeAngular(zone.instanceCount, 0.4, random);

  return angles.map((angularPosition, instanceIndex) => ({
    zone,
    instanceIndex,
    angularPosition,
    height: randomInRange(zone.heightRange, random),
    tilt: zone.baseTilt + randomInRange(zone.tiltVariance, random),
    color: randomPick(style.colors, random),
    fontSize: randomInRange(style.fontSize, random),
    scrollSpeedMultiplier: randomInRange(style.scrollSpeed, random),
    radius: config.globeRadius + config.surfaceOffset,
    style,
  }));
}

/** Resolve all enabled zones and their instances */
export function resolveAllInstances(
  config: RibbonSystemConfig = DEFAULT_CONFIG,
): ResolvedInstance[] {
  const random = config.seed !== null ? createSeededRandom(config.seed) : Math.random;

  return config.zones
    .filter((zone) => zone.enabled)
    .sort((a, b) => a.zIndex - b.zIndex)
    .flatMap((zone) => resolveZoneInstances(zone, config, random));
}

// =============================================================================
// Decorative Patterns
// =============================================================================

/** Generate decorative dot pattern */
export function generateDotPattern(length: number = 40): string {
  return Array(length).fill('·').join(' ');
}

/** Generate decorative star pattern */
export function generateStarPattern(length: number = 20): string {
  return Array(length).fill('✦').join('   ');
}

// =============================================================================
// Preset Configurations
// =============================================================================

/** Minimal: Just inspiration zones */
export const MINIMAL_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  zones: DEFAULT_CONFIG.zones.map((zone) => ({
    ...zone,
    enabled: zone.source === 'inspiration',
  })),
};

/** Welcome mode: Show multi-language welcome + decorative */
export const WELCOME_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  zones: DEFAULT_CONFIG.zones.map((zone) => ({
    ...zone,
    enabled: zone.source === 'welcome' || zone.source === 'decorative',
    instanceCount: zone.source === 'welcome' ? 6 : zone.instanceCount,
  })),
};

/** Rich: All zones enabled with more instances */
export const RICH_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  zones: DEFAULT_CONFIG.zones.map((zone) => ({
    ...zone,
    enabled: true,
    instanceCount: zone.source === 'inspiration' ? 4 : zone.instanceCount,
  })),
};

// =============================================================================
// Legacy Compatibility (deprecated, use new types)
// =============================================================================

/** @deprecated Use MessageZone instead */
export type RibbonLayer = MessageZone;

/** @deprecated Use ResolvedInstance instead */
export interface ResolvedRibbon extends ResolvedInstance {
  layer: MessageZone;
}

/** @deprecated Use resolveAllInstances instead */
export function resolveAllRibbons(config: RibbonSystemConfig = DEFAULT_CONFIG): ResolvedRibbon[] {
  return resolveAllInstances(config).map((instance) => ({
    ...instance,
    layer: instance.zone,
  }));
}
