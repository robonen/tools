export class CancelledError extends Error {
  constructor(reason?: string) {
    super(reason ?? 'Promise was cancelled');
    this.name = 'CancelledError';
  }
}

export interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: (reason?: string) => void;
}

/**
 * @name cancellablePromise
 * @category Async
 * @description Wraps a promise with a cancel capability, allowing the promise to be rejected with a CancelledError
 * 
 * @param {Promise<T>} promise - The promise to make cancellable
 * @returns {CancellablePromise<T>} - An object with the wrapped promise and a cancel function
 * 
 * @example
 * const { promise, cancel } = cancellablePromise(fetch('/api/data'));
 * cancel(); // Rejects with CancelledError
 * 
 * @example
 * const { promise, cancel } = cancellablePromise(longRunningTask());
 * setTimeout(() => cancel('Timeout'), 5000);
 * const [error] = await tryIt(() => promise)();
 * 
 * @since 0.0.10
 */
export function cancellablePromise<T>(promise: Promise<T>): CancellablePromise<T> {
  let rejectPromise: (reason: CancelledError) => void;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject;

    promise.then(resolve, reject);
  });

  const cancel = (reason?: string) => {
    rejectPromise(new CancelledError(reason));
  };

  return {
    promise: wrappedPromise,
    cancel,
  };
}
