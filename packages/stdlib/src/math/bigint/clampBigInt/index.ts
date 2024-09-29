import {minBigInt} from '../minBigInt';
import {maxBigInt} from '../maxBigInt';

/**
 * Clamps a bigint between a minimum and maximum value
 *
 * @param {bigint} value The number to clamp
 * @param {bigint} min Minimum value
 * @param {bigint} max Maximum value
 * @returns {bigint} The clamped number
 *
 * @since 0.0.2
 */
export function clampBigInt(value: bigint, min: bigint, max: bigint) {
  return minBigInt(maxBigInt(value, min), max);
}
