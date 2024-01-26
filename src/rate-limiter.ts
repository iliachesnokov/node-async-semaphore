import { Semaphore, voidResource } from "./semaphore";

/**
 * Initialization options for the SimpleRateLimiter class.
 */
export type SimpleRateLimiterInitOptions = {
  /** The number of requests allowed in the specified interval. */
  requests: number;
  /** The time interval (in milliseconds) in which the specified number of requests are allowed. */
  interval: number;
  /** Used to determine delay. If set, delay is spread evenly across requests, otherwise delay is after all requests. */
  uniformDistribution: boolean;
};

/**
 * A simple rate limiter based on the Semaphore pattern.
 * It ensures that only a certain number of requests are made in a given interval.
 */
export class SimpleRateLimiter {
  /** Semaphore instance used to manage requests. */
  private semaphore: Semaphore<void>;
  /** The delay (in milliseconds) between releasing resources. */
  private delay: number;

  /**
   * Creates a new SimpleRateLimiter.
   * @param {SimpleRateLimiterInitOptions} options The initialization options.
   */
  constructor(options: SimpleRateLimiterInitOptions) {
    // Determine the number of permits based on whether the distribution is uniform or not
    const permits = options.uniformDistribution ? 1 : options.requests;

    // Initialize the semaphore with the calculated permits
    this.semaphore = new Semaphore({
      permits,
      resource: voidResource,
    });

    // Calculate the delay based on whether the distribution is uniform or not
    this.delay = options.uniformDistribution
      ? options.interval / options.requests
      : options.interval;
  }

  /**
   * Acquires permission to make a request.
   * If the rate limit is exceeded, it will delay the next request.
   * @returns {Promise<void>} A promise that resolves once permission is acquired.
   */
  acquire(): Promise<void> {
    return this.semaphore.acquire().then(() => {
      // Set a timer to release the resource after the delay, allowing another request
      setTimeout(() => this.semaphore.release(), this.delay);
    });
  }
}
