/**
 * Ribbon System Configuration v3 - Timeline Event Architecture
 *
 * ARCHITECTURE:
 * - Ribbons: Horizontal bands parallel to equator at various heights and radii
 * - Layers: Multiple radii create 3D depth (inner/outer shells)
 * - Timeline: UTC-based event system for programmatic ribbon changes
 *
 * KEY CONCEPTS:
 * - Single-line messages (line1 · line2) for cleaner readability
 * - Height range constrained to avoid pole distortion
 * - Radius layers create parallax/depth effect
 * - Events can enable/disable zones at specific UTC times
 */

// =============================================================================
// Types
// =============================================================================

/** Numeric range for randomization */
export interface Range {
  min: number;
  max: number;
}

/** A complete message (rendered as single line with separator) */
export interface Message {
  line1: string;
  line2?: string;
  language?: string;
}

/** Message source type */
export type MessageSource = 'inspiration' | 'welcome' | 'decorative' | 'custom';

/**
 * Ribbon zone - horizontal band at specific height and radius
 * All ribbons are parallel to equator (no tilt) for clean visuals
 */
export interface RibbonZone {
  id: string;
  /** Height on globe (-0.7 to 0.7 safe range, avoids pole distortion) */
  height: number;
  /** Height variance for organic feel */
  heightVariance: Range;
  /** Radius layer (0 = globe surface, positive = outer shells) */
  radiusOffset: number;
  /** Number of message instances around the band */
  instanceCount: number;
  /** Message source */
  source: MessageSource;
  /** Visual style */
  styleKey: 'primary' | 'secondary' | 'accent';
  /** Scroll direction: 1 = east, -1 = west */
  scrollDirection: 1 | -1;
  /** Whether enabled */
  enabled: boolean;
  /** Render priority */
  zIndex: number;
}

/** Visual style */
export interface RibbonStyle {
  colors: string[];
  fontSize: Range;
  opacity: { base: number; breathMin: number };
  scrollSpeed: Range;
  letterSpacing: number;
  fontWeight: number;
  glyphDetail: number;
}

/** Timeline event - triggers at specific UTC time */
export interface TimelineEvent {
  /** Event ID */
  id: string;
  /** UTC timestamp (ms) when event activates (-1 = immediate) */
  startTime: number;
  /** UTC timestamp (ms) when event deactivates (-1 = never) */
  endTime: number;
  /** Zone overrides to apply */
  zoneOverrides: Partial<Record<string, Partial<RibbonZone>>>;
  /** Zones to enable */
  enableZones?: string[];
  /** Zones to disable */
  disableZones?: string[];
}

/** Complete configuration */
export interface RibbonSystemConfig {
  globeRadius: number;
  surfaceOffset: number;
  baseScrollSpeed: number;
  globeSyncSpeed: number;
  /** Message separator for single-line display */
  messageSeparator: string;
  zones: RibbonZone[];
  styles: {
    primary: RibbonStyle;
    secondary: RibbonStyle;
    accent: RibbonStyle;
  };
  /** Timeline events (optional) */
  timeline?: TimelineEvent[];
  seed: number | null;
}

/** Resolved instance ready for rendering */
export interface ResolvedInstance {
  zone: RibbonZone;
  instanceIndex: number;
  angularPosition: number;
  height: number;
  radius: number;
  color: string;
  fontSize: number;
  scrollSpeedMultiplier: number;
  style: RibbonStyle;
}

// =============================================================================
// Color Palettes
// =============================================================================

