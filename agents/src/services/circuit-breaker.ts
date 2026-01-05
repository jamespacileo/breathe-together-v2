/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures by tracking errors and "opening" the circuit
 * when too many failures occur. After a cooldown period, the circuit
 * enters "half-open" state to test if the service has recovered.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting recovery (default: 30000) */
  resetTimeout: number;
  /** Number of successful calls to close circuit in half-open state (default: 2) */
  successThreshold: number;
  /** Optional name for logging */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  totalCalls: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalCalls = 0;
  private totalFailures = 0;

  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 30000,
      successThreshold: options.successThreshold ?? 2,
      name: options.name ?? 'default',
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      if (this.shouldAttemptRecovery()) {
        this.state = 'half-open';
        this.successes = 0;
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker [${this.options.name}] is open`,
          this.getStats(),
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if circuit allows requests
   */
  isAllowed(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'half-open') return true;
    if (this.state === 'open' && this.shouldAttemptRecovery()) {
      this.state = 'half-open';
      this.successes = 0;
      return true;
    }
    return false;
  }

  /**
   * Get current circuit state and statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : undefined,
      lastSuccess: this.lastSuccessTime ? new Date(this.lastSuccessTime) : undefined,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Force the circuit open (useful for maintenance)
   */
  trip(): void {
    this.state = 'open';
    this.lastFailureTime = Date.now();
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  private onSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Any failure in half-open state reopens the circuit
      this.state = 'open';
    } else if (this.state === 'closed') {
      if (this.failures >= this.options.failureThreshold) {
        this.state = 'open';
      }
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly stats: CircuitBreakerStats,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Create a circuit breaker with service-specific defaults
 */
export function createCircuitBreaker(
  name: string,
  options: Partial<CircuitBreakerOptions> = {},
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    ...options,
  });
}
