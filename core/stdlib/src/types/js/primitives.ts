/**
 * @name isObject
 * @category Types
 * @description Check if a value is a boolean
 *
 * @param {unknown} value
 * @returns {value is boolean}
 *
 * @since 0.0.2
 */
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * @name isFunction
 * @category Types
 * @description Check if a value is a function
 *
 * @param {unknown} value
 * @returns {value is Function}
 *
 * @since 0.0.2
 */
// `(...args: any[]) => any` is the idiomatic "any function" constraint here; `unknown` would reject legitimate function shapes at call sites.
export const isFunction = <T extends (...args: any[]) => any>(value: unknown): value is T => typeof value === 'function';

/**
 * @name isNumber
 * @category Types
 * @description Check if a value is a number
 *
 * @param {unknown} value
 * @returns {value is number}
 *
 * @since 0.0.2
 */
export const isNumber = (value: unknown): value is number => typeof value === 'number';

/**
 * @name isBigInt
 * @category Types
 * @description Check if a value is a bigint
 *
 * @param {unknown} value
 * @returns {value is bigint}
 *
 * @since 0.0.2
 */
export const isBigInt = (value: unknown): value is bigint => typeof value === 'bigint';

/**
 * @name isString
 * @category Types
 * @description Check if a value is a string
 *
 * @param {unknown} value
 * @returns {value is string}
 *
 * @since 0.0.2
 */
export const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * @name isSymbol
 * @category Types
 * @description Check if a value is a symbol
 *
 * @param {unknown} value
 * @returns {value is symbol}
 *
 * @since 0.0.2
 */
export const isSymbol = (value: unknown): value is symbol => typeof value === 'symbol';

/**
 * @name isUndefined
 * @category Types
 * @description Check if a value is a undefined
 *
 * @param {unknown} value
 * @returns {value is undefined}
 *
 * @since 0.0.2
 */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

/**
 * @name isNull
 * @category Types
 * @description Check if a value is a null
 *
 * @param {unknown} value
 * @returns {value is null}
 *
 * @since 0.0.2
 */
export const isNull = (value: unknown): value is null => value === null;
