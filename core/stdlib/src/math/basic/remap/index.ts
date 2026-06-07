import { clamp } from '../clamp';
import { inverseLerp, lerp } from '../lerp';

/**
 * @name remap
 * @category Math
 * @description Map a value from one range to another
 *
 * @param {number} value The value to map
 * @param {number} in_min The minimum value of the input range
 * @param {number} in_max The maximum value of the input range
 * @param {number} out_min The minimum value of the output range
 * @param {number} out_max The maximum value of the output range
 * @returns {number} The mapped value
 *
 * @since 0.0.1
 */
export function remap(value: number, in_min: number, in_max: number, out_min: number, out_max: number) {
  if (in_min === in_max)
    return out_min;

  // Clamp to the interval's actual bounds so a reversed (descending) input range still works;
  // inverseLerp itself handles in_min > in_max correctly.
  const clampedValue = clamp(value, Math.min(in_min, in_max), Math.max(in_min, in_max));

  return lerp(out_min, out_max, inverseLerp(in_min, in_max, clampedValue));
}
