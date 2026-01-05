/**
 * Base Service Class
 *
 * Provides common functionality for all external service integrations:
 * - HTTP client with retry logic (ky)
 * - Rate limiting (bottleneck)
 * - Circuit breaker protection
 * - Request/response logging
 * - Error normalization
 */

import Bottleneck from 'bottleneck';
import ky, { type KyInstance, type Options as KyOptions } from 'ky';
import { CircuitBreaker, CircuitBreakerError, type CircuitBreakerOptions } from './circuit-breaker';

// ============================================================================
// Types
// ============================================================================

export interface ServiceConfig {
  /** Base URL for the service */
  baseUrl: string;
  /** Service name for logging/metrics */
  name: string;
  /** Default timeout in ms (default: 10000) */
  timeout?: number;
  /** Number of retry attempts (default: 2) */
  retries?: number;
  /** Rate limiter options */
  rateLimit?: RateLimitConfig;
  /** Circuit breaker options */
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  /** Default headers for all requests */
  headers?: Record<string, string>;
}

export interface RateLimitConfig {
  /** Max concurrent requests (default: 10) */
  maxConcurrent?: number;
  /** Min time between requests in ms (default: 0) */
  minTime?: number;
  /** Max requests per interval */
  reservoir?: number;
  /** Interval for reservoir in ms */
  reservoirRefreshInterval?: number;
}

export interface ServiceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface ServiceResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  duration: number;
}

export interface ServiceError {
  name: string;
  message: string;
  status?: number;
  code?: string;
  service: string;
  request: {
    method: string;
    url: string;
  };
}

// ============================================================================
// Base Service Class
// ============================================================================

export abstract class BaseService {
  protected readonly client: KyInstance;
  protected readonly limiter: Bottleneck;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly config: Required<ServiceConfig>;

  constructor(config: ServiceConfig) {
    this.config = {
      timeout: 10000,
      retries: 2,
      rateLimit: {},
      circuitBreaker: {},
      headers: {},
      ...config,
    };

    // Initialize HTTP client
    this.client = ky.create({
      prefixUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retry: {
        limit: this.config.retries,
        methods: ['get', 'head', 'options'],
        statusCodes: [408, 429, 500, 502, 503, 504],
      },
      headers: this.config.headers,
      hooks: {
        beforeRequest: [
          (request) => {
            this.onBeforeRequest(request);
          },
        ],
        afterResponse: [
          (request, _options, response) => {
            this.onAfterResponse(request, response);
            return response;
          },
        ],
      },
    });

    // Initialize rate limiter
    const rateLimitConfig = this.config.rateLimit;
    this.limiter = new Bottleneck({
      maxConcurrent: rateLimitConfig.maxConcurrent ?? 10,
      minTime: rateLimitConfig.minTime ?? 0,
      reservoir: rateLimitConfig.reservoir,
      reservoirRefreshInterval: rateLimitConfig.reservoirRefreshInterval,
      reservoirRefreshAmount: rateLimitConfig.reservoir,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name: this.config.name,
      ...this.config.circuitBreaker,
    });
  }

  /**
   * Make a request to the service with all protections applied
   */
  protected async request<T>(req: ServiceRequest): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    const url = this.buildUrl(req.path, req.searchParams);

    // Check circuit breaker before making request
    if (!this.circuitBreaker.isAllowed()) {
      throw new CircuitBreakerError(
        `Circuit breaker [${this.config.name}] is open`,
        this.circuitBreaker.getStats(),
      );
    }

    // Execute with rate limiting and circuit breaker
    return this.limiter.schedule(() =>
      this.circuitBreaker.execute(async () => {
        try {
          const options: KyOptions = {
            method: req.method,
            headers: req.headers,
            timeout: req.timeout ?? this.config.timeout,
          };

          if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            options.json = req.body;
          }

          const response = await this.client(req.path, options);
          const data = (await response.json()) as T;

          return {
            data,
            status: response.status,
            headers: response.headers,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          throw this.normalizeError(error, req.method, url);
        }
      }),
    );
  }

  /**
   * GET request helper
   */
  protected get<T>(
    path: string,
    options: Omit<ServiceRequest, 'method' | 'path' | 'body'> = {},
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ method: 'GET', path, ...options });
  }

  /**
   * POST request helper
   */
  protected post<T>(
    path: string,
    body?: unknown,
    options: Omit<ServiceRequest, 'method' | 'path' | 'body'> = {},
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, ...options });
  }

  /**
   * PUT request helper
   */
  protected put<T>(
    path: string,
    body?: unknown,
    options: Omit<ServiceRequest, 'method' | 'path' | 'body'> = {},
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body, ...options });
  }

  /**
   * DELETE request helper
   */
  protected delete<T>(
    path: string,
    options: Omit<ServiceRequest, 'method' | 'path' | 'body'> = {},
  ): Promise<ServiceResponse<T>> {
    return this.request<T>({ method: 'DELETE', path, ...options });
  }

  /**
   * Build URL with search params
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  /**
   * Normalize errors to consistent format
   */
  private normalizeError(error: unknown, method: string, url: string): ServiceError {
    const base: ServiceError = {
      name: 'ServiceError',
      message: 'Unknown error',
      service: this.config.name,
      request: { method, url },
    };

    if (error instanceof Error) {
      base.name = error.name;
      base.message = error.message;

      // Handle ky HTTPError
      if ('response' in error && error.response instanceof Response) {
        base.status = error.response.status;
      }
    }

    return base;
  }

  /**
   * Hook: Before request (for logging/metrics)
   */
  protected onBeforeRequest(_request: Request): void {
    // Override in subclasses for custom logging
  }

  /**
   * Hook: After response (for logging/metrics)
   */
  protected onAfterResponse(_request: Request, _response: Response): void {
    // Override in subclasses for custom logging
  }

  /**
   * Get service health status
   */
  getHealth(): {
    name: string;
    circuitBreaker: ReturnType<CircuitBreaker['getStats']>;
    rateLimiter: {
      running: number;
      queued: number;
    };
  } {
    const counts = this.limiter.counts();
    return {
      name: this.config.name,
      circuitBreaker: this.circuitBreaker.getStats(),
      rateLimiter: {
        running: counts.RUNNING,
        queued: counts.QUEUED,
      },
    };
  }

  /**
   * Reset circuit breaker (useful for recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

// ============================================================================
// Service Registry
// ============================================================================

const services = new Map<string, BaseService>();

/**
 * Register a service instance
 */
export function registerService(name: string, service: BaseService): void {
  services.set(name, service);
}

/**
 * Get a registered service
 */
export function getService<T extends BaseService>(name: string): T | undefined {
  return services.get(name) as T | undefined;
}

/**
 * Get health status of all registered services
 */
export function getAllServicesHealth(): Array<ReturnType<BaseService['getHealth']>> {
  return Array.from(services.values()).map((service) => service.getHealth());
}
