/**
 * Like `Math.min` but for BigInts
 *
 * @param {...bigint} values The values to compare
 * @returns {bigint} The smallest value
 * @throws {TypeError} If no arguments are provided
 *
 * @since 0.0.2
 */
export function minBigInt(...values: bigint[]) {
  if (!values.length)
    throw new TypeError('minBigInt requires at least one argument');

  return values.reduce((acc, val) => val < acc ? val : acc);
}
