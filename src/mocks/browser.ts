/**
 * MSW Browser Worker for Development
 *
 * This enables the frontend to work without the real Cloudflare Worker.
 * Activated when VITE_USE_MSW=true or when the worker is unavailable.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * Start MSW in the browser
 * Call this from main.tsx when in development mode
 */
export async function startMSW() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true') {
    console.log('[MSW] Starting mock service worker...');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('[MSW] Mock service worker started');
  }
}
