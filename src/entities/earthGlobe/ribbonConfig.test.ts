/**
 * Ribbon Configuration Tests
 *
 * Tests for the ribbon system configuration utilities including:
 * - Seeded random number generation (determinism)
 * - Message formatting
 * - Timeline event system
 * - Instance resolution
 */

import { describe, expect, it } from 'vitest';
import {
  applyTimelineEvents,
  createEvent,
  createIntroTimeline,
  createSeededRandom,
  DEFAULT_CONFIG,
  distributeAngular,
  formatMessage,
  LAYERED_CONFIG,
  type Message,
  MINIMAL_CONFIG,
  type RibbonSystemConfig,
  randomInRange,
  randomPick,
  resolveAllInstances,
  resolveZoneInstances,
  WELCOME_CONFIG,
  WELCOME_MESSAGES,
} from './ribbonConfig';

// =============================================================================
// Seeded Random Tests
// =============================================================================

describe('createSeededRandom', () => {
  it('produces deterministic output for same seed', () => {
    const rng1 = createSeededRandom(12345);
    const rng2 = createSeededRandom(12345);

    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());

    expect(values1).toEqual(values2);
  });

  it('produces different output for different seeds', () => {
    const rng1 = createSeededRandom(12345);
    const rng2 = createSeededRandom(54321);

    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());

    expect(values1).not.toEqual(values2);
  });

  it('produces values in [0, 1) range', () => {
    const rng = createSeededRandom(42);
    const values = Array.from({ length: 1000 }, () => rng());

    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('has reasonable distribution', () => {
    const rng = createSeededRandom(42);
    const values = Array.from({ length: 1000 }, () => rng());

    const mean = values.reduce((a, b) => a + b) / values.length;
    // Mean should be close to 0.5 for uniform distribution
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('randomInRange', () => {
  it('returns min when random returns 0', () => {
    const result = randomInRange({ min: 10, max: 20 }, () => 0);
    expect(result).toBe(10);
  });

  it('returns max when random returns 1', () => {
    // Note: random() should return [0, 1) but we test the edge case
    const result = randomInRange({ min: 10, max: 20 }, () => 1);
    expect(result).toBe(20);
  });

  it('returns midpoint when random returns 0.5', () => {
    const result = randomInRange({ min: 10, max: 20 }, () => 0.5);
    expect(result).toBe(15);
  });
});

describe('randomPick', () => {
  it('picks first element when random returns 0', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const result = randomPick(arr, () => 0);
    expect(result).toBe('a');
  });

  it('picks last element when random approaches 1', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const result = randomPick(arr, () => 0.99);
    expect(result).toBe('d');
  });
});

describe('distributeAngular', () => {
  it('distributes items evenly around circle', () => {
    // With no jitter
    const angles = distributeAngular(4, 0, () => 0.5);

    // Should be at 0, π/2, π, 3π/2
    expect(angles.length).toBe(4);
    expect(angles[0]).toBeCloseTo(0, 5);
    expect(angles[1]).toBeCloseTo(Math.PI / 2, 5);
    expect(angles[2]).toBeCloseTo(Math.PI, 5);
    expect(angles[3]).toBeCloseTo((3 * Math.PI) / 2, 5);
  });

  it('returns single angle for count of 1', () => {
    const angles = distributeAngular(1, 0.3, () => 0.5);
    expect(angles.length).toBe(1);
  });

  it('applies jitter correctly', () => {
    const noJitter = distributeAngular(4, 0, () => 0.5);
    const withJitter = distributeAngular(4, 0.5, () => 0.7);

    // With different random values and jitter, angles should differ
    expect(noJitter).not.toEqual(withJitter);
  });
});

describe('formatMessage', () => {
  it('formats two-line message with separator', () => {
    const msg: Message = { line1: 'Hello', line2: 'World' };
    const result = formatMessage(msg, ' · ');
    expect(result).toBe('Hello · World');
  });

  it('returns only line1 when line2 is undefined', () => {
    const msg: Message = { line1: 'Hello' };
    const result = formatMessage(msg, ' · ');
    expect(result).toBe('Hello');
  });

  it('returns only line1 when line2 is empty', () => {
    const msg: Message = { line1: 'Hello', line2: '' };
    const result = formatMessage(msg, ' · ');
    expect(result).toBe('Hello');
  });

  it('uses custom separator', () => {
    const msg: Message = { line1: 'Breathe', line2: 'Together' };
    const result = formatMessage(msg, '  ·  ');
    expect(result).toBe('Breathe  ·  Together');
  });
});

// =============================================================================
// Timeline Event Tests
// =============================================================================

describe('createEvent', () => {
  it('creates event with numeric timestamps', () => {
    const event = createEvent('test', 1000, 2000, {
      enable: ['zone-a'],
      disable: ['zone-b'],
    });

    expect(event.id).toBe('test');
    expect(event.startTime).toBe(1000);
    expect(event.endTime).toBe(2000);
    expect(event.enableZones).toEqual(['zone-a']);
    expect(event.disableZones).toEqual(['zone-b']);
  });

  it('converts Date objects to timestamps', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-01T01:00:00Z');

    const event = createEvent('test', start, end, {});

    expect(event.startTime).toBe(start.getTime());
    expect(event.endTime).toBe(end.getTime());
  });

  it('handles -1 for immediate/never', () => {
    const event = createEvent('test', -1, -1, {});

    expect(event.startTime).toBe(-1);
    expect(event.endTime).toBe(-1);
  });
});

describe('applyTimelineEvents', () => {
  const baseConfig: RibbonSystemConfig = {
    ...DEFAULT_CONFIG,
    zones: [
      { ...DEFAULT_CONFIG.zones[0], id: 'zone-a', enabled: false },
      { ...DEFAULT_CONFIG.zones[1], id: 'zone-b', enabled: true },
    ],
  };

  it('returns config unchanged when no timeline', () => {
    const result = applyTimelineEvents(baseConfig, 1000);
    expect(result).toEqual(baseConfig);
  });

  it('enables zones when event is active', () => {
    const config: RibbonSystemConfig = {
      ...baseConfig,
      timeline: [createEvent('test', 500, 1500, { enable: ['zone-a'] })],
    };

    const result = applyTimelineEvents(config, 1000);
    const zoneA = result.zones.find((z) => z.id === 'zone-a');

    expect(zoneA?.enabled).toBe(true);
  });

  it('disables zones when event is active', () => {
    const config: RibbonSystemConfig = {
      ...baseConfig,
      timeline: [createEvent('test', 500, 1500, { disable: ['zone-b'] })],
    };

    const result = applyTimelineEvents(config, 1000);
    const zoneB = result.zones.find((z) => z.id === 'zone-b');

    expect(zoneB?.enabled).toBe(false);
  });

  it('ignores events before start time', () => {
    const config: RibbonSystemConfig = {
      ...baseConfig,
      timeline: [createEvent('test', 2000, 3000, { enable: ['zone-a'] })],
    };

    const result = applyTimelineEvents(config, 1000);
    const zoneA = result.zones.find((z) => z.id === 'zone-a');

    expect(zoneA?.enabled).toBe(false); // Still disabled
  });

  it('ignores events after end time', () => {
    const config: RibbonSystemConfig = {
      ...baseConfig,
      timeline: [createEvent('test', 500, 900, { enable: ['zone-a'] })],
    };

    const result = applyTimelineEvents(config, 1000);
    const zoneA = result.zones.find((z) => z.id === 'zone-a');

    expect(zoneA?.enabled).toBe(false); // Still disabled
  });

  it('handles -1 start time as immediate', () => {
    const config: RibbonSystemConfig = {
      ...baseConfig,
      timeline: [createEvent('test', -1, 2000, { enable: ['zone-a'] })],
    };

    const result = applyTimelineEvents(config, 1000);
    const zoneA = result.zones.find((z) => z.id === 'zone-a');

    expect(zoneA?.enabled).toBe(true);
  });

  it('handles -1 end time as never ending', () => {
    const config: RibbonSystemConfig = {
      ...baseConfig,
      timeline: [createEvent('test', 500, -1, { enable: ['zone-a'] })],
    };

    const result = applyTimelineEvents(config, 999999999);
    const zoneA = result.zones.find((z) => z.id === 'zone-a');

    expect(zoneA?.enabled).toBe(true);
  });
});

describe('createIntroTimeline', () => {
  it('creates two events for intro sequence', () => {
    const timeline = createIntroTimeline(5000);

    expect(timeline.length).toBe(2);
    expect(timeline[0].id).toBe('intro-welcome');
    expect(timeline[1].id).toBe('main-experience');
  });

  it('welcome event enables welcome-outer and disables inspiration', () => {
    const timeline = createIntroTimeline(5000);
    const welcomeEvent = timeline[0];

    expect(welcomeEvent.enableZones).toContain('welcome-outer');
    expect(welcomeEvent.disableZones).toContain('inspiration-main');
    expect(welcomeEvent.disableZones).toContain('inspiration-lower');
  });

  it('main event enables inspiration and disables welcome', () => {
    const timeline = createIntroTimeline(5000);
    const mainEvent = timeline[1];

    expect(mainEvent.enableZones).toContain('inspiration-main');
    expect(mainEvent.enableZones).toContain('inspiration-lower');
    expect(mainEvent.disableZones).toContain('welcome-outer');
  });
});

// =============================================================================
// Instance Resolution Tests
// =============================================================================

describe('resolveZoneInstances', () => {
  it('creates correct number of instances', () => {
    const zone = { ...DEFAULT_CONFIG.zones[0], instanceCount: 3 };
    const instances = resolveZoneInstances(zone, DEFAULT_CONFIG);

    expect(instances.length).toBe(3);
  });

  it('assigns correct zone to each instance', () => {
    const zone = DEFAULT_CONFIG.zones[0];
    const instances = resolveZoneInstances(zone, DEFAULT_CONFIG);

    for (const inst of instances) {
      expect(inst.zone).toBe(zone);
    }
  });

  it('calculates radius correctly', () => {
    const zone = { ...DEFAULT_CONFIG.zones[0], radiusOffset: 0.5 };
    const instances = resolveZoneInstances(zone, DEFAULT_CONFIG);

    const expectedRadius = DEFAULT_CONFIG.globeRadius + DEFAULT_CONFIG.surfaceOffset + 0.5;
    expect(instances[0].radius).toBeCloseTo(expectedRadius, 5);
  });

  it('uses seeded random for deterministic output', () => {
    const zone = DEFAULT_CONFIG.zones[0];

    const instances1 = resolveZoneInstances(zone, DEFAULT_CONFIG, createSeededRandom(42));
    const instances2 = resolveZoneInstances(zone, DEFAULT_CONFIG, createSeededRandom(42));

    expect(instances1[0].color).toBe(instances2[0].color);
    expect(instances1[0].fontSize).toBe(instances2[0].fontSize);
  });
});

describe('resolveAllInstances', () => {
  it('only includes enabled zones', () => {
    const instances = resolveAllInstances(DEFAULT_CONFIG);
    const zoneIds = new Set(instances.map((i) => i.zone.id));

    // welcome-outer is disabled by default
    expect(zoneIds.has('welcome-outer')).toBe(false);
    // inspiration zones are enabled
    expect(zoneIds.has('inspiration-main')).toBe(true);
  });

  it('uses seed when provided', () => {
    const config1 = { ...DEFAULT_CONFIG, seed: 42 };
    const config2 = { ...DEFAULT_CONFIG, seed: 42 };

    const instances1 = resolveAllInstances(config1);
    const instances2 = resolveAllInstances(config2);

    expect(instances1[0].color).toBe(instances2[0].color);
  });

  it('produces different results with different seeds', () => {
    const config1 = { ...DEFAULT_CONFIG, seed: 42 };
    const config2 = { ...DEFAULT_CONFIG, seed: 99 };

    const instances1 = resolveAllInstances(config1);
    const instances2 = resolveAllInstances(config2);

    // At least some values should differ
    const colors1 = instances1.map((i) => i.color);
    const colors2 = instances2.map((i) => i.color);
    expect(colors1).not.toEqual(colors2);
  });
});

// =============================================================================
// Preset Configuration Tests
// =============================================================================

describe('Preset Configurations', () => {
  it('MINIMAL_CONFIG only enables inspiration zones', () => {
    const instances = resolveAllInstances(MINIMAL_CONFIG);
    const sources = new Set(instances.map((i) => i.zone.source));

    expect(sources.has('inspiration')).toBe(true);
    expect(sources.has('decorative')).toBe(false);
    expect(sources.has('welcome')).toBe(false);
  });

  it('WELCOME_CONFIG enables welcome and decorative zones', () => {
    const instances = resolveAllInstances(WELCOME_CONFIG);
    const sources = new Set(instances.map((i) => i.zone.source));

    expect(sources.has('welcome')).toBe(true);
    expect(sources.has('decorative')).toBe(true);
    expect(sources.has('inspiration')).toBe(false);
  });

  it('LAYERED_CONFIG enables all zones', () => {
    const instances = resolveAllInstances(LAYERED_CONFIG);
    const zoneCount = LAYERED_CONFIG.zones.length;

    // Should have at least one instance per zone
    const zoneIds = new Set(instances.map((i) => i.zone.id));
    expect(zoneIds.size).toBe(zoneCount);
  });
});

// =============================================================================
// Welcome Messages Tests
// =============================================================================

describe('WELCOME_MESSAGES', () => {
  it('contains messages for multiple languages', () => {
    expect(WELCOME_MESSAGES.length).toBeGreaterThan(5);
  });

  it('all messages have line1 and line2', () => {
    for (const msg of WELCOME_MESSAGES) {
      expect(msg.line1).toBeTruthy();
      expect(msg.line2).toBeTruthy();
    }
  });

  it('all messages have language code', () => {
    for (const msg of WELCOME_MESSAGES) {
      expect(msg.language).toBeTruthy();
    }
  });

  it('includes English as first language', () => {
    expect(WELCOME_MESSAGES[0].language).toBe('en');
  });
});
