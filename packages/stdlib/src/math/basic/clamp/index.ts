/**
 * Clamps a number between a minimum and maximum value
 * 
 * @param {number} value The number to clamp
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @returns {number} The clamped number
 *
 * @since 0.0.1
 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
