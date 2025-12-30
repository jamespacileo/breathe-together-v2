/**
 * Development-only logging utilities
 *
 * All log functions are no-ops in production builds.
 * Use these instead of direct console calls for consistent logging behavior.
 */

/**
 * Log a warning message (development only)
 * @param message - Warning message
 * @param args - Additional arguments to log
 */
export function warn(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(message, ...args);
  }
}

/**
 * Log an error message (development only)
 * @param message - Error message
 * @param args - Additional arguments to log
 */
export function error(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error(message, ...args);
  }
}

/**
 * Log an info message (development only)
 * @param message - Info message
 * @param args - Additional arguments to log
 */
export function info(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
}

/**
 * Log a debug message (development only)
 * @param message - Debug message
 * @param args - Additional arguments to log
 */
export function debug(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(message, ...args);
  }
}
