import Denque from "denque";

/**
 * Represents a request for a semaphore.
 * @template T The type of resource being requested.
 */
type SemaphoreRequest<T> = {
  /** Resolve function for the promise. */
  resolve: (value: T) => void;
  /** Reject function for the promise. */
  reject: () => void;
};

/**
 * Initialization options for the Semaphore class.
 * @template T The type of resource.
 */
export type SemaphoreInitOptions<T> = {
  /** The number of permits available for the semaphore. */
  permits: number;
  /** Function returning the resource associated with a permit. */
  resource: () => T;
};

/**
 * Options for handling resources when dropping the semaphore.
 *
 * The options can be of two types:
 * 1. Synchronous: Where `fn` is a synchronous function that takes a resource and processes it.
 * 2. Asynchronous: Where `fn` is an asynchronous function that returns a Promise after processing the resource.
 *
 * These options are optional. If not provided during the drop operation, the resources won't be processed,
 * but they will still be acquired to clear the semaphore.
 *
 * @template T The type of resource.
 */
export type SemaphoreDropOptions<T> =
  | {
      /** The function to process each resource. This function should be synchronous. */
      fn: (value: T) => void;
      /** Indicates whether the provided function is asynchronous. Should be false for synchronous functions. */
      async: false;
    }
  | {
      /** The function to process each resource. This function should be asynchronous and return a Promise. */
      fn: (value: T) => Promise<void>;
      /** Indicates whether the provided function is asynchronous. Should be true for asynchronous functions. */
      async: true;
    };

/**
 * A dummy resource that signifies the absence of a specific resource.
 * Useful for situations where only the permit count matters and not the resource itself.
 */
export const voidResource = (): void => {};

/**
 * The Semaphore class is a mechanism that regulates access to a finite set of resources.
 * It's particularly useful in scenarios where you need to limit concurrent access to
 * a given set of resources or operations.
 * @template T The type of resource.
 */
export class Semaphore<T> {
  /** The total number of permits available for this semaphore. */
  public readonly permits: number;
  /** Indicates whether the semaphore is closed and no longer accepting resource requests. */
  public closed: boolean;

  /** Queue of available resources. When the queue is empty, no resources are available. */
  private resources: Denque<T>;
  /** Queue of pending requests. Each request waits for a resource to be available. */
  private requests: Denque<SemaphoreRequest<T>>;

  /**
   * Initializes the semaphore with a certain number of resources (permits).
   * The resources can be of any type, including simple permits or complex structures.
   * @param {SemaphoreInitOptions<T>} options Configuration options for the semaphore.
   */
  constructor({ permits, resource }: SemaphoreInitOptions<T>) {
    this.permits = permits;
    this.closed = false;

    // Initialize the resource pool with the given number of resources.
    this.resources = new Denque(
      Array(permits)
        .fill(null)
        .map(() => resource())
    );

    // Initialize the request queue to manage incoming acquisition requests.
    this.requests = new Denque();
  }

  /**
   * Attempts to fulfill a pending request by assigning it a resource.
   * It checks the request queue and the resource pool to match a request with an available resource.
   * @returns {boolean} True if a resource was assigned to a request; otherwise, false.
   * @private
   */
  private _fulfill(): void {
    if (!this.requests.length || !this.resources.length) {
      return;
    }

    const { resolve } = this.requests.shift()!;
    const resource = this.resources.shift()!;

    resolve(resource);
  }

  /**
   * Requests a resource. If a resource is immediately available, it's returned.
   * Otherwise, the request is queued and will be fulfilled when a resource becomes available.
   * @returns {Promise<T>} A promise resolving with the requested resource.
   */
  acquire(): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error("`Semaphore` is closed"));
    }

    if (this.resources.length) {
      return Promise.resolve(this.resources.shift()!);
    }

    return new Promise((resolve, reject) =>
      this.requests.push({ resolve, reject })
    );
  }

  /**
   * Returns a previously acquired resource back to the pool.
   * This might lead to the fulfillment of a pending request if any exist.
   * @param {T} value The resource to be returned.
   */
  release(value: T): void {
    this.resources.push(value);
    this._fulfill();
  }

  /**
   * Clears the queue of pending requests without fulfilling them.
   * All waiting promises will be rejected. Useful for scenarios where waiting requests
   * should be canceled, e.g., when shutting down or resetting.
   */
  flush(): void {
    while (this.requests.length) {
      const { reject } = this.requests.shift()!;
      reject();
    }
  }

  /**
   * Closes the semaphore, preventing any further resource acquisitions.
   * Optionally handles all the resources currently in the semaphore, if the `options` are provided.
   *
   * @param {SemaphoreDropOptions<T>} [options] Optional configuration for handling the resources.
   * @returns {Promise<void>} A promise that resolves when all resources have been handled.
   */
  async drop(options?: SemaphoreDropOptions<T>): Promise<void> {
    // Reject all pending resource requests.
    this.flush();

    // Mark the semaphore as closed.
    this.closed = true;

    // Acquire all the available resources and handle them based on the provided function.
    const promise = Promise.all(
      Array(this.permits).fill(null).map(this.acquire)
    );

    if (options) {
      const resources = await promise;
      await (options.async
        ? // If the provided function is asynchronous, handle the resources asynchronously.
          Promise.all(resources.map(options.fn))
        : // If the provided function is synchronous, handle the resources synchronously.
          Promise.resolve(resources.map(options.fn)));
    } else {
      await promise;
    }
  }
}
