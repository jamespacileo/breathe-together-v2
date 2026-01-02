/**
 * Development mode configuration
 *
 * Controls visibility of developer tools like the Leva control panel.
 *
 * TODO: Make this configurable via environment variable in build process.
 * When ready, replace hardcoded value with:
 *   export const DEV_MODE_ENABLED = import.meta.env.VITE_DEV_MODE === 'true';
 *
 * Then add to .env.development:
 *   VITE_DEV_MODE=true
 *
 * And ensure production builds have it false or undefined.
 */
export const DEV_MODE_ENABLED = true;
