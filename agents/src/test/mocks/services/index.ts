/**
 * Service Mocks Index
 *
 * Centralized MSW mock configuration for all external services.
 *
 * @example
 * ```ts
 * // In test setup
 * import { serviceServer, useScenario } from './mocks/services';
 *
 * beforeAll(() => serviceServer.listen());
 * afterAll(() => serviceServer.close());
 * afterEach(() => serviceServer.resetHandlers());
 *
 * // In a specific test
 * test('handles rate limit', () => {
 *   useScenario('github', 'rateLimitExhausted');
 *   // ... test code
 * });
 * ```
 */

import type { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';
import { type githubMocks as GitHubMocksType, githubMocks } from './github';

// Re-export individual service mocks
export { GITHUB_URLS, githubFixtures, githubMocks } from './github';
export type { ServiceMockModule } from './types';

// ============================================================================
// Service Registry
// ============================================================================

type ServiceMocks = {
  github: typeof GitHubMocksType;
  // Add more services here as they're implemented:
  // notifications: typeof NotificationMocksType;
  // analytics: typeof AnalyticsMocksType;
};

const services: ServiceMocks = {
  github: githubMocks,
};

// ============================================================================
// Combined Server
// ============================================================================

/**
 * All default handlers from all services
 */
const allHandlers: RequestHandler[] = [
  ...githubMocks.handlers,
  // Add more service handlers here
];

/**
 * MSW server with all service mocks
 */
export const serviceServer = setupServer(...allHandlers);

// ============================================================================
// Scenario Utilities
// ============================================================================

type ScenarioKey<S extends keyof ServiceMocks> = keyof ServiceMocks[S]['scenarios'];

/**
 * Apply a named scenario for a specific service
 *
 * @example
 * ```ts
 * // Use rate limited scenario for GitHub
 * useScenario('github', 'rateLimitExhausted');
 * ```
 */
export function useScenario<S extends keyof ServiceMocks>(
  service: S,
  scenario: ScenarioKey<S>,
): void {
  const serviceMock = services[service];
  // Type assertion needed because TypeScript can't infer the scenario key type dynamically
  const scenarioKey = scenario as keyof typeof serviceMock.scenarios;
  const handlers = serviceMock.scenarios[scenarioKey];

  if (!handlers) {
    throw new Error(`Unknown scenario "${String(scenario)}" for service "${service}"`);
  }

  serviceServer.use(...handlers);
}

/**
 * Reset to default handlers for all services
 */
export function resetAllScenarios(): void {
  serviceServer.resetHandlers();
}

/**
 * Apply custom handlers for a single test
 */
export function useCustomHandlers(...handlers: RequestHandler[]): void {
  serviceServer.use(...handlers);
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Setup MSW server for tests
 *
 * @example
 * ```ts
 * import { setupServiceMocks } from './mocks/services';
 *
 * const { server, useScenario } = setupServiceMocks();
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterAll(() => server.close());
 * afterEach(() => server.resetHandlers());
 * ```
 */
export function setupServiceMocks() {
  return {
    server: serviceServer,
    useScenario,
    resetAllScenarios,
    useCustomHandlers,
    services,
  };
}
