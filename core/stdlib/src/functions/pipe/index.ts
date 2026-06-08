import type { AnyFunction } from '../../types';

/**
 * @name pipe
 * @category Functions
 * @description Composes functions left-to-right: `pipe(f, g)(x)` is `g(f(x))`
 *
 * @param {...Function} fns - The functions to pipe; the first may take any number of arguments
 * @returns {Function} A function that runs the input through every function in order
 *
 * @example
 * const calc = pipe((n: number) => n + 1, n => n * 2, n => `= ${n}`);
 * calc(3); // '= 8'
 *
 * @since 0.0.10
 */
export function pipe<A extends any[], B>(ab: (...a: A) => B): (...a: A) => B;
export function pipe<A extends any[], B, C>(ab: (...a: A) => B, bc: (b: B) => C): (...a: A) => C;
export function pipe<A extends any[], B, C, D>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (...a: A) => D;
export function pipe<A extends any[], B, C, D, E>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): (...a: A) => E;
export function pipe<A extends any[], B, C, D, E, F>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): (...a: A) => F;
export function pipe<A extends any[], B, C, D, E, F, G>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): (...a: A) => G;
export function pipe<A extends any[], B, C, D, E, F, G, H>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): (...a: A) => H;
export function pipe(...fns: AnyFunction[]): AnyFunction {
  return function (this: unknown, ...args: any[]) {
    if (fns.length === 0)
      return args[0];

    let result = fns[0]!.apply(this, args);

    for (let i = 1; i < fns.length; i++)
      result = fns[i]!.call(this, result);

    return result;
  };
}
