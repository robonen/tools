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

const RetryEarlyExit = Symbol('RetryEarlyExit');

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

  let count = 1;
  let lastError: Error = new Error('Retry failed');

  while (count <= times) {
    const metadata = {
      count,
      stop: (error?: any) => {
        throw { [RetryEarlyExit]: error };
      },
    };

    const { error, data } = await tryIt(fn)(metadata);

    if (!error)
      return data;

    if (RetryEarlyExit in error)
      throw error[RetryEarlyExit];

    if (shouldRetry && !shouldRetry(error, count))
      throw error;

    lastError = error;
    count++;

    // Don't delay after the last attempt
    if (count <= times) {
      const delayMs = isFunction(delay) ? delay(count) : delay;
      
      if (delayMs > 0)
        await sleep(delayMs);
    }
  }

  throw lastError;
}
