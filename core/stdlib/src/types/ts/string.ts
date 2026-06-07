/**
 * Stringable type
 */
export interface Stringable {
  toString(): string;
}

/**
 * Whitespace characters recognized by {@link Trim}
 */
export type Whitespace = ' ' | '\t' | '\n' | '\r' | '\f' | '\v';

/**
 * Trim leading and trailing whitespace from `S`
 */
export type Trim<S extends string>
  = S extends `${Whitespace}${infer R}`
    ? Trim<R>
    : S extends `${infer L}${Whitespace}`
      ? Trim<L>
      : S;

/**
 * Check if `S` has any spaces
 */
export type HasSpaces<S extends string> = S extends `${string} ${string}` ? true : false;
