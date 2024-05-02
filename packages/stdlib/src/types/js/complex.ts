import { toString } from '.';

/**
 * Check if a value is an array.
 * 
 * @param {any} value
 * @returns {value is any[]}
 */
export const isArray = (value: any): value is any[] => Array.isArray(value);

/**
 * Check if a value is an object.
 * 
 * @param {any} value
 * @returns {value is object}
 */
export const isObject = (value: any): value is object => toString(value) === '[object Object]';

/**
 * Check if a value is a regexp.
 *
 * @param {any} value
 * @returns {value is RegExp}
 */
export const isRegExp = (value: any): value is RegExp => toString(value) === '[object RegExp]';

/**
 * Check if a value is a date.
 *
 * @param {any} value
 * @returns {value is Date}
 */
export const isDate = (value: any): value is Date => toString(value) === '[object Date]';

/**
 * Check if a value is an error.
 * 
 * @param {any} value
 * @returns {value is Error}
 */
export const isError = (value: any): value is Error => toString(value) === '[object Error]';

/**
 * Check if a value is a promise.
 * 
 * @param {any} value
 * @returns {value is Promise<any>}
 */
export const isPromise = (value: any): value is Promise<any> => toString(value) === '[object Promise]';

/**
 * Check if a value is a map.
 * 
 * @param {any} value
 * @returns {value is Map<any, any>}
 */
export const isMap = (value: any): value is Map<any, any> => toString(value) === '[object Map]';

/**
 * Check if a value is a set.
 * 
 * @param {any} value
 * @returns {value is Set<any>}
 */
export const isSet = (value: any): value is Set<any> => toString(value) === '[object Set]';

/**
 * Check if a value is a weakmap.
 * 
 * @param {any} value
 * @returns {value is WeakMap<object, any>}
 */
export const isWeakMap = (value: any): value is WeakMap<object, any> => toString(value) === '[object WeakMap]';

/**
 * Check if a value is a weakset.
 * 
 * @param {any} value
 * @returns {value is WeakSet<object>}
 */
export const isWeakSet = (value: any): value is WeakSet<object> => toString(value) === '[object WeakSet]';
