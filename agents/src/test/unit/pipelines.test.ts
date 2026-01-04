/**
 * Pipeline Unit Tests
 *
 * Tests pipeline definitions and orchestration logic.
 * These are pure unit tests with no external dependencies.
 */

import { describe, expect, it } from 'vitest';
import { getPipeline, getPipelinesForCron, PIPELINES } from '../../pipelines';

describe('Pipeline Registry', () => {
  it('has all required pipelines', () => {
    const pipelineIds = PIPELINES.map((p) => p.id);

    expect(pipelineIds).toContain('comprehensive-health');
    expect(pipelineIds).toContain('daily-maintenance');
    expect(pipelineIds).toContain('weekly-maintenance');
    expect(pipelineIds).toContain('content-refresh');
  });

  it('all pipelines have required fields', () => {
    for (const pipeline of PIPELINES) {
      expect(pipeline.id).toBeTruthy();
      expect(pipeline.name).toBeTruthy();
      expect(pipeline.description).toBeTruthy();
      expect(Array.isArray(pipeline.steps)).toBe(true);
      expect(pipeline.steps.length).toBeGreaterThan(0);
    }
  });

  it('all steps have required fields', () => {
    for (const pipeline of PIPELINES) {
      for (const step of pipeline.steps) {
        expect(step.id).toBeTruthy();
        expect(step.agent).toBeTruthy();
        expect(step.task).toBeTruthy();
        expect(step.params).toBeDefined();
      }
    }
  });

  it('all pipelines have unique IDs', () => {
    const ids = PIPELINES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('getPipeline', () => {
  it('returns pipeline by ID', () => {
    const pipeline = getPipeline('daily-maintenance');
    expect(pipeline).toBeDefined();
    expect(pipeline?.name).toBe('Daily Maintenance');
  });

  it('returns undefined for unknown ID', () => {
    const pipeline = getPipeline('unknown-pipeline');
    expect(pipeline).toBeUndefined();
  });
});

describe('getPipelinesForCron', () => {
  it('returns pipelines for daily maintenance cron', () => {
    const pipelines = getPipelinesForCron('0 4 * * *');
    expect(pipelines.length).toBe(1);
    expect(pipelines[0].id).toBe('daily-maintenance');
  });

  it('returns empty array for unknown cron', () => {
    const pipelines = getPipelinesForCron('0 0 0 0 0');
    expect(pipelines.length).toBe(0);
  });
});

describe('Pipeline Schedules', () => {
  it('scheduled pipelines have valid cron expressions', () => {
    const scheduledPipelines = PIPELINES.filter((p) => p.schedule);

    for (const pipeline of scheduledPipelines) {
      // Basic cron validation (5 fields)
      const parts = pipeline.schedule?.split(' ');
      expect(parts).toBeDefined();
      expect(parts?.length).toBe(5);
    }
  });
});

describe('Daily Maintenance Pipeline', () => {
  const pipeline = getPipeline('daily-maintenance');

  it('exists', () => {
    expect(pipeline).toBeDefined();
  });

  it('has correct step order', () => {
    expect(pipeline?.steps[0].id).toBe('health-check');
    expect(pipeline?.steps[1].id).toBe('content-freshness');
    expect(pipeline?.steps[2].id).toBe('cleanup-stale');
  });

  it('cleanup step has condition', () => {
    const cleanupStep = pipeline?.steps.find((s) => s.id === 'cleanup-stale');
    expect(cleanupStep?.condition).toBeDefined();
    expect(typeof cleanupStep?.condition).toBe('function');
  });

  it('cleanup condition requires successful freshness check', () => {
    const cleanupStep = pipeline?.steps.find((s) => s.id === 'cleanup-stale');
    expect(cleanupStep).toBeDefined();

    // Should skip cleanup if freshness check failed
    const failedResults = [{ success: false, data: { healthy: false }, duration: 100 }];
    expect(cleanupStep?.condition?.(failedResults)).toBe(false);

    // Should run cleanup if freshness check passed
    const successResults = [{ success: true, data: { healthy: true }, duration: 100 }];
    expect(cleanupStep?.condition?.(successResults)).toBe(true);
  });
});

describe('Comprehensive Health Pipeline', () => {
  const pipeline = getPipeline('comprehensive-health');

  it('exists', () => {
    expect(pipeline).toBeDefined();
  });

  it('checks all critical endpoints', () => {
    const endpointChecks = pipeline?.steps.filter((s) => s.task === 'checkEndpoint') ?? [];
    expect(endpointChecks.length).toBeGreaterThanOrEqual(2);

    const urls = endpointChecks.map((s) => (s.params as { url: string }).url);
    expect(urls.some((u) => u.includes('breathe-together.pages.dev'))).toBe(true);
    expect(urls.some((u) => u.includes('presence'))).toBe(true);
  });

  it('includes KV latency check', () => {
    const kvCheck = pipeline?.steps.find((s) => s.task === 'checkKVLatency');
    expect(kvCheck).toBeDefined();
  });
});
