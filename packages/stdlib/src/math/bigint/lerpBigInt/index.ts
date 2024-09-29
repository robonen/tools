/**
 * Linearly interpolates between bigint values
 *
 * @param {bigint} start The start value
 * @param {bigint} end The end value
 * @param {number} t The interpolation value
 * @returns {bigint} The interpolated value
 *
 * @since 0.0.2
 */
export function lerpBigInt(start: bigint, end: bigint, t: number) {
  return start + ((end - start) * BigInt(t * 10000)) / 10000n;
}

/**
 * Inverse linear interpolation between two bigint values
 *
 * @param {bigint} start The start value
 * @param {bigint} end The end value
 * @param {bigint} value The value to interpolate
 * @returns {number} The interpolated value
 *
 * @since 0.0.2
 */
export function inverseLerpBigInt(start: bigint, end: bigint, value: bigint) {
  return start === end ? 0 : Number((value - start) * 10000n / (end - start)) / 10000;
}