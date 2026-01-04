/**
 * MSW Server Setup for Node.js Tests
 *
 * Creates and exports the MSW server for use in tests.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server with default handlers
export const server = setupServer(...handlers);

// Export for test setup
export { handlers };
