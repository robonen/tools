import { clampBigInt } from '../clampBigInt';

/**
 * @name remapBigInt
 * @category Math
 * @description Map a bigint value from one range to another
 *
 * @param {bigint} value The value to map
 * @param {bigint} in_min The minimum value of the input range
 * @param {bigint} in_max The maximum value of the input range
 * @param {bigint} out_min The minimum value of the output range
 * @param {bigint} out_max The maximum value of the output range
 * @returns {bigint} The mapped value
 *
 * @since 0.0.1
 */
export function remapBigInt(value: bigint, in_min: bigint, in_max: bigint, out_min: bigint, out_max: bigint) {
  if (in_min === in_max)
    return out_min;

  const clampedValue = clampBigInt(value, in_min, in_max);

  // Stay entirely in BigInt — round-tripping through a JS number (as inverseLerpBigInt does)
  // quantizes to ~6 decimals and overflows precision past 2^53, defeating the point of BigInt.
  return out_min + ((clampedValue - in_min) * (out_max - out_min)) / (in_max - in_min);
}