export const PALETTE_TEAL = ['#7ec8c8', '#5eb3b2', '#4aa3a3', '#6bc4c4', '#8dd3d3'];
export const PALETTE_GOLD = ['#d4a574', '#c9956a', '#deb887', '#e6c9a0', '#bf8a5e'];
export const PALETTE_WHITE = ['#ffffff', '#f8f8f8', '#f0f0f0', '#fafafa'];
export const PALETTE_SOFT = ['#e8e4e0', '#d4d0cc', '#c8c4c0', '#dcd8d4'];

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
  { line1: 'ようこそ', line2: '一緒に呼吸', language: 'ja' },
  { line1: '환영합니다', line2: '함께 호흡', language: 'ko' },
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
  surfaceOffset: 0.08,
  baseScrollSpeed: 0.001,
  globeSyncSpeed: 0.0008,
  messageSeparator: '  ·  ',
  seed: null,

  zones: [
    // === INSPIRATION LAYER (Primary - on surface) ===
    {
      id: 'inspiration-main',
      height: 0.35,
      heightVariance: { min: -0.05, max: 0.05 },
      radiusOffset: 0,
      instanceCount: 3,
      source: 'inspiration',
      styleKey: 'primary',
      scrollDirection: -1,
      enabled: true,
      zIndex: 10,
    },
    {
      id: 'inspiration-lower',
      height: -0.35,
      heightVariance: { min: -0.05, max: 0.05 },
      radiusOffset: 0,
      instanceCount: 3,
      source: 'inspiration',
      styleKey: 'secondary',
      scrollDirection: 1,
      enabled: true,
      zIndex: 10,
    },

    // === WELCOME LAYER (Outer shell - creates depth) ===
    {
      id: 'welcome-outer',
      height: 0,
      heightVariance: { min: -0.08, max: 0.08 },
      radiusOffset: 0.25, // Outer shell!
      instanceCount: 6,
      source: 'welcome',
      styleKey: 'accent',
      scrollDirection: 1,
      enabled: false, // Enable for intro sequence
      zIndex: 5,
    },

    // === AMBIENT LAYER (Inner whisper - subtle depth) ===
    {
      id: 'ambient-inner',
      height: 0.55,
      heightVariance: { min: -0.03, max: 0.03 },
      radiusOffset: -0.05, // Slightly inside
      instanceCount: 2,
      source: 'decorative',
      styleKey: 'accent',
      scrollDirection: -1,
      enabled: true,
      zIndex: 3,
    },
  ],

  styles: {
    primary: {
      colors: PALETTE_TEAL,
      fontSize: { min: 0.075, max: 0.088 },
      opacity: { base: 0.85, breathMin: 0.35 },
      scrollSpeed: { min: 0.8, max: 1.2 },
      letterSpacing: 0.06,
      fontWeight: 500,
      glyphDetail: 4,
    },
    secondary: {
      colors: PALETTE_GOLD,
      fontSize: { min: 0.072, max: 0.085 },
      opacity: { base: 0.75, breathMin: 0.3 },
      scrollSpeed: { min: 0.6, max: 1.0 },
      letterSpacing: 0.06,
      fontWeight: 500,
      glyphDetail: 4,
    },
    accent: {
      colors: PALETTE_SOFT,
      fontSize: { min: 0.055, max: 0.068 },
      opacity: { base: 0.45, breathMin: 0.15 },
      scrollSpeed: { min: 0.3, max: 0.6 },
      letterSpacing: 0.08,
      fontWeight: 400,
      glyphDetail: 3,
    },
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/** Seeded random (Mulberry32) */
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

export function randomInRange(range: Range, random: () => number = Math.random): number {
  return range.min + random() * (range.max - range.min);
}

export function randomPick<T>(array: T[], random: () => number = Math.random): T {
  return array[Math.floor(random() * array.length)];
}

/** Distribute N items evenly with jitter */
export function distributeAngular(count: number, jitter = 0.3, random = Math.random): number[] {
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const base = i * step;
    const offset = (random() - 0.5) * step * jitter;
    return (base + offset + Math.PI * 2) % (Math.PI * 2);
  });
}

/** Format message as single line */
export function formatMessage(msg: Message, separator: string): string {
  if (!msg.line2) return msg.line1;
  return `${msg.line1}${separator}${msg.line2}`;
}

/** Apply timeline events to config based on current UTC time */
export function applyTimelineEvents(
  config: RibbonSystemConfig,
  utcNow: number = Date.now(),
): RibbonSystemConfig {
  if (!config.timeline?.length) return config;

  let zones = [...config.zones];

  for (const event of config.timeline) {
    const isActive =
      (event.startTime === -1 || utcNow >= event.startTime) &&
      (event.endTime === -1 || utcNow < event.endTime);

    if (!isActive) continue;

    // Apply enable/disable
    if (event.enableZones) {
      const enableList = event.enableZones;
      zones = zones.map((z) => (enableList.includes(z.id) ? { ...z, enabled: true } : z));
    }
    if (event.disableZones) {
      const disableList = event.disableZones;
      zones = zones.map((z) => (disableList.includes(z.id) ? { ...z, enabled: false } : z));
    }

    // Apply overrides
    for (const [zoneId, overrides] of Object.entries(event.zoneOverrides)) {
      zones = zones.map((z) => (z.id === zoneId ? { ...z, ...overrides } : z));
    }
  }

  return { ...config, zones };
}

