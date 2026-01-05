/**
 * GitHub Service Mocks
 *
 * MSW handlers for GitHub REST API endpoints.
 * Organized by endpoint with configurable scenarios.
 */

import { HttpResponse, type HttpResponseResolver, http, type RequestHandler } from 'msw';
import { createServiceMock, type ServiceMockModule } from './types';

// ============================================================================
// Constants
// ============================================================================

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_OWNER = 'jamespacileo';
const DEFAULT_REPO = 'breathe-together-v2';

export const GITHUB_URLS = {
  base: GITHUB_API_BASE,
  repo: (owner = DEFAULT_OWNER, repo = DEFAULT_REPO) => `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
  pulls: (owner = DEFAULT_OWNER, repo = DEFAULT_REPO) =>
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`,
  workflows: (owner = DEFAULT_OWNER, repo = DEFAULT_REPO) =>
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs`,
  deployments: (owner = DEFAULT_OWNER, repo = DEFAULT_REPO) =>
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments`,
  rateLimit: `${GITHUB_API_BASE}/rate_limit`,
};

// ============================================================================
// Fixture Data
// ============================================================================

export const fixtures = {
  pullRequests: {
    open: {
      number: 123,
      title: 'feat: add new breathing animation',
      state: 'open' as const,
      html_url: `https://github.com/${DEFAULT_OWNER}/${DEFAULT_REPO}/pull/123`,
      head: { ref: 'feature/new-animation', sha: 'abc123def456' },
      base: { ref: 'main' },
      user: {
        login: 'developer',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      },
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T14:30:00Z',
      draft: false,
      labels: [
        { name: 'enhancement', color: 'a2eeef' },
        { name: 'ready-for-review', color: '0e8a16' },
      ],
    },
    draft: {
      number: 124,
      title: 'wip: refactor particle system',
      state: 'open' as const,
      html_url: `https://github.com/${DEFAULT_OWNER}/${DEFAULT_REPO}/pull/124`,
      head: { ref: 'refactor/particles', sha: 'def789ghi012' },
      base: { ref: 'main' },
      user: {
        login: 'developer',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      },
      created_at: '2024-01-15T11:00:00Z',
      updated_at: '2024-01-15T15:00:00Z',
      draft: true,
      labels: [{ name: 'work-in-progress', color: 'fbca04' }],
    },
  },
  workflowRuns: {
    success: {
      id: 456,
      name: 'CI',
      head_branch: 'feature/new-animation',
      head_sha: 'abc123def456',
      status: 'completed' as const,
      conclusion: 'success' as const,
      html_url: `https://github.com/${DEFAULT_OWNER}/${DEFAULT_REPO}/actions/runs/456`,
      created_at: '2024-01-15T14:00:00Z',
      updated_at: '2024-01-15T14:15:00Z',
    },
    inProgress: {
      id: 457,
      name: 'Deploy Preview',
      head_branch: 'feature/new-animation',
      head_sha: 'abc123def456',
      status: 'in_progress' as const,
      conclusion: null,
      html_url: `https://github.com/${DEFAULT_OWNER}/${DEFAULT_REPO}/actions/runs/457`,
      created_at: '2024-01-15T14:20:00Z',
      updated_at: '2024-01-15T14:25:00Z',
    },
    failed: {
      id: 458,
      name: 'Tests',
      head_branch: 'refactor/particles',
      head_sha: 'def789ghi012',
      status: 'completed' as const,
      conclusion: 'failure' as const,
      html_url: `https://github.com/${DEFAULT_OWNER}/${DEFAULT_REPO}/actions/runs/458`,
      created_at: '2024-01-15T13:00:00Z',
      updated_at: '2024-01-15T13:10:00Z',
    },
  },
  deployments: {
    preview: {
      id: 789,
      ref: 'feature/new-animation',
      sha: 'abc123def456',
      environment: 'preview',
      created_at: '2024-01-15T14:10:00Z',
      updated_at: '2024-01-15T14:10:00Z',
      statuses_url: `${GITHUB_API_BASE}/repos/${DEFAULT_OWNER}/${DEFAULT_REPO}/deployments/789/statuses`,
    },
  },
  deploymentStatuses: {
    success: {
      id: 1001,
      state: 'success' as const,
      environment_url: 'https://preview-123.breathe-together-v2.pages.dev',
      created_at: '2024-01-15T14:12:00Z',
    },
    pending: {
      id: 1002,
      state: 'pending' as const,
      environment_url: null,
      created_at: '2024-01-15T14:11:00Z',
    },
  },
  rateLimit: {
    normal: {
      resources: {
        core: { limit: 5000, remaining: 4950, reset: Date.now() / 1000 + 3600, used: 50 },
      },
      rate: { limit: 5000, remaining: 4950, reset: Date.now() / 1000 + 3600, used: 50 },
    },
    low: {
      resources: {
        core: { limit: 5000, remaining: 100, reset: Date.now() / 1000 + 3600, used: 4900 },
      },
      rate: { limit: 5000, remaining: 100, reset: Date.now() / 1000 + 3600, used: 4900 },
    },
    exhausted: {
      resources: {
        core: { limit: 5000, remaining: 0, reset: Date.now() / 1000 + 3600, used: 5000 },
      },
      rate: { limit: 5000, remaining: 0, reset: Date.now() / 1000 + 3600, used: 5000 },
    },
  },
};

// ============================================================================
// Handler Factories
// ============================================================================

/**
 * Create pull requests handler
 */
