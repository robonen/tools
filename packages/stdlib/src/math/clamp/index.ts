/**
 * Clamps a number between a minimum and maximum value
 * 
 * @param {number} value The number to clamp
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @returns {number} The clamped number
 */
export function clamp(value: number, min: number, max: number): number {
  // The clamp function takes a value, a minimum, and a maximum as parameters.
  // It ensures that the value falls within the range defined by the minimum and maximum values.
  // If the value is less than the minimum, it returns the minimum value.
  // If the value is greater than the maximum, it returns the maximum value.
  // Otherwise, it returns the original value.
  return Math.min(Math.max(value, min), max);
}
