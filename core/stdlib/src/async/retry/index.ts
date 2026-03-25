import { tryIt } from '../tryIt';
import { sleep } from '../sleep';
import { isFunction } from '../../types';

export interface RetryOptions {
  times?: number;
  delay?: number | ((count: number) => number);
  shouldRetry?: (error: Error, count: number) => boolean;
}

export type RetryFunction<Return> = (
  args: {
    count: number;
    stop: (error: any) => void;
  },
) => Promise<Return>;

class RetryEarlyExitError {
  cause: any;
  constructor(cause: any) {
    this.cause = cause;
  }
}

/**
 * @name retry
 * @category Async
 * @description Retries a function a specified number of times with a delay between each retry
 *
 * @param {Promise<unknown>} fn - The function to retry
 * @param {RetryOptions} options - The options for the retry
 * @returns {Promise<unknown>} - The result of the function
 *
 * @example
 * const result = await retry(() => {
 *  return fetch('https://jsonplaceholder.typicode.com/todos/1')
 *   .then(response => response.json())
 * });
 *
 * @example
 * const result = await retry(() => {
 *  return fetch('https://jsonplaceholder.typicode.com/todos/1')
 *    .then(response => response.json())
 * }, { times: 3, delay: 1000 });
 *
 * @since 0.0.8
 */
export async function retry<Return>(
  fn: RetryFunction<Return>,
  options: RetryOptions = {},
): Promise<Return> {
  const {
    times = 2,
    delay = 0,
    shouldRetry,
  } = options;

  const wrappedFn = tryIt(fn);
  const delayFn = isFunction(delay) ? delay : null;
  const delayMs = delayFn ? 0 : delay as number;

  const stop = (error?: any): never => {
    throw new RetryEarlyExitError(error);
  };

  let lastError: Error | null = null;
  let count = 1;

  while (count <= times) {
    const { error, data } = await wrappedFn({ count, stop });

    if (!error)
      return data;

    if (error instanceof RetryEarlyExitError)
      throw error.cause;

    if (shouldRetry && !shouldRetry(error, count))
      throw error;

    lastError = error;
    count++;

    // Don't delay after the last attempt
    if (count <= times) {
      const ms = delayFn ? delayFn(count) : delayMs;

      if (ms > 0)
        await sleep(ms);
    }
  }

  throw lastError!;
}
