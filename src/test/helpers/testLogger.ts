/**
 * Test Logger Helper
 *
 * Centralized logging for test diagnostic output.
 * Only outputs when VERBOSE=true environment variable is set.
 *
 * Usage:
 *   VERBOSE=true npm test  // Shows diagnostic output
 *   npm test               // Quiet mode (default)
 */

const isVerbose = process.env.VERBOSE === 'true';

/**
 * Log debug information during tests.
 * Only outputs when VERBOSE=true.
 */
export function debug(...args: unknown[]): void {
  if (isVerbose) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Log a formatted table of metrics.
 * Only outputs when VERBOSE=true.
 */
export function debugTable(label: string, data: Record<string, unknown>): void {
  if (isVerbose) {
    console.log(`\n=== ${label} ===`);
    for (const [key, value] of Object.entries(data)) {
      const formattedValue =
        typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(4)) : value;
      console.log(`  ${key}: ${formattedValue}`);
    }
  }
}

/**
 * Log a section header.
 * Only outputs when VERBOSE=true.
 */
export function debugSection(title: string): void {
  if (isVerbose) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  ${title}`);
    console.log('='.repeat(50));
  }
}

/**
 * Log performance metrics in a consistent format.
 * Only outputs when VERBOSE=true.
 */
export function debugPerformance(
  label: string,
  metrics: {
    time?: number;
    count?: number;
    avgTime?: number;
    [key: string]: unknown;
  },
): void {
  if (isVerbose) {
    const parts = [`[PERF] ${label}:`];
    if (metrics.time !== undefined) parts.push(`${metrics.time.toFixed(2)}ms`);
    if (metrics.count !== undefined) parts.push(`(${metrics.count} items)`);
    if (metrics.avgTime !== undefined) parts.push(`avg: ${metrics.avgTime.toFixed(4)}ms`);

    // Add any custom metrics
    for (const [key, value] of Object.entries(metrics)) {
      if (!['time', 'count', 'avgTime'].includes(key)) {
        parts.push(`${key}: ${value}`);
      }
    }

    console.log(parts.join(' '));
  }
}

/**
 * Log distribution quality metrics.
 * Only outputs when VERBOSE=true.
 */
export function debugDistribution(
  label: string,
  metrics: {
    cv: number;
    minMaxRatio: number;
    meanDistance?: number;
    count?: number;
  },
): void {
  if (isVerbose) {
    const status = metrics.cv < 0.2 ? '✅ GOOD' : metrics.cv < 0.35 ? '⚠️  MODERATE' : '❌ POOR';
    console.log(
      `[DIST] ${label}: ${status} CV=${metrics.cv.toFixed(4)}, min/max=${metrics.minMaxRatio.toFixed(3)}${
        metrics.meanDistance !== undefined ? `, mean=${metrics.meanDistance.toFixed(2)}` : ''
      }${metrics.count !== undefined ? ` (n=${metrics.count})` : ''}`,
    );
  }
}

/**
 * Check if verbose mode is enabled.
 */
export function isVerboseMode(): boolean {
  return isVerbose;
}
