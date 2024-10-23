import { toString } from '.';

/**
 * @name isFunction
 * @category Types
 * @description Check if a value is an array
 * 
 * @param {any} value
 * @returns {value is any[]}
 * 
 * @since 0.0.2
 */
export const isArray = (value: any): value is any[] => Array.isArray(value);

/**
 * @name isObject
 * @category Types
 * @description Check if a value is an object
 * 
 * @param {any} value
 * @returns {value is object}
 * 
 * @since 0.0.2
 */
export const isObject = (value: any): value is object => toString(value) === '[object Object]';

/**
 * @name isRegExp
 * @category Types
 * @description Check if a value is a regexp
 *
 * @param {any} value
 * @returns {value is RegExp}
 * 
 * @since 0.0.2
 */
export const isRegExp = (value: any): value is RegExp => toString(value) === '[object RegExp]';

/**
 * @name isDate
 * @category Types
 * @description Check if a value is a date
 *
 * @param {any} value
 * @returns {value is Date}
 * 
 * @since 0.0.2
 */
export const isDate = (value: any): value is Date => toString(value) === '[object Date]';

/**
 * @name isError
 * @category Types
 * @description Check if a value is an error
 * 
 * @param {any} value
 * @returns {value is Error}
 * 
 * @since 0.0.2
 */
export const isError = (value: any): value is Error => toString(value) === '[object Error]';

/**
 * @name isPromise
 * @category Types
 * @description Check if a value is a promise
 * 
 * @param {any} value
 * @returns {value is Promise<any>}
 * 
 * @since 0.0.2
 */
export const isPromise = (value: any): value is Promise<any> => toString(value) === '[object Promise]';

/**
 * @name isMap
 * @category Types
 * @description Check if a value is a map
 * 
 * @param {any} value
 * @returns {value is Map<any, any>}
 * 
 * @since 0.0.2
 */
export const isMap = (value: any): value is Map<any, any> => toString(value) === '[object Map]';

/**
 * @name isSet
 * @category Types
 * @description Check if a value is a set
 * 
 * @param {any} value
 * @returns {value is Set<any>}
 * 
 * @since 0.0.2
 */
export const isSet = (value: any): value is Set<any> => toString(value) === '[object Set]';

/**
 * @name isWeakMap
 * @category Types
 * @description Check if a value is a weakmap
 * 
 * @param {any} value
 * @returns {value is WeakMap<object, any>}
 * 
 * @since 0.0.2
 */
export const isWeakMap = (value: any): value is WeakMap<object, any> => toString(value) === '[object WeakMap]';

/**
 * @name isWeakSet
 * @category Types
 * @description Check if a value is a weakset
 * 
 * @param {any} value
 * @returns {value is WeakSet<object>}
 * 
 * @since 0.0.2
 */
export const isWeakSet = (value: any): value is WeakSet<object> => toString(value) === '[object WeakSet]';
