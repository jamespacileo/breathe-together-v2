/**
 * Vitest test setup
 * Configures MSW and global test utilities
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/server';

// Start MSW server before tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});
