import { clamp } from "../clamp";

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
  if (in_min === in_max)
    return out_min;
  
  return (clamp(value, in_min, in_max) - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}