/**
 * Vitest Test Setup
 *
 * Global setup for all tests in the agents package.
 * - Configures MSW for API mocking
 * - Sets up global test utilities
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { serviceServer } from './mocks/services';

// Start MSW server before all tests
beforeAll(() => {
  serviceServer.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test (allows per-test overrides)
afterEach(() => {
  serviceServer.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  serviceServer.close();
});
