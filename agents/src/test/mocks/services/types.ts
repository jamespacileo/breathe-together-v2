/**
 * Service Mock Types
 *
 * Common types and utilities for service mocking patterns.
 */

import type { RequestHandler } from 'msw';

/**
 * URL helper type - can be a string or a function that returns a string
 */
// biome-ignore lint/suspicious/noExplicitAny: URL helpers can have varied parameter signatures
export type UrlHelper = string | ((...args: any[]) => string);

/**
 * Service mock module interface
 *
 * Each service mock should export:
 * - handlers: Array of MSW request handlers
 * - scenarios: Pre-configured response scenarios
 * - utils: Helper functions for dynamic mocking
 */
export interface ServiceMockModule<TScenarios extends Record<string, RequestHandler[]>> {
  /** Default handlers for standard API behavior */
  handlers: RequestHandler[];
  /** Named scenarios for specific test cases */
  scenarios: TScenarios;
  /** API URL constants and helper functions */
  urls: Record<string, UrlHelper>;
}

/**
 * Create a service mock module
 */
export function createServiceMock<TScenarios extends Record<string, RequestHandler[]>>(
  module: ServiceMockModule<TScenarios>,
): ServiceMockModule<TScenarios> {
  return module;
}

/**
 * Delay utility for simulating network latency
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
