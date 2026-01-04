/**
 * GitHub API Test Fixtures
 *
 * Mock data for GitHub API responses used in tests.
 */

// ============================================================================
// Pull Request Fixtures
// ============================================================================

export const mockPullRequest = {
  number: 123,
  title: 'feat: add new breathing animation',
  state: 'open',
  html_url: 'https://github.com/jamespacileo/breathe-together-v2/pull/123',
  head: {
    ref: 'feature/new-animation',
    sha: 'abc123def456',
  },
  base: {
    ref: 'main',
  },
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
};

export const mockDraftPullRequest = {
  ...mockPullRequest,
  number: 124,
  title: 'wip: refactor particle system',
  head: {
    ref: 'refactor/particles',
    sha: 'def789ghi012',
  },
  draft: true,
  labels: [{ name: 'work-in-progress', color: 'fbca04' }],
};

export const mockPullRequests = [mockPullRequest, mockDraftPullRequest];

// ============================================================================
// Workflow Run Fixtures
// ============================================================================

export const mockWorkflowRunSuccess = {
  id: 456,
  name: 'CI',
  head_branch: 'feature/new-animation',
  head_sha: 'abc123def456',
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://github.com/jamespacileo/breathe-together-v2/actions/runs/456',
  created_at: '2024-01-15T14:00:00Z',
  updated_at: '2024-01-15T14:15:00Z',
};

export const mockWorkflowRunPending = {
  id: 457,
  name: 'Deploy Preview',
  head_branch: 'feature/new-animation',
  head_sha: 'abc123def456',
  status: 'in_progress',
  conclusion: null,
  html_url: 'https://github.com/jamespacileo/breathe-together-v2/actions/runs/457',
  created_at: '2024-01-15T14:20:00Z',
  updated_at: '2024-01-15T14:25:00Z',
};

export const mockWorkflowRunFailed = {
  id: 458,
  name: 'Tests',
  head_branch: 'refactor/particles',
  head_sha: 'def789ghi012',
  status: 'completed',
  conclusion: 'failure',
  html_url: 'https://github.com/jamespacileo/breathe-together-v2/actions/runs/458',
  created_at: '2024-01-15T13:00:00Z',
  updated_at: '2024-01-15T13:10:00Z',
};

export const mockWorkflowRuns = [
  mockWorkflowRunSuccess,
  mockWorkflowRunPending,
  mockWorkflowRunFailed,
];

// ============================================================================
// Deployment Fixtures
// ============================================================================

export const mockDeployment = {
  id: 789,
  ref: 'feature/new-animation',
  sha: 'abc123def456',
  environment: 'preview',
  created_at: '2024-01-15T14:10:00Z',
  statuses_url:
    'https://api.github.com/repos/jamespacileo/breathe-together-v2/deployments/789/statuses',
};

export const mockDeploymentStatus = {
  id: 1001,
  state: 'success',
  environment_url: 'https://preview-123.breathe-together-v2.pages.dev',
  created_at: '2024-01-15T14:12:00Z',
};

export const mockDeploymentStatusPending = {
  id: 1002,
  state: 'pending',
  environment_url: null,
  created_at: '2024-01-15T14:11:00Z',
};

export const mockDeployments = [mockDeployment];

// ============================================================================
// API Response Builders
// ============================================================================

export function buildPullRequestsResponse(prs = mockPullRequests) {
  return prs;
}

export function buildWorkflowRunsResponse(runs = mockWorkflowRuns) {
  return { workflow_runs: runs };
}

export function buildDeploymentsResponse(deployments = mockDeployments) {
  return deployments;
}

export function buildDeploymentStatusesResponse(statuses = [mockDeploymentStatus]) {
  return statuses;
}
