/**
 * GitHub Service
 *
 * HTTP client for GitHub REST API with:
 * - Rate limiting (5000 req/hour authenticated)
 * - Circuit breaker protection
 * - Zod validation for responses
 * - Retry logic for transient failures
 */

import { ZodError, type ZodSchema } from 'zod';
import { BaseService, type ServiceConfig, type ServiceResponse } from '../base';
import {
  type GitHubDeployment,
  type GitHubDeploymentStatus,
  GitHubDeploymentStatusesListSchema,
  GitHubDeploymentsListSchema,
  type GitHubPR,
  GitHubPRListSchema,
  GitHubPRSchema,
  type GitHubRateLimit,
  GitHubRateLimitSchema,
  type GitHubWorkflowRun,
  GitHubWorkflowRunsResponseSchema,
} from './schemas';

// ============================================================================
// Types
// ============================================================================

export interface GitHubServiceConfig {
  /** GitHub API token (PAT or App token) */
  token: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** API base URL (default: https://api.github.com) */
  apiUrl?: string;
}

export interface PRWithDeployments extends GitHubPR {
  deployments: Array<{
    id: number;
    environment: string;
    previewUrl: string | null;
    status: string;
  }>;
}

// ============================================================================
// GitHub Service
// ============================================================================

export class GitHubService extends BaseService {
  private readonly owner: string;
  private readonly repo: string;

  constructor(config: GitHubServiceConfig) {
    const serviceConfig: ServiceConfig = {
      baseUrl: config.apiUrl ?? 'https://api.github.com',
      name: 'github',
      timeout: 15000,
      retries: 2,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'BreatheTogether-Agent/1.0',
        Authorization: `token ${config.token}`,
      },
      rateLimit: {
        // GitHub allows 5000 requests/hour for authenticated requests
        // Conservative: max 10 concurrent, 100ms between requests
        maxConcurrent: 10,
        minTime: 100,
        reservoir: 100, // Burst limit
        reservoirRefreshInterval: 60000, // 1 minute
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000, // 30 seconds
        successThreshold: 2,
      },
    };

    super(serviceConfig);
    this.owner = config.owner;
    this.repo = config.repo;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Build repository-scoped path
   */
  private repoPath(path: string): string {
    return `repos/${this.owner}/${this.repo}${path}`;
  }

