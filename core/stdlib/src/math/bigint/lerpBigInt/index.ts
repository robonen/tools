/**
 * Precision scale for bigint interpolation (6 decimal places).
 * BigInt has no overflow, so higher precision is free.
 */
const SCALE = 1_000_000;
const SCALE_N = BigInt(SCALE);

/**
 * @name lerpBigInt
 * @category Math
 * @description Linearly interpolates between bigint values
 *
 * @param {bigint} start The start value
 * @param {bigint} end The end value
 * @param {number} t The interpolation value
 * @returns {bigint} The interpolated value
 *
 * @since 0.0.2
 */
export function lerpBigInt(start: bigint, end: bigint, t: number) {
  return start + ((end - start) * BigInt(Math.round(t * SCALE))) / SCALE_N;
}

/**
 * @name inverseLerpBigInt
 * @category Math
 * @description Inverse linear interpolation between two bigint values
 *
 * @param {bigint} start The start value
 * @param {bigint} end The end value
 * @param {bigint} value The value to interpolate
 * @returns {number} The interpolated value
 *
 * @since 0.0.2
 */
export function inverseLerpBigInt(start: bigint, end: bigint, value: bigint) {
  return start === end ? 0 : Number((value - start) * SCALE_N / (end - start)) / SCALE;
}
