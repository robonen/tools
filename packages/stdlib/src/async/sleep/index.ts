/**
 * @name sleep
 * @category Async
 * @description Delays the execution of the current function by the specified amount of time
 * 
 * @param {number} ms - The amount of time to delay the execution of the current function
 * @returns {Promise<void>} - A promise that resolves after the specified amount of time
 * 
 * @example
 * await sleep(1000);
 * 
 * @example
 * sleep(1000).then(() => {
 *  console.log('Hello, World!');
 * });
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}