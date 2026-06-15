/**
 * @name toString
 * @category Types
 * @description To string any value
 *
 * @param {unknown} value
 * @returns {string}
 *
 * @since 0.0.2
 */
export const toString = (value: unknown): string => Object.prototype.toString.call(value);
