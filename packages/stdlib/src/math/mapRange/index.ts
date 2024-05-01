import { clamp } from '../clamp';

/**
 * Map a value from one range to another
 * 
 * @param {number} value The value to map
 * @param {number} in_min The minimum value of the input range
 * @param {number} in_max The maximum value of the input range
 * @param {number} out_min The minimum value of the output range
 * @param {number} out_max The maximum value of the output range
 * @returns {number} The mapped value
 */
export function mapRange(value: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
  // Zero input range means invalid input, so return lowest output range value
  if (in_min === in_max)
    return out_min;
  
  // To ensure the value is within the input range, clamp it
  const clampedValue = clamp(value, in_min, in_max);

  // Finally, map the value from the input range to the output range
  return (clampedValue - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}