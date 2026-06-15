import { toString } from './casts';

/**
 * @name isFunction
 * @category Types
 * @description Check if a value is an array
 *
 * @param {unknown} value
 * @returns {value is T[]}
 *
 * @since 0.0.2
 */
export const isArray = <T = unknown>(value: unknown): value is T[] => Array.isArray(value);

/**
 * @name isObject
 * @category Types
 * @description Check if a value is an object
 *
 * @param {unknown} value
 * @returns {value is object}
 *
 * @since 0.0.2
 */
export const isObject = (value: unknown): value is object => toString(value) === '[object Object]';

/**
 * @name isRegExp
 * @category Types
 * @description Check if a value is a regexp
 *
 * @param {unknown} value
 * @returns {value is RegExp}
 *
 * @since 0.0.2
 */
export const isRegExp = (value: unknown): value is RegExp => toString(value) === '[object RegExp]';

/**
 * @name isDate
 * @category Types
 * @description Check if a value is a date
 *
 * @param {unknown} value
 * @returns {value is Date}
 *
 * @since 0.0.2
 */
export const isDate = (value: unknown): value is Date => toString(value) === '[object Date]';

/**
 * @name isError
 * @category Types
 * @description Check if a value is an error
 *
 * @param {unknown} value
 * @returns {value is Error}
 *
 * @since 0.0.2
 */
export const isError = (value: unknown): value is Error => toString(value) === '[object Error]';

/**
 * @name isPromise
 * @category Types
 * @description Check if a value is a promise
 *
 * @param {unknown} value
 * @returns {value is Promise<unknown>}
 *
 * @since 0.0.2
 */
export const isPromise = (value: unknown): value is Promise<unknown> => toString(value) === '[object Promise]';

/**
 * @name isMap
 * @category Types
 * @description Check if a value is a map
 *
 * @param {unknown} value
 * @returns {value is Map<unknown, unknown>}
 *
 * @since 0.0.2
 */
export const isMap = (value: unknown): value is Map<unknown, unknown> => toString(value) === '[object Map]';

/**
 * @name isSet
 * @category Types
 * @description Check if a value is a set
 *
 * @param {unknown} value
 * @returns {value is Set<unknown>}
 *
 * @since 0.0.2
 */
export const isSet = (value: unknown): value is Set<unknown> => toString(value) === '[object Set]';

/**
 * @name isWeakMap
 * @category Types
 * @description Check if a value is a weakmap
 *
 * @param {unknown} value
 * @returns {value is WeakMap<object, unknown>}
 *
 * @since 0.0.2
 */
export const isWeakMap = (value: unknown): value is WeakMap<object, unknown> => toString(value) === '[object WeakMap]';

/**
 * @name isWeakSet
 * @category Types
 * @description Check if a value is a weakset
 *
 * @param {unknown} value
 * @returns {value is WeakSet<object>}
 *
 * @since 0.0.2
 */
export const isWeakSet = (value: unknown): value is WeakSet<object> => toString(value) === '[object WeakSet]';
