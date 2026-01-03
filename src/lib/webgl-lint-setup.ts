/**
 * WebGL Lint - Development-only WebGL API validation
 *
 * Wraps WebGL context to detect common errors and provide helpful warnings.
 * Only enabled in development mode to avoid performance overhead in production.
 *
 * Features:
 * - Detects WebGL context loss
 * - Validates WebGL state management
 * - Checks for common API misuse
 * - Provides performance warnings
 *
 * Usage: Import this file in app.tsx or main.tsx during development
 */

if (import.meta.env.DEV) {
  // Dynamically import webgl-lint only in development
  // webgl-lint works via side effects - importing it wraps WebGL contexts
  import('webgl-lint')
    .then(() => {
      console.log('[WebGL Lint] Enabled - Monitoring WebGL API usage');
    })
    .catch((error) => {
      console.warn('[WebGL Lint] Failed to load:', error);
    });
}

export {};
