import { isPromise } from '../../types';

export type TryItReturn<Return> = Return extends Promise<any>
  ? Promise<[Error, undefined] | [undefined, Awaited<Return>]>
  : [Error, undefined] | [undefined, Return];

/**
 * @name tryIt
 * @category Async
 * @description Wraps promise-based code in a try/catch block without forking the control flow
 * 
 * @param {Function} fn - The function to try
 * @returns {Function} - The function that will return a tuple with the error and the result
 * 
 * @example
 * const wrappedFetch = tryIt(fetch);
 * const [error, result] = await wrappedFetch('https://jsonplaceholder.typicode.com/todos/1');
 * 
 * @example
 * const [error, result] = await tryIt(fetch)('https://jsonplaceholder.typicode.com/todos/1');
 * 
 * @since 0.0.3
 */
export function tryIt<Args extends any[], Return>(
  fn: (...args: Args) => Return,
) {
  return (...args: Args): TryItReturn<Return> => {
    try {
      const result = fn(...args);

      if (isPromise(result))
        return result
          .then((value) => [undefined, value])
          .catch((error) => [error, undefined]) as TryItReturn<Return>;

      return [undefined, result] as TryItReturn<Return>;
    } catch (error) {
      return [error, undefined] as TryItReturn<Return>;
    }
  };
}
