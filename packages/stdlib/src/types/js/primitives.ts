import { toString } from '.';

/**
 * Check if a value is a boolean.
 * 
 * @param {any} value
 * @returns {value is boolean}
 */
export const isBoolean = (value: any): value is boolean => typeof value === 'boolean';

/**
 * Check if a value is a function.
 * 
 * @param {any} value
 * @returns {value is Function}
 */
export const isFunction = <T extends Function>(value: any): value is T => typeof value === 'function';

/**
 * Check if a value is a number.
 * 
 * @param {any} value
 * @returns {value is number}
 */
export const isNumber = (value: any): value is number => typeof value === 'number';

/**
 * Check if a value is a bigint.
 * 
 * @param {any} value
 * @returns {value is bigint}
 */
export const isBigInt = (value: any): value is bigint => typeof value === 'bigint';

/**
 * Check if a value is a string.
 * 
 * @param {any} value
 * @returns {value is string}
 */
export const isString = (value: any): value is string => typeof value === 'string';

/**
 * Check if a value is a symbol.
 * 
 * @param {any} value
 * @returns {value is symbol}
 */
export const isSymbol = (value: any): value is symbol => typeof value === 'symbol';

/**
 * Check if a value is a undefined.
 * 
 * @param {any} value
 * @returns {value is undefined}
 */
export const isUndefined = (value: any): value is undefined => toString(value) === '[object Undefined]';

/**
 * Check if a value is a null.
 * 
 * @param {any} value
 * @returns {value is null}
 */
export const isNull = (value: any): value is null => toString(value) === '[object Null]';
