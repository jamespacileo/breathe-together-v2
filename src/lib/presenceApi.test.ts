/**
 * Tests for Presence API client and Zod schemas
 */

import { describe, expect, it } from 'vitest';
import {
  HeartbeatRequestSchema,
  MoodIdSchema,
  PresenceStateSchema,
  ServerConfigSchema,
  validateMood,
  WsPresenceMessageSchema,
} from './presenceApi';

describe('presenceApi', () => {
  describe('MoodIdSchema', () => {
    it('accepts valid mood IDs', () => {
      expect(MoodIdSchema.parse('gratitude')).toBe('gratitude');
      expect(MoodIdSchema.parse('presence')).toBe('presence');
      expect(MoodIdSchema.parse('release')).toBe('release');
      expect(MoodIdSchema.parse('connection')).toBe('connection');
    });

    it('rejects invalid mood IDs', () => {
      expect(() => MoodIdSchema.parse('invalid')).toThrow();
      expect(() => MoodIdSchema.parse('')).toThrow();
      expect(() => MoodIdSchema.parse(123)).toThrow();
      expect(() => MoodIdSchema.parse(null)).toThrow();
    });
  });

  describe('validateMood', () => {
    it('returns valid moods unchanged', () => {
      expect(validateMood('gratitude')).toBe('gratitude');
      expect(validateMood('presence')).toBe('presence');
      expect(validateMood('release')).toBe('release');
      expect(validateMood('connection')).toBe('connection');
    });

    it('returns "presence" for invalid inputs', () => {
      expect(validateMood('invalid')).toBe('presence');
      expect(validateMood(null)).toBe('presence');
      expect(validateMood(undefined)).toBe('presence');
      expect(validateMood(123)).toBe('presence');
      expect(validateMood({})).toBe('presence');
    });
  });

  describe('PresenceStateSchema', () => {
    it('accepts valid presence state', () => {
      const valid = {
        count: 100,
        moods: { gratitude: 25, presence: 35, release: 25, connection: 15 },
        users: [{ id: 'user-1', mood: 'gratitude' as const }],
        countryCounts: { US: 50, GB: 30, DE: 20 },
        timestamp: Date.now(),
      };
      expect(PresenceStateSchema.parse(valid)).toEqual(valid);
    });

    it('rejects invalid presence state', () => {
      // Missing count
      expect(() =>
        PresenceStateSchema.parse({
          moods: { gratitude: 25, presence: 35, release: 25, connection: 15 },
          timestamp: Date.now(),
        }),
      ).toThrow();

      // Missing mood
      expect(() =>
        PresenceStateSchema.parse({
          count: 100,
          moods: { gratitude: 25, presence: 35, release: 25 },
          timestamp: Date.now(),
        }),
      ).toThrow();

      // Wrong type
      expect(() =>
        PresenceStateSchema.parse({
          count: 'not a number',
          moods: { gratitude: 25, presence: 35, release: 25, connection: 15 },
          timestamp: Date.now(),
        }),
      ).toThrow();
    });
  });

  describe('ServerConfigSchema', () => {
    it('accepts valid config', () => {
      const valid = {
        sampleRate: 0.03,
        heartbeatIntervalMs: 30000,
        supportsWebSocket: true,
        version: 2,
      };
      expect(ServerConfigSchema.parse(valid)).toEqual(valid);
    });

    it('validates sampleRate range', () => {
      // Below 0
      expect(() =>
        ServerConfigSchema.parse({
          sampleRate: -0.1,
          heartbeatIntervalMs: 30000,
          supportsWebSocket: true,
          version: 2,
        }),
      ).toThrow();

      // Above 1
      expect(() =>
        ServerConfigSchema.parse({
          sampleRate: 1.5,
          heartbeatIntervalMs: 30000,
          supportsWebSocket: true,
          version: 2,
        }),
      ).toThrow();
    });

    it('validates heartbeatIntervalMs is positive', () => {
      expect(() =>
        ServerConfigSchema.parse({
          sampleRate: 0.03,
          heartbeatIntervalMs: 0,
          supportsWebSocket: true,
          version: 2,
        }),
      ).toThrow();
    });
  });

  describe('HeartbeatRequestSchema', () => {
    it('accepts valid heartbeat request', () => {
      const valid = { sessionId: '12345678-uuid-here', mood: 'gratitude' };
      const result = HeartbeatRequestSchema.parse(valid);
      expect(result.sessionId).toBe('12345678-uuid-here');
      expect(result.mood).toBe('gratitude');
    });

    it('accepts request without mood (optional)', () => {
      const valid = { sessionId: '12345678-uuid-here' };
      const result = HeartbeatRequestSchema.parse(valid);
      expect(result.sessionId).toBe('12345678-uuid-here');
      expect(result.mood).toBeUndefined();
    });

    it('rejects short session ID', () => {
      expect(() => HeartbeatRequestSchema.parse({ sessionId: 'short' })).toThrow();
      expect(() => HeartbeatRequestSchema.parse({ sessionId: '' })).toThrow();
    });

    it('rejects invalid mood', () => {
      expect(() =>
        HeartbeatRequestSchema.parse({ sessionId: '12345678', mood: 'invalid' }),
      ).toThrow();
    });
  });

  describe('WsPresenceMessageSchema', () => {
    it('accepts valid WebSocket message', () => {
      const valid = {
        type: 'presence',
        count: 100,
        moods: { gratitude: 25, presence: 35, release: 25, connection: 15 },
        users: [{ id: 'user-1', mood: 'gratitude' as const }],
        countryCounts: { US: 50, GB: 30, DE: 20 },
        timestamp: Date.now(),
      };
      expect(WsPresenceMessageSchema.parse(valid)).toEqual(valid);
    });

    it('accepts message without type field', () => {
      const valid = {
        count: 100,
        moods: { gratitude: 25, presence: 35, release: 25, connection: 15 },
        users: [],
        countryCounts: {},
        timestamp: Date.now(),
      };
      const result = WsPresenceMessageSchema.parse(valid);
      expect(result.count).toBe(100);
    });
  });
});
