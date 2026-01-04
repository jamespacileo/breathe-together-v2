/**
 * Vitest Test Setup
 *
 * Global setup for all tests in the agents package.
 * - Configures MSW for API mocking
 * - Sets up global test utilities
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/github';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test (allows per-test overrides)
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
