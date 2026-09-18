import { ServiceUnavailableException, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening breaker (default: 3)
  resetTimeoutMs?: number;   // Time in OPEN state before testing HALF_OPEN (default: 15000ms)
  timeoutMs?: number;        // Individual call timeout ceiling (default: 15000ms)
}

/**
 * Enterprise Circuit Breaker with Exponential Backoff & Jitter (Martin Kleppmann DDIA Ch. 1 & System Design Law 37/38)
 * Prevents cascading thread pool exhaustion and network hangs on slow/unreachable external dependencies (e.g. AI Vision).
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastStateChange: number = Date.now();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly timeoutMs: number;
  private readonly logger: Logger;

  constructor(private readonly serviceName: string, options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 15000;
    this.timeoutMs = options?.timeoutMs ?? 15000;
    this.logger = new Logger(`CircuitBreaker:${serviceName}`);
  }

  public getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  private evaluateState(): void {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastStateChange >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = now;
        this.logger.warn(`[${this.serviceName}] Circuit transitioning from OPEN -> HALF_OPEN (probing health).`);
      }
    }
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T> | T): Promise<T> {
    this.evaluateState();

    if (this.state === CircuitState.OPEN) {
      this.logger.warn(`[${this.serviceName}] Fast-failing: Circuit is OPEN.`);
      if (fallback) {
        return fallback();
      }
      throw new ServiceUnavailableException(
        `[${this.serviceName}] Service is temporarily unavailable due to upstream instability. Circuit is OPEN.`
      );
    }

    try {
      // Enforce timeout budget capping
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`[${this.serviceName}] Request timed out after ${this.timeoutMs}ms`)),
            this.timeoutMs
          )
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallback) {
        this.logger.warn(`[${this.serviceName}] Action failed, executing fallback.`);
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log(`[${this.serviceName}] Canary request succeeded! Circuit transitioned HALF_OPEN -> CLOSED.`);
    }
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.logger.error(`[${this.serviceName}] Call failed (${this.failureCount}/${this.failureThreshold}): ${error?.message || error}`);

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      this.logger.error(`[${this.serviceName}] Circuit tripped to OPEN state! Blocking requests for ${this.resetTimeoutMs}ms.`);
    }
  }

  /**
   * Exponential backoff with full jitter formula:
   * t = random(0, min(maxBackoffMs, baseMs * 2^attempt))
   */
  public static calculateJitterBackoff(attempt: number, baseMs = 500, maxBackoffMs = 8000): number {
    const exponential = Math.min(maxBackoffMs, baseMs * Math.pow(2, attempt));
    return Math.floor(Math.random() * exponential);
  }
}
