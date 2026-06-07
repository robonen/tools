import type { AnyFunction } from '../../types';

/**
 * @name compose
 * @category Functions
 * @description Composes functions right-to-left: `compose(f, g)(x)` is `f(g(x))`
 *
 * @param {...Function} fns - The functions to compose; the last may take any number of arguments
 * @returns {Function} A function that runs the input through every function from last to first
 *
 * @example
 * const calc = compose((n: number) => `= ${n}`, (n: number) => n * 2, (n: number) => n + 1);
 * calc(3); // '= 8'
 *
 * @since 0.0.10
 */
export function compose<A extends any[], B>(ab: (...a: A) => B): (...a: A) => B;
export function compose<A extends any[], B, C>(bc: (b: B) => C, ab: (...a: A) => B): (...a: A) => C;
export function compose<A extends any[], B, C, D>(cd: (c: C) => D, bc: (b: B) => C, ab: (...a: A) => B): (...a: A) => D;
export function compose<A extends any[], B, C, D, E>(de: (d: D) => E, cd: (c: C) => D, bc: (b: B) => C, ab: (...a: A) => B): (...a: A) => E;
export function compose<A extends any[], B, C, D, E, F>(ef: (e: E) => F, de: (d: D) => E, cd: (c: C) => D, bc: (b: B) => C, ab: (...a: A) => B): (...a: A) => F;
export function compose<A extends any[], B, C, D, E, F, G>(fg: (f: F) => G, ef: (e: E) => F, de: (d: D) => E, cd: (c: C) => D, bc: (b: B) => C, ab: (...a: A) => B): (...a: A) => G;
export function compose<A extends any[], B, C, D, E, F, G, H>(gh: (g: G) => H, fg: (f: F) => G, ef: (e: E) => F, de: (d: D) => E, cd: (c: C) => D, bc: (b: B) => C, ab: (...a: A) => B): (...a: A) => H;
export function compose(...fns: AnyFunction[]): AnyFunction {
  return function (this: unknown, ...args: any[]) {
    const last = fns.length - 1;

    if (last < 0)
      return args[0];

    let result = fns[last]!.apply(this, args);

    for (let i = last - 1; i >= 0; i--)
      result = fns[i]!.call(this, result);

    return result;
  };
}