function createPullsHandler(
  prs = [fixtures.pullRequests.open, fixtures.pullRequests.draft],
): RequestHandler {
  return http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/pulls`, ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || 'open';
    const filtered = prs.filter((pr) => pr.state === state || state === 'all');
    return HttpResponse.json(filtered);
  });
}

/**
 * Create single pull request handler
 */
function createPullHandler(
  prs = [fixtures.pullRequests.open, fixtures.pullRequests.draft],
): RequestHandler {
  return http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/pulls/:number`, ({ params }) => {
    const prNumber = Number(params.number);
    const pr = prs.find((p) => p.number === prNumber);
    if (!pr) {
      return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
    }
    return HttpResponse.json(pr);
  });
}

/**
 * Create workflow runs handler
 */
function createWorkflowRunsHandler(
  runs = [
    fixtures.workflowRuns.success,
    fixtures.workflowRuns.inProgress,
    fixtures.workflowRuns.failed,
  ],
): RequestHandler {
  return http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/actions/runs`, ({ request }) => {
    const url = new URL(request.url);
    const branch = url.searchParams.get('branch');
    const perPage = Number(url.searchParams.get('per_page')) || 20;

    let filtered = [...runs];
    if (branch) {
      filtered = filtered.filter((run) => run.head_branch === branch);
    }
    filtered = filtered.slice(0, perPage);

    return HttpResponse.json({ workflow_runs: filtered });
  });
}

/**
 * Create deployments handler
 */
function createDeploymentsHandler(deployments = [fixtures.deployments.preview]): RequestHandler {
  return http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/deployments`, () => {
    return HttpResponse.json(deployments);
  });
}

/**
 * Create deployment statuses handler
 */
function createDeploymentStatusesHandler(
  statuses: Array<
    typeof fixtures.deploymentStatuses.success | typeof fixtures.deploymentStatuses.pending
  > = [fixtures.deploymentStatuses.success],
): RequestHandler {
  return http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/deployments/:id/statuses`, () => {
    return HttpResponse.json(statuses);
  });
}

/**
 * Create rate limit handler
 */
function createRateLimitHandler(rateLimit = fixtures.rateLimit.normal): RequestHandler {
  return http.get(`${GITHUB_API_BASE}/rate_limit`, () => {
    return HttpResponse.json(rateLimit);
  });
}

// ============================================================================
// Error Handlers
// ============================================================================

const errorHandlers = {
  /** Simulate 401 Unauthorized */
  unauthorized: http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/*`, () => {
    return HttpResponse.json(
      { message: 'Bad credentials', documentation_url: 'https://docs.github.com/rest' },
      { status: 401 },
    );
  }),

  /** Simulate 403 Rate Limited */
  rateLimited: http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/*`, () => {
    return HttpResponse.json(
      { message: 'API rate limit exceeded', documentation_url: 'https://docs.github.com/rest' },
      {
        status: 403,
        headers: {
          'X-RateLimit-Limit': '5000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
      },
    );
  }),

  /** Simulate 404 Not Found */
  notFound: http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/*`, () => {
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),

  /** Simulate 500 Internal Server Error */
  serverError: http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/*`, () => {
    return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }),

  /** Simulate network timeout */
  timeout: http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/*`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 60000)); // 60s timeout
    return HttpResponse.json({});
  }),
};

// ============================================================================
// Default Handlers
// ============================================================================

const defaultHandlers: RequestHandler[] = [
  createPullsHandler(),
  createPullHandler(),
  createWorkflowRunsHandler(),
  createDeploymentsHandler(),
  createDeploymentStatusesHandler(),
  createRateLimitHandler(),
];

// ============================================================================
// Scenarios
// ============================================================================

const scenarios = {
  /** Happy path with all endpoints returning success */
  default: defaultHandlers,

  /** No open PRs */
  noPRs: [
    createPullsHandler([]),
    createPullHandler([]),
    createWorkflowRunsHandler(),
    createDeploymentsHandler(),
    createDeploymentStatusesHandler(),
    createRateLimitHandler(),
  ],

  /** All workflows failed */
  allWorkflowsFailed: [
    createPullsHandler(),
    createPullHandler(),
    createWorkflowRunsHandler([fixtures.workflowRuns.failed]),
    createDeploymentsHandler(),
    createDeploymentStatusesHandler(),
    createRateLimitHandler(),
  ],

  /** Deployments pending (no preview URLs yet) */
  deploymentsPending: [
    createPullsHandler(),
    createPullHandler(),
    createWorkflowRunsHandler(),
    createDeploymentsHandler(),
    createDeploymentStatusesHandler([fixtures.deploymentStatuses.pending]),
    createRateLimitHandler(),
  ],

  /** Rate limit exhausted */
  rateLimitExhausted: [
    errorHandlers.rateLimited,
    createRateLimitHandler(fixtures.rateLimit.exhausted),
  ],

  /** Authentication failed */
  unauthorized: [errorHandlers.unauthorized],

  /** Repository not found */
  notFound: [errorHandlers.notFound],

  /** Server errors */
  serverError: [errorHandlers.serverError],

  /** Network timeout simulation */
  timeout: [errorHandlers.timeout],
};

// ============================================================================
// Export Module
// ============================================================================

export const githubMocks = createServiceMock({
  handlers: defaultHandlers,
  scenarios,
  urls: GITHUB_URLS,
});

// Export for direct use
export { fixtures as githubFixtures, createPullsHandler, createWorkflowRunsHandler, errorHandlers };
