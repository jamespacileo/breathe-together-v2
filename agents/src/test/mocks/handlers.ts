/**
 * Combined MSW Handlers
 *
 * All mock handlers for external API testing.
 */

import { githubHandlers } from './github';

// Combine all handlers for use in MSW server
export const handlers = [...githubHandlers];