  /**
   * Parse and validate response with Zod schema
   */
  private async validatedGet<T>(
    path: string,
    schema: ZodSchema<T>,
    searchParams?: Record<string, string | number | boolean>,
  ): Promise<ServiceResponse<T>> {
    const response = await this.get<unknown>(path, { searchParams });

    try {
      const validated = schema.parse(response.data);
      return { ...response, data: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new GitHubValidationError(
          `GitHub API response validation failed: ${error.message}`,
          error.issues,
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // Pull Requests
  // ============================================================================

  /**
   * Fetch open pull requests
   */
  async getOpenPRs(options: { perPage?: number } = {}): Promise<ServiceResponse<GitHubPR[]>> {
    return this.validatedGet(this.repoPath('/pulls'), GitHubPRListSchema, {
      state: 'open',
      per_page: options.perPage ?? 50,
    });
  }

  /**
   * Fetch a single pull request by number
   */
  async getPR(prNumber: number): Promise<ServiceResponse<GitHubPR>> {
    return this.validatedGet(this.repoPath(`/pulls/${prNumber}`), GitHubPRSchema);
  }

  /**
   * Fetch PRs with their associated deployments
   */
  async getPRsWithDeployments(): Promise<ServiceResponse<PRWithDeployments[]>> {
    const prsResponse = await this.getOpenPRs();
    const deploymentsResponse = await this.getDeployments();

    const prsWithDeployments: PRWithDeployments[] = [];

    for (const pr of prsResponse.data) {
      // Find deployments matching this PR's branch or SHA
      const prDeployments = deploymentsResponse.data.filter(
        (d) => d.ref === pr.head.ref || d.sha === pr.head.sha,
      );

      const deploymentsWithStatus: PRWithDeployments['deployments'] = [];

      for (const deployment of prDeployments) {
        const statuses = await this.getDeploymentStatuses(deployment.id);
        const latestStatus = statuses.data[0];

        deploymentsWithStatus.push({
          id: deployment.id,
          environment: deployment.environment,
          previewUrl: latestStatus?.environment_url ?? null,
          status: latestStatus?.state ?? 'pending',
        });
      }

      prsWithDeployments.push({
        ...pr,
        deployments: deploymentsWithStatus,
      });
    }

    return {
      data: prsWithDeployments,
      status: prsResponse.status,
      headers: prsResponse.headers,
      duration: prsResponse.duration,
    };
  }

  // ============================================================================
  // Workflow Runs
  // ============================================================================

  /**
   * Fetch workflow runs
   */
  async getWorkflowRuns(
    options: { branch?: string; perPage?: number } = {},
  ): Promise<ServiceResponse<GitHubWorkflowRun[]>> {
    const searchParams: Record<string, string | number> = {
      per_page: options.perPage ?? 20,
    };

    if (options.branch) {
      searchParams.branch = options.branch;
    }

    const response = await this.validatedGet(
      this.repoPath('/actions/runs'),
      GitHubWorkflowRunsResponseSchema,
      searchParams,
    );

    return {
      ...response,
      data: response.data.workflow_runs,
    };
  }

  // ============================================================================
  // Deployments
  // ============================================================================

  /**
   * Fetch deployments
   */
  async getDeployments(
    options: { environment?: string; perPage?: number } = {},
  ): Promise<ServiceResponse<GitHubDeployment[]>> {
    const searchParams: Record<string, string | number> = {
      per_page: options.perPage ?? 50,
    };

    if (options.environment) {
      searchParams.environment = options.environment;
    }

    return this.validatedGet(
      this.repoPath('/deployments'),
      GitHubDeploymentsListSchema,
      searchParams,
    );
  }

  /**
   * Fetch deployment statuses for a specific deployment
   */
  async getDeploymentStatuses(
    deploymentId: number,
  ): Promise<ServiceResponse<GitHubDeploymentStatus[]>> {
    return this.validatedGet(
      this.repoPath(`/deployments/${deploymentId}/statuses`),
      GitHubDeploymentStatusesListSchema,
    );
  }

  // ============================================================================
  // Rate Limit
  // ============================================================================

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<ServiceResponse<GitHubRateLimit>> {
    return this.validatedGet('rate_limit', GitHubRateLimitSchema);
  }

  // ============================================================================
  // Logging Hooks
  // ============================================================================

  protected onBeforeRequest(request: Request): void {
    // Log request for debugging (redact auth header)
    const url = new URL(request.url);
    console.debug(`[GitHubService] ${request.method} ${url.pathname}`);
  }

  protected onAfterResponse(request: Request, response: Response): void {
    // Track rate limit from response headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const limit = response.headers.get('X-RateLimit-Limit');

    if (remaining && limit) {
      const remainingNum = parseInt(remaining, 10);
      const limitNum = parseInt(limit, 10);

      // Warn if rate limit is getting low
      if (remainingNum < limitNum * 0.1) {
        console.warn(`[GitHubService] Rate limit low: ${remaining}/${limit} remaining`);
      }
    }
  }
}

// ============================================================================
// Custom Errors
// ============================================================================

export class GitHubValidationError extends Error {
  public readonly issues: Array<{ path: (string | number)[]; message: string }>;

  constructor(message: string, zodIssues: Array<{ path?: PropertyKey[]; message?: string }>) {
    super(message);
    this.name = 'GitHubValidationError';
    // Explicitly map Zod issues to ensure property is correctly assigned
    // Convert PropertyKey (string | number | symbol) to (string | number) by filtering out symbols
    this.issues = (zodIssues ?? []).map((issue) => ({
      path: (issue.path ?? []).filter((p): p is string | number => typeof p !== 'symbol'),
      message: issue.message ?? 'Unknown validation error',
    }));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a GitHub service instance
 *
 * @example
 * ```ts
 * const github = createGitHubService({
 *   token: env.GITHUB_TOKEN,
 *   owner: 'jamespacileo',
 *   repo: 'breathe-together-v2',
 * });
 *
 * const prs = await github.getOpenPRs();
 * ```
 */
export function createGitHubService(config: GitHubServiceConfig): GitHubService {
  return new GitHubService(config);
}

// Re-export types and schemas
export * from './schemas';
