/**
 * @name toString
 * @category Types
 * @description To string any value
 * 
 * @param {any} value
 * @returns {string}
 * 
 * @since 0.0.2
 */
export const toString = (value: any): string => Object.prototype.toString.call(value);