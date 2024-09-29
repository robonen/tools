/**
 * Trim leading and trailing whitespace from `S`
 */
export type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S extends `${infer L} ` ? Trim<L> : S;

/**
 * Check if `S` has any spaces
 */
export type HasSpaces<S extends string> = S extends `${string} ${string}` ? true : false;
