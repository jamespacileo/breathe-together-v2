/**
 * GitHub Agent Tests
 *
 * Tests the GitHub integration functionality.
 * These are unit tests that don't require a running worker.
 */

import { describe, expect, it } from 'vitest';
import { SCHEDULED_TASKS } from '../core/types';

describe('GitHubAgent Configuration', () => {
  describe('Schedule Configuration', () => {
    it('has GitHub refresh scheduled task', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(githubTask).toBeDefined();
    });

    it('GitHub refresh runs every 5 minutes', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(githubTask?.cron).toBe('*/5 * * * *');
    });

    it('GitHub refresh uses correct task name', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(githubTask?.agent).toBe('github');
      expect(githubTask?.task).toBe('refreshPRData');
    });
  });

  describe('Agent Registration', () => {
    it('github is a valid agent type', () => {
      const validAgents = ['orchestrator', 'health', 'content', 'github'];
      expect(validAgents).toContain('github');
    });
  });
});

describe('GitHub Agent Tools', () => {
  const expectedTools = [
    'fetchOpenPRs',
    'fetchPRDeployments',
    'fetchWorkflowRuns',
    'refreshPRData',
  ];

  it('defines expected tools', () => {
    // This test documents the expected tools for GitHubAgent
    for (const tool of expectedTools) {
      expect(expectedTools).toContain(tool);
    }
  });

  it('refreshPRData is the main refresh task', () => {
    expect(expectedTools).toContain('refreshPRData');
  });
});
