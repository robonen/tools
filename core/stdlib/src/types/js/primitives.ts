import { toString } from '.';

/**
 * @name isObject
 * @category Types
 * @description Check if a value is a boolean
 * 
 * @param {any} value
 * @returns {value is boolean}
 * 
 * @since 0.0.2
 */
export const isBoolean = (value: any): value is boolean => typeof value === 'boolean';

/**
 * @name isFunction
 * @category Types
 * @description Check if a value is a function
 * 
 * @param {any} value
 * @returns {value is Function}
 * 
 * @since 0.0.2
 */
export const isFunction = <T extends Function>(value: any): value is T => typeof value === 'function';

/**
 * @name isNumber
 * @category Types
 * @description Check if a value is a number
 * 
 * @param {any} value
 * @returns {value is number}
 * 
 * @since 0.0.2
 */
export const isNumber = (value: any): value is number => typeof value === 'number';

/**
 * @name isBigInt
 * @category Types
 * @description Check if a value is a bigint
 * 
 * @param {any} value
 * @returns {value is bigint}
 * 
 * @since 0.0.2
 */
export const isBigInt = (value: any): value is bigint => typeof value === 'bigint';

/**
 * @name isString
 * @category Types
 * @description Check if a value is a string
 * 
 * @param {any} value
 * @returns {value is string}
 * 
 * @since 0.0.2
 */
export const isString = (value: any): value is string => typeof value === 'string';

/**
 * @name isSymbol
 * @category Types
 * @description Check if a value is a symbol
 * 
 * @param {any} value
 * @returns {value is symbol}
 * 
 * @since 0.0.2
 */
export const isSymbol = (value: any): value is symbol => typeof value === 'symbol';

/**
 * @name isUndefined
 * @category Types
 * @description Check if a value is a undefined
 * 
 * @param {any} value
 * @returns {value is undefined}
 * 
 * @since 0.0.2
 */
export const isUndefined = (value: any): value is undefined => toString(value) === '[object Undefined]';

/**
 * @name isNull
 * @category Types
 * @description Check if a value is a null
 * 
 * @param {any} value
 * @returns {value is null}
 * 
 * @since 0.0.2
 */
export const isNull = (value: any): value is null => toString(value) === '[object Null]';
