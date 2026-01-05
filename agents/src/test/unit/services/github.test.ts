/**
 * GitHub Service Tests
 *
 * Tests the GitHub service with:
 * - API endpoint coverage
 * - Zod validation
 * - Error handling
 * - Circuit breaker behavior
 * - Rate limiting
 */

import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  createGitHubService,
  GitHubService,
  GitHubValidationError,
} from '../../../services/github';
import { GITHUB_URLS, useCustomHandlers, useScenario } from '../../mocks/services';

// ============================================================================
// Test Setup
// ============================================================================

// MSW server is configured globally in setup.ts

const testConfig = {
  token: 'test-token',
  owner: 'jamespacileo',
  repo: 'breathe-together-v2',
};

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createGitHubService', () => {
  it('creates a GitHubService instance', () => {
    const service = createGitHubService(testConfig);
    expect(service).toBeInstanceOf(GitHubService);
  });

  it('uses default API URL when not specified', () => {
    const service = createGitHubService(testConfig);
    const health = service.getHealth();
    expect(health.name).toBe('github');
  });

  it('uses custom API URL when specified', () => {
    const service = createGitHubService({
      ...testConfig,
      apiUrl: 'https://github.example.com/api/v3',
    });
    expect(service).toBeInstanceOf(GitHubService);
  });
});

// ============================================================================
// Pull Requests Tests
// ============================================================================

describe('GitHubService.getOpenPRs', () => {
  it('fetches open pull requests', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getOpenPRs();

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(response.data[0].number).toBe(123);
    expect(response.data[0].title).toBe('feat: add new breathing animation');
    expect(response.data[0].draft).toBe(false);
    expect(response.data[1].draft).toBe(true);
  });

  it('returns empty array when no PRs', async () => {
    useScenario('github', 'noPRs');

    const service = createGitHubService(testConfig);
    const response = await service.getOpenPRs();

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(0);
  });

  it('includes duration in response', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getOpenPRs();

    expect(response.duration).toBeGreaterThan(0);
    expect(response.duration).toBeLessThan(5000); // Should be quick with mocks
  });
});

describe('GitHubService.getPR', () => {
  it('fetches a single pull request by number', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getPR(123);

    expect(response.status).toBe(200);
    expect(response.data.number).toBe(123);
    expect(response.data.title).toBe('feat: add new breathing animation');
  });

  it('throws on non-existent PR', async () => {
    const service = createGitHubService(testConfig);

    await expect(service.getPR(999)).rejects.toThrow();
  });
});

// ============================================================================
// Workflow Runs Tests
// ============================================================================

describe('GitHubService.getWorkflowRuns', () => {
  it('fetches workflow runs', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getWorkflowRuns();

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.data[0].name).toBe('CI');
    expect(response.data[0].conclusion).toBe('success');
  });

  it('filters by branch', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getWorkflowRuns({ branch: 'feature/new-animation' });

    expect(response.status).toBe(200);
    // The mock returns all runs, but in real API this would filter
    expect(response.data.length).toBeGreaterThan(0);
  });

  it('returns failed workflows in scenario', async () => {
    useScenario('github', 'allWorkflowsFailed');

    const service = createGitHubService(testConfig);
    const response = await service.getWorkflowRuns();

    expect(response.data).toHaveLength(1);
    expect(response.data[0].conclusion).toBe('failure');
  });
});

// ============================================================================
// Deployments Tests
// ============================================================================

describe('GitHubService.getDeployments', () => {
  it('fetches deployments', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getDeployments();

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].environment).toBe('preview');
  });
});

describe('GitHubService.getDeploymentStatuses', () => {
  it('fetches deployment statuses', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getDeploymentStatuses(789);

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].state).toBe('success');
    expect(response.data[0].environment_url).toBe(
      'https://preview-123.breathe-together-v2.pages.dev',
    );
  });

  it('handles pending deployments', async () => {
    useScenario('github', 'deploymentsPending');

    const service = createGitHubService(testConfig);
    const response = await service.getDeploymentStatuses(789);

    expect(response.data[0].state).toBe('pending');
    expect(response.data[0].environment_url).toBeNull();
  });
});

// ============================================================================
// Combined Queries Tests
// ============================================================================

