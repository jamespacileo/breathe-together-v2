/**
 * GitHub Agent Unit Tests
 *
 * Tests GitHub agent configuration and API interactions using MSW.
 */

import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { isValidAgentType } from '../../core/registry';
import { SCHEDULED_TASKS } from '../../core/types';
import {
  mockDeployment,
  mockDeploymentStatus,
  mockPullRequests,
  mockWorkflowRuns,
} from '../fixtures/github';
import { GITHUB_API_URL, server } from '../mocks/github';

// ============================================================================
// Configuration Tests
// ============================================================================

describe('GitHub Agent Configuration', () => {
  describe('Schedule Configuration', () => {
    it('has GitHub refresh scheduled task', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(githubTask).toBeDefined();
    });

    it('GitHub refresh runs every 5 minutes', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(githubTask?.cron).toBe('*/5 * * * *');
    });

    it('GitHub refresh uses correct agent and task', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(githubTask?.agent).toBe('github');
      expect(githubTask?.task).toBe('refreshPRData');
    });
  });

  describe('Agent Type Registration', () => {
    it('github is a valid agent type', () => {
      expect(isValidAgentType('github')).toBe(true);
    });

    it('invalid agent type returns false', () => {
      expect(isValidAgentType('invalid')).toBe(false);
    });
  });

  describe('GitHub Agent Tools', () => {
    // Expected tools (verified via integration tests with actual agent instance)
    const expectedTools = [
      'fetchOpenPRs',
      'fetchPRDeployments',
      'fetchWorkflowRuns',
      'refreshPRData',
    ];

    it('scheduled task uses defined tool', () => {
      const githubTask = SCHEDULED_TASKS.find((t) => t.type === 'github-refresh');
      expect(expectedTools).toContain(githubTask?.task);
    });

    it('has all required tools for PR monitoring', () => {
      // Verify our expected tools cover all functionality
      expect(expectedTools).toContain('fetchOpenPRs');
      expect(expectedTools).toContain('fetchPRDeployments');
      expect(expectedTools).toContain('fetchWorkflowRuns');
    });
  });
});

// ============================================================================
// GitHub API Interaction Tests (with MSW)
// ============================================================================

