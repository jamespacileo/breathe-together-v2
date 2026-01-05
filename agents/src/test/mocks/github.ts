/**
 * MSW Handlers for GitHub API
 *
 * Re-exports from the service mocks for backward compatibility.
 * New tests should import from `./services` instead.
 *
 * @deprecated Use `import { serviceServer, GITHUB_URLS } from './services'` instead
 */

import { GITHUB_URLS, serviceServer } from './services';

// Re-export the consolidated service server for backward compatibility
export const server = serviceServer;

// URL constant for backward compatibility
export const GITHUB_API_URL = GITHUB_URLS.repo();
