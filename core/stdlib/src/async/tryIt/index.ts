import { isPromise } from '../../types';

export type TryItReturn<Return> = Return extends Promise<any>
  ? Promise<{ error: Error; data: undefined } | { error: undefined; data: Awaited<Return> }>
  : { error: Error; data: undefined } | { error: undefined; data: Return };

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
 * const { error, data } = await wrappedFetch('https://jsonplaceholder.typicode.com/todos/1');
 * 
 * @example
 * const { error, data } = await tryIt(fetch)('https://jsonplaceholder.typicode.com/todos/1');
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
          .then((value) => ({ error: undefined, data: value }))
          .catch((error) => ({ error, data: undefined })) as TryItReturn<Return>;

      return { error: undefined, data: result } as TryItReturn<Return>;
    } catch (error) {
      return { error, data: undefined } as TryItReturn<Return>;
    }
  };
}
