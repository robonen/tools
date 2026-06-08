/**
 * @name range
 * @category Arrays
 * @description Generates an array of numbers from `start` (inclusive) to `stop` (exclusive)
 *
 * @param {number} startOrStop - The start of the range, or the stop when called with one argument
 * @param {number} [stop] - The end of the range (exclusive)
 * @param {number} [step] - The increment between values; supports negative steps. Default `1`
 * @returns {number[]} The generated range
 *
 * @example
 * range(4) // => [0, 1, 2, 3]
 *
 * @example
 * range(1, 5) // => [1, 2, 3, 4]
 *
 * @example
 * range(0, 10, 2) // => [0, 2, 4, 6, 8]
 *
 * @example
 * range(5, 0, -1) // => [5, 4, 3, 2, 1]
 *
 * @since 0.0.10
 */
export function range(stop: number): number[];
export function range(start: number, stop: number, step?: number): number[];
export function range(startOrStop: number, stop?: number, step = 1): number[] {
  let start = startOrStop;

  if (stop === undefined) {
    start = 0;
    stop = startOrStop;
  }

  if (step === 0)
    return [];

  const length = Math.max(Math.ceil((stop - start) / step), 0);

  return Array.from({ length }, (_, i) => start + i * step);
}