/** Resolve all instances for a zone */
export function resolveZoneInstances(
  zone: RibbonZone,
  config: RibbonSystemConfig,
  random: () => number = Math.random,
): ResolvedInstance[] {
  const style = config.styles[zone.styleKey];
  const angles = distributeAngular(zone.instanceCount, 0.4, random);

  return angles.map((angularPosition, instanceIndex) => ({
    zone,
    instanceIndex,
    angularPosition,
    height: zone.height + randomInRange(zone.heightVariance, random),
    radius: config.globeRadius + config.surfaceOffset + zone.radiusOffset,
    color: randomPick(style.colors, random),
    fontSize: randomInRange(style.fontSize, random),
    scrollSpeedMultiplier: randomInRange(style.scrollSpeed, random),
    style,
  }));
}

/** Resolve all enabled zones */
export function resolveAllInstances(config: RibbonSystemConfig): ResolvedInstance[] {
  const random = config.seed !== null ? createSeededRandom(config.seed) : Math.random;
  const activeConfig = applyTimelineEvents(config);

  return activeConfig.zones
    .filter((z) => z.enabled)
    .sort((a, b) => a.zIndex - b.zIndex)
    .flatMap((zone) => resolveZoneInstances(zone, activeConfig, random));
}

// =============================================================================
// Decorative Patterns
// =============================================================================

export function generateDotPattern(length = 40): string {
  return Array(length).fill('·').join(' ');
}

export function generateWavePattern(length = 25): string {
  return Array(length).fill('~').join(' ');
}

// =============================================================================
// Preset Configurations
// =============================================================================

/** Minimal - just inspiration */
export const MINIMAL_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  zones: DEFAULT_CONFIG.zones.map((z) => ({
    ...z,
    enabled: z.source === 'inspiration',
  })),
};

/** Welcome intro - multi-language welcome in outer shell */
export const WELCOME_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  zones: DEFAULT_CONFIG.zones.map((z) => ({
    ...z,
    enabled: z.source === 'welcome' || z.source === 'decorative',
  })),
};

/** Layered - all zones for full 3D depth effect */
export const LAYERED_CONFIG: RibbonSystemConfig = {
  ...DEFAULT_CONFIG,
  zones: DEFAULT_CONFIG.zones.map((z) => ({ ...z, enabled: true })),
};

// =============================================================================
// Timeline Event Helpers
// =============================================================================

/**
 * Create a timeline event
 * @param id Event identifier
 * @param start Start time (Date, timestamp, or -1 for immediate)
 * @param end End time (Date, timestamp, or -1 for never)
 * @param changes Zone changes to apply
 */
export function createEvent(
  id: string,
  start: Date | number,
  end: Date | number,
  changes: {
    enable?: string[];
    disable?: string[];
    overrides?: Partial<Record<string, Partial<RibbonZone>>>;
  },
): TimelineEvent {
  return {
    id,
    startTime: start instanceof Date ? start.getTime() : start,
    endTime: end instanceof Date ? end.getTime() : end,
    enableZones: changes.enable,
    disableZones: changes.disable,
    zoneOverrides: changes.overrides || {},
  };
}

/**
 * Create intro sequence: Welcome for N seconds, then fade to inspiration
 */
export function createIntroTimeline(welcomeDurationMs = 8000): TimelineEvent[] {
  const now = Date.now();
  return [
    createEvent('intro-welcome', -1, now + welcomeDurationMs, {
      enable: ['welcome-outer'],
      disable: ['inspiration-main', 'inspiration-lower'],
    }),
    createEvent('main-experience', now + welcomeDurationMs, -1, {
      enable: ['inspiration-main', 'inspiration-lower'],
      disable: ['welcome-outer'],
    }),
  ];
}

/**
 * Create breathing cycle event (activates at specific phase)
 * @param phase 0=inhale, 1=hold, 2=exhale, 3=rest
 */
export function createBreathPhaseEvent(
  id: string,
  phase: 0 | 1 | 2 | 3,
  changes: Parameters<typeof createEvent>[3],
): TimelineEvent {
  // Phase durations: inhale=4s, hold=7s, exhale=8s, rest=0s (total=19s)
  const CYCLE_MS = 19000;
  const phaseStarts = [0, 4000, 11000, 19000];

  const now = Date.now();
  const cyclePosition = now % CYCLE_MS;
  const phaseStart = phaseStarts[phase];
  const phaseEnd = phaseStarts[phase + 1] || CYCLE_MS;

  // Calculate next occurrence of this phase
  let nextStart = now - cyclePosition + phaseStart;
  if (nextStart < now) nextStart += CYCLE_MS;

  return createEvent(id, nextStart, nextStart + (phaseEnd - phaseStart), changes);
}
