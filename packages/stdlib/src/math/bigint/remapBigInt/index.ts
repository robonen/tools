import { clampBigInt } from '../clampBigInt';
import {inverseLerpBigInt, lerpBigInt} from '../lerpBigInt';

/**
 * Map a bigint value from one range to another
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

  return lerpBigInt(out_min, out_max, inverseLerpBigInt(in_min, in_max, clampedValue));
}