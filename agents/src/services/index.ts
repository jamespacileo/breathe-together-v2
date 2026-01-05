/**
 * Services Module
 *
 * External API integrations with resilience patterns:
 * - Circuit breaker for fault tolerance
 * - Rate limiting for API compliance
 * - Zod validation for type safety
 * - Retry logic for transient failures
 *
 * @example
 * ```ts
 * import { createGitHubService } from './services';
 *
 * const github = createGitHubService({
 *   token: env.GITHUB_TOKEN,
 *   owner: 'jamespacileo',
 *   repo: 'breathe-together-v2',
 * });
 *
 * const prs = await github.getOpenPRs();
 * console.log(github.getHealth()); // Circuit breaker + rate limiter stats
 * ```
 */

export type {
  RateLimitConfig,
  ServiceConfig,
  ServiceError,
  ServiceRequest,
  ServiceResponse,
} from './base';
// Base infrastructure
export { BaseService, getAllServicesHealth, getService, registerService } from './base';
export type { CircuitBreakerOptions, CircuitBreakerStats, CircuitState } from './circuit-breaker';
// Circuit breaker
export { CircuitBreaker, CircuitBreakerError } from './circuit-breaker';
export type {
  GitHubDeployment,
  GitHubDeploymentStatus,
  GitHubPR,
  GitHubRateLimit,
  GitHubServiceConfig,
  GitHubWorkflowRun,
  GitHubWorkflowRunsResponse,
  PRWithDeployments,
} from './github';
// GitHub service
export {
  createGitHubService,
  GitHubDeploymentSchema,
  GitHubDeploymentStatusesListSchema,
  GitHubDeploymentStatusSchema,
  GitHubDeploymentsListSchema,
  GitHubPRListSchema,
  GitHubPRSchema,
  GitHubRateLimitSchema,
  GitHubService,
  GitHubValidationError,
  GitHubWorkflowRunSchema,
  GitHubWorkflowRunsResponseSchema,
} from './github';
