export interface RetryOptions {
  times?: number;
  delay?: number;
  backoff: (options: RetryOptions & { count: number }) => number;
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
 */
export async function retry<Return>(
  fn: () => Promise<Return>,
  options: RetryOptions
) {
  const {
    times = 3,
  } = options;

  let count = 0;
}