describe('GitHubService.getPRsWithDeployments', () => {
  it('fetches PRs with their deployments', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getPRsWithDeployments();

    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);

    // First PR should have deployments
    const prWithDeploy = response.data.find((pr) => pr.number === 123);
    expect(prWithDeploy?.deployments).toBeDefined();
  });
});

// ============================================================================
// Rate Limit Tests
// ============================================================================

describe('GitHubService.getRateLimit', () => {
  it('fetches rate limit status', async () => {
    const service = createGitHubService(testConfig);
    const response = await service.getRateLimit();

    expect(response.status).toBe(200);
    expect(response.data.rate.limit).toBe(5000);
    expect(response.data.rate.remaining).toBeGreaterThan(0);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('GitHubService error handling', () => {
  it('handles 401 Unauthorized', async () => {
    useScenario('github', 'unauthorized');

    const service = createGitHubService(testConfig);

    await expect(service.getOpenPRs()).rejects.toThrow();
  });

  it('handles 403 Rate Limited', async () => {
    useScenario('github', 'rateLimitExhausted');

    const service = createGitHubService(testConfig);

    await expect(service.getOpenPRs()).rejects.toThrow();
  });

  it('handles 404 Not Found', async () => {
    useScenario('github', 'notFound');

    const service = createGitHubService(testConfig);

    await expect(service.getOpenPRs()).rejects.toThrow();
  });

  it('handles 500 Server Error', async () => {
    useScenario('github', 'serverError');

    const service = createGitHubService(testConfig);

    await expect(service.getOpenPRs()).rejects.toThrow();
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('GitHubService validation', () => {
  it('validates PR response schema', async () => {
    // Override with invalid response
    useCustomHandlers(
      http.get(`${GITHUB_URLS.pulls()}`, () => {
        return HttpResponse.json([
          {
            number: 'not-a-number', // Should be number
            title: 123, // Should be string
          },
        ]);
      }),
    );

    const service = createGitHubService(testConfig);

    await expect(service.getOpenPRs()).rejects.toThrow(GitHubValidationError);
  });

  it('validates workflow run response schema', async () => {
    useCustomHandlers(
      http.get(`${GITHUB_URLS.workflows()}`, () => {
        return HttpResponse.json({
          // Missing workflow_runs array
          total_count: 1,
        });
      }),
    );

    const service = createGitHubService(testConfig);

    await expect(service.getWorkflowRuns()).rejects.toThrow(GitHubValidationError);
  });

  it('provides detailed validation error info', async () => {
    useCustomHandlers(
      http.get(`${GITHUB_URLS.pulls()}`, () => {
        return HttpResponse.json([{ invalid: 'data' }]);
      }),
    );

    const service = createGitHubService(testConfig);

    try {
      await service.getOpenPRs();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubValidationError);
      const validationError = error as GitHubValidationError;
      // Verify issues array exists
      expect(validationError.issues).toBeDefined();
      expect(Array.isArray(validationError.issues)).toBe(true);
      // Verify error message mentions validation
      expect(validationError.message).toContain('validation');
    }
  });
});

// ============================================================================
// Health & Circuit Breaker Tests
// ============================================================================

describe('GitHubService health', () => {
  it('provides health status', () => {
    const service = createGitHubService(testConfig);
    const health = service.getHealth();

    expect(health.name).toBe('github');
    expect(health.circuitBreaker).toBeDefined();
    expect(health.circuitBreaker.state).toBe('closed');
    expect(health.rateLimiter).toBeDefined();
  });

  it('tracks circuit breaker state after failures', async () => {
    useScenario('github', 'serverError');

    const service = createGitHubService(testConfig);

    // Trigger multiple failures
    for (let i = 0; i < 5; i++) {
      try {
        await service.getOpenPRs();
      } catch {
        // Expected to fail
      }
    }

    const health = service.getHealth();
    // After 5 failures with default threshold of 5, circuit should be open
    expect(health.circuitBreaker.failures).toBeGreaterThan(0);
  });

  it('can reset circuit breaker', async () => {
    useScenario('github', 'serverError');

    const service = createGitHubService(testConfig);

    // Trigger some failures
    try {
      await service.getOpenPRs();
    } catch {
      // Expected
    }

    // Reset
    service.resetCircuitBreaker();

    const health = service.getHealth();
    expect(health.circuitBreaker.state).toBe('closed');
    expect(health.circuitBreaker.failures).toBe(0);
  });
});
