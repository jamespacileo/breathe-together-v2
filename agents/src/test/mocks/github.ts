/**
 * MSW Handlers for GitHub API
 *
 * Mock handlers for GitHub REST API endpoints.
 */

import { HttpResponse, http } from 'msw';
import {
  buildDeploymentStatusesResponse,
  buildDeploymentsResponse,
  buildPullRequestsResponse,
  buildWorkflowRunsResponse,
  mockDeploymentStatus,
} from '../fixtures/github';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_PATH = '/repos/jamespacileo/breathe-together-v2';

// ============================================================================
// Pull Requests Handlers
// ============================================================================

export const pullRequestsHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/pulls`,
  ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || 'open';

    // Filter by state if needed
    const prs = buildPullRequestsResponse().filter((pr) => pr.state === state || state === 'all');

    return HttpResponse.json(prs);
  },
);

export const pullRequestHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/pulls/:number`,
  ({ params }) => {
    const prNumber = Number(params.number);
    const pr = buildPullRequestsResponse().find((p) => p.number === prNumber);

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

    let runs = buildWorkflowRunsResponse().workflow_runs;

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
    const run = buildWorkflowRunsResponse().workflow_runs.find((r) => r.id === runId);

    if (!run) {
      return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
    }

    return HttpResponse.json(run);
  },
);

// ============================================================================
// Deployments Handlers
// ============================================================================

export const deploymentsHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/deployments`,
  ({ request }) => {
    const url = new URL(request.url);
    const _perPage = Number(url.searchParams.get('per_page')) || 30;

    return HttpResponse.json(buildDeploymentsResponse());
  },
);

export const deploymentStatusesHandler = http.get(
  `${GITHUB_API_BASE}${REPO_PATH}/deployments/:id/statuses`,
  () => {
    return HttpResponse.json(buildDeploymentStatusesResponse([mockDeploymentStatus]));
  },
);

// ============================================================================
// Error Handlers (for testing error scenarios)
// ============================================================================

export const githubErrorHandler = http.get(`${GITHUB_API_BASE}${REPO_PATH}/*`, () => {
  return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
});

export const githubRateLimitHandler = http.get(`${GITHUB_API_BASE}${REPO_PATH}/*`, () => {
  return HttpResponse.json(
    { message: 'API rate limit exceeded' },
    {
      status: 403,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      },
    },
  );
});

export const githubUnauthorizedHandler = http.get(`${GITHUB_API_BASE}${REPO_PATH}/*`, () => {
  return HttpResponse.json({ message: 'Bad credentials' }, { status: 401 });
});

// ============================================================================
// Combined Handlers
// ============================================================================

export const githubHandlers = [
  pullRequestsHandler,
  pullRequestHandler,
  workflowRunsHandler,
  workflowRunHandler,
  deploymentsHandler,
  deploymentStatusesHandler,
];
