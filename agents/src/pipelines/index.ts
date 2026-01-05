/**
 * Pipeline Definitions
 *
 * Pipelines are multi-step workflows that coordinate multiple agents.
 * They are executed by the OrchestratorAgent.
 *
 * Structure:
 * - id: Unique identifier
 * - name: Human-readable name
 * - description: What the pipeline does
 * - steps: Ordered list of tasks to execute
 * - schedule: Optional cron expression for automated runs
 *
 * Each step specifies:
 * - agent: Which agent handles this step
 * - task: The task name to execute
 * - params: Parameters for the task
 * - condition: Optional function to skip step based on previous results
 * - continueOnError: Whether to continue if this step fails
 */

import type { Pipeline, TaskResult } from '../core/types';

// ============================================================================
// Health Pipelines
// ============================================================================

export const comprehensiveHealthPipeline: Pipeline = {
  id: 'comprehensive-health',
  name: 'Comprehensive Health Check',
  description: 'Full health scan of all endpoints and services',
  schedule: '0 */6 * * *', // Every 6 hours
  steps: [
    {
      id: 'check-production',
      agent: 'health',
      task: 'checkEndpoint',
      params: { url: 'https://breathe-together.pages.dev', expectedStatus: 200 },
    },
    {
      id: 'check-presence-api',
      agent: 'health',
      task: 'checkEndpoint',
      params: {
        url: 'https://breathe-together-presence.workers.dev/api/config',
        expectedStatus: 200,
      },
    },
    {
      id: 'check-kv-latency',
      agent: 'health',
      task: 'checkKVLatency',
      params: {},
    },
    {
      id: 'full-scan',
      agent: 'health',
      task: 'runHealthScan',
      params: { quick: false },
    },
  ],
};

// ============================================================================
// Maintenance Pipelines
// ============================================================================

export const dailyMaintenancePipeline: Pipeline = {
  id: 'daily-maintenance',
  name: 'Daily Maintenance',
  description: 'Daily cleanup and health verification',
  schedule: '0 4 * * *', // 4 AM UTC
  steps: [
    {
      id: 'health-check',
      agent: 'health',
      task: 'runHealthScan',
      params: { quick: true },
    },
    {
      id: 'content-freshness',
      agent: 'content',
      task: 'checkContentFreshness',
      params: {},
    },
    {
      id: 'cleanup-stale',
      agent: 'content',
      task: 'cleanupStaleContent',
      params: { dryRun: false },
      // Only cleanup if content check passed
      condition: (results: TaskResult[]) => {
        const freshnessResult = results.find((r) => r.data && 'healthy' in (r.data as object));
        return freshnessResult?.success ?? false;
      },
    },
  ],
};

export const weeklyMaintenancePipeline: Pipeline = {
  id: 'weekly-maintenance',
  name: 'Weekly Deep Maintenance',
  description: 'Weekly comprehensive maintenance including inventory sync',
  schedule: '0 3 * * 0', // Sunday 3 AM UTC
  steps: [
    {
      id: 'full-health-scan',
      agent: 'health',
      task: 'runHealthScan',
      params: { quick: false },
    },
    {
      id: 'sync-inventory',
      agent: 'content',
      task: 'syncInventory',
      params: {},
    },
    {
      id: 'content-stats',
      agent: 'content',
      task: 'getContentStats',
      params: {},
    },
    {
      id: 'deep-cleanup',
      agent: 'content',
      task: 'cleanupStaleContent',
      params: { dryRun: false },
    },
  ],
};

// ============================================================================
// Content Pipelines
// ============================================================================

export const contentRefreshPipeline: Pipeline = {
  id: 'content-refresh',
  name: 'Content Refresh',
  description: 'Check and refresh stale content',
  steps: [
    {
      id: 'check-freshness',
      agent: 'content',
      task: 'checkContentFreshness',
      params: {},
    },
    {
      id: 'get-stats',
      agent: 'content',
      task: 'getContentStats',
      params: {},
    },
  ],
};

// ============================================================================
// All Pipelines Export
// ============================================================================

export const PIPELINES: Pipeline[] = [
  comprehensiveHealthPipeline,
  dailyMaintenancePipeline,
  weeklyMaintenancePipeline,
  contentRefreshPipeline,
];

/**
 * Get a pipeline by ID
 */
export function getPipeline(id: string): Pipeline | undefined {
  return PIPELINES.find((p) => p.id === id);
}

/**
 * Get pipelines that should run for a given cron expression
 */
export function getPipelinesForCron(cron: string): Pipeline[] {
  return PIPELINES.filter((p) => p.schedule === cron);
}
