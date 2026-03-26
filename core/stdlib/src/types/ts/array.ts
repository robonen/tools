/**
 * A type that can be either a single value or an array of values
 */
export type Arrayable<T> = T | T[];

/**
 * A type that can be either a single value or a readonly array of values
 */
export type ReadonlyArrayable<T> = T | readonly T[];
