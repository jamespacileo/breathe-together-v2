/**
 * MSW Handlers for GitHub API
 *
 * Mock handlers for GitHub REST API endpoints.
 */

import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import {
  mockDeploymentStatus,
  mockDeployments,
  mockPullRequests,
  mockWorkflowRuns,
} from '../fixtures/github';

// URL constants - exported for use in tests
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_PATH = '/repos/jamespacileo/breathe-together-v2';

export const GITHUB_API_URL = `${GITHUB_API_BASE}${REPO_PATH}`;

// ============================================================================
// Pull Requests Handlers
// ============================================================================

export const pullRequestsHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/pulls`,
  ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || 'open';

    // Filter by state if needed
    const prs = mockPullRequests.filter((pr) => pr.state === state || state === 'all');

    return HttpResponse.json(prs);
  },
);

export const pullRequestHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/pulls/:number`,
  ({ params }) => {
    const prNumber = Number(params.number);
    const pr = mockPullRequests.find((p) => p.number === prNumber);

    if (!pr) {
      return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
    }

    return HttpResponse.json(pr);
  },
);

// ============================================================================
// Workflow Runs Handlers
// ============================================================================

export const workflowRunsHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/actions/runs`,
  ({ request }) => {
    const url = new URL(request.url);
    const branch = url.searchParams.get('branch');
    const perPage = Number(url.searchParams.get('per_page')) || 20;

    let runs = [...mockWorkflowRuns];

    // Filter by branch if specified
    if (branch) {
      runs = runs.filter((run) => run.head_branch === branch);
    }

    // Limit results
    runs = runs.slice(0, perPage);

    return HttpResponse.json({ workflow_runs: runs });
  },
);

export const workflowRunHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/actions/runs/:id`,
  ({ params }) => {
    const runId = Number(params.id);
    const run = mockWorkflowRuns.find((r) => r.id === runId);

    if (!run) {
      return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
    }

    return HttpResponse.json(run);
  },
);

// ============================================================================
// Deployments Handlers
// ============================================================================

export const deploymentsHandler = http.get(`${GITHUB_API_BASE}${REPO_PATH}/deployments`, () => {
  return HttpResponse.json(mockDeployments);
});

export const deploymentStatusesHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/deployments/:id/statuses`,
  () => {
    return HttpResponse.json([mockDeploymentStatus]);
  },
);

// ============================================================================
// Combined Handlers & Server
// ============================================================================

const githubHandlers = [
  pullRequestsHandler,
  pullRequestHandler,
  workflowRunsHandler,
  workflowRunHandler,
  deploymentsHandler,
  deploymentStatusesHandler,
];

// Create and export the MSW server with GitHub handlers
export const server = setupServer(...githubHandlers);