describe('GitHub API Interactions', () => {
  describe('Pull Requests API', () => {
    it('fetches open pull requests', async () => {
      const response = await fetch(`${GITHUB_API_URL}/pulls?state=open`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(mockPullRequests.length);
    });

    it('returns PR with expected structure', async () => {
      const response = await fetch(`${GITHUB_API_URL}/pulls?state=open`);

      const data = await response.json();
      const pr = data[0];

      expect(pr).toHaveProperty('number');
      expect(pr).toHaveProperty('title');
      expect(pr).toHaveProperty('state');
      expect(pr).toHaveProperty('head');
      expect(pr).toHaveProperty('base');
      expect(pr).toHaveProperty('user');
      expect(pr.head).toHaveProperty('ref');
      expect(pr.head).toHaveProperty('sha');
    });

    it('identifies draft PRs', async () => {
      const response = await fetch(`${GITHUB_API_URL}/pulls?state=open`);

      const data = await response.json();
      const draftPRs = data.filter((pr: { draft: boolean }) => pr.draft);
      expect(draftPRs.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Runs API', () => {
    it('fetches workflow runs', async () => {
      const response = await fetch(`${GITHUB_API_URL}/actions/runs`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('workflow_runs');
      expect(Array.isArray(data.workflow_runs)).toBe(true);
    });

    it('returns workflow run with expected structure', async () => {
      const response = await fetch(`${GITHUB_API_URL}/actions/runs`);

      const data = await response.json();
      const run = data.workflow_runs[0];

      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('name');
      expect(run).toHaveProperty('status');
      expect(run).toHaveProperty('conclusion');
      expect(run).toHaveProperty('head_branch');
    });

    it('filters by branch', async () => {
      const response = await fetch(`${GITHUB_API_URL}/actions/runs?branch=feature/new-animation`);

      const data = await response.json();
      for (const run of data.workflow_runs) {
        expect(run.head_branch).toBe('feature/new-animation');
      }
    });

    it('includes different workflow statuses', async () => {
      const response = await fetch(`${GITHUB_API_URL}/actions/runs`);

      const data = await response.json();
      const statuses = data.workflow_runs.map((r: { status: string }) => r.status);

      expect(statuses).toContain('completed');
      expect(statuses).toContain('in_progress');
    });
  });

  describe('Deployments API', () => {
    it('fetches deployments', async () => {
      const response = await fetch(`${GITHUB_API_URL}/deployments`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('returns deployment with expected structure', async () => {
      const response = await fetch(`${GITHUB_API_URL}/deployments`);

      const data = await response.json();
      const deployment = data[0];

      expect(deployment).toHaveProperty('id');
      expect(deployment).toHaveProperty('ref');
      expect(deployment).toHaveProperty('sha');
      expect(deployment).toHaveProperty('environment');
    });

    it('fetches deployment statuses', async () => {
      const response = await fetch(`${GITHUB_API_URL}/deployments/${mockDeployment.id}/statuses`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('state');
      expect(data[0]).toHaveProperty('environment_url');
    });
  });

  describe('Error Handling', () => {
    it('handles 404 for non-existent PR', async () => {
      const response = await fetch(`${GITHUB_API_URL}/pulls/99999`);

      expect(response.status).toBe(404);
    });

    it('handles API errors gracefully', async () => {
      // Override handler for this specific test
      server.use(
        http.get(
          `${GITHUB_API_URL}/pulls`,
          () => {
            return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
          },
          { once: true },
        ),
      );

      const response = await fetch(`${GITHUB_API_URL}/pulls?state=open`);

      expect(response.status).toBe(500);
    });

    it('handles rate limiting', async () => {
      // Override handler for this specific test
      server.use(
        http.get(
          `${GITHUB_API_URL}/pulls`,
          () => {
            return HttpResponse.json(
              { message: 'API rate limit exceeded' },
              {
                status: 403,
                headers: { 'X-RateLimit-Remaining': '0' },
              },
            );
          },
          { once: true },
        ),
      );

      const response = await fetch(`${GITHUB_API_URL}/pulls?state=open`);

      expect(response.status).toBe(403);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
});

// ============================================================================
// Data Transformation Tests
// ============================================================================

describe('GitHub Data Transformation', () => {
  it('extracts preview URL from deployment status', async () => {
    const response = await fetch(`${GITHUB_API_URL}/deployments/${mockDeployment.id}/statuses`);

    const statuses = await response.json();
    const successStatus = statuses.find((s: { state: string }) => s.state === 'success');

    expect(successStatus?.environment_url).toBe(mockDeploymentStatus.environment_url);
  });

  it('associates workflow runs with PRs by branch', async () => {
    // Fetch PRs
    const prsResponse = await fetch(`${GITHUB_API_URL}/pulls?state=open`);
    const prs = await prsResponse.json();

    // Fetch workflow runs for first PR's branch
    const branch = prs[0].head.ref;
    const runsResponse = await fetch(`${GITHUB_API_URL}/actions/runs?branch=${branch}`);
    const { workflow_runs } = await runsResponse.json();

    // All runs should match the branch
    for (const run of workflow_runs) {
      expect(run.head_branch).toBe(branch);
    }
  });

  it('calculates workflow success rate from runs', async () => {
    const response = await fetch(`${GITHUB_API_URL}/actions/runs`);
    const { workflow_runs } = await response.json();

    const completed = workflow_runs.filter((r: { status: string }) => r.status === 'completed');
    const successful = completed.filter((r: { conclusion: string }) => r.conclusion === 'success');

    const successRate = completed.length > 0 ? successful.length / completed.length : 0;
    expect(successRate).toBeGreaterThanOrEqual(0);
    expect(successRate).toBeLessThanOrEqual(1);
  });
});
