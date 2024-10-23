/**
 * @name lerp
 * @category Math
 * @description Linearly interpolates between two values
 *
 * @param {number} start The start value
 * @param {number} end The end value
 * @param {number} t The interpolation value
 * @returns {number} The interpolated value
 *
 * @since 0.0.2
 */
export function lerp(start: number, end: number, t: number) {
  return start + t * (end - start);
}

/**
 * @name inverseLerp
 * @category Math
 * @description Inverse linear interpolation between two values
 *
 * @param {number} start The start value
 * @param {number} end The end value
 * @param {number} value The value to interpolate
 * @returns {number} The interpolated value
 *
 * @since 0.0.2
 */
export function inverseLerp(start: number, end: number, value: number) {
  return start === end ? 0 : (value - start) / (end - start);
}
