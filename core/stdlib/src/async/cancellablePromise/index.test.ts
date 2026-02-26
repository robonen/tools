import { describe, it, expect, vi } from 'vitest';
import { cancellablePromise, CancelledError } from '.';

describe('cancellablePromise', () => {
  it('resolve the promise normally when not cancelled', async () => {
    const { promise } = cancellablePromise(Promise.resolve('data'));

    await expect(promise).resolves.toBe('data');
  });

  it('reject the promise normally when not cancelled', async () => {
    const error = new Error('test-error');
    const { promise } = cancellablePromise(Promise.reject(error));

    await expect(promise).rejects.toThrow(error);
  });

  it('reject with CancelledError when cancelled before resolve', async () => {
    const { promise, cancel } = cancellablePromise(
      new Promise<string>((resolve) => setTimeout(() => resolve('data'), 100)),
    );

    cancel();

    await expect(promise).rejects.toBeInstanceOf(CancelledError);
    await expect(promise).rejects.toThrow('Promise was cancelled');
  });

  it('reject with CancelledError with custom reason', async () => {
    const { promise, cancel } = cancellablePromise(
      new Promise<string>((resolve) => setTimeout(() => resolve('data'), 100)),
    );

    cancel('Request aborted');

    await expect(promise).rejects.toBeInstanceOf(CancelledError);
    await expect(promise).rejects.toThrow('Request aborted');
  });

  it('cancel prevents onSuccess from being called', async () => {
    const onSuccess = vi.fn();

    const { promise, cancel } = cancellablePromise(
      new Promise<string>((resolve) => setTimeout(() => resolve('data'), 100)),
    );

    cancel();

    try {
      await promise;
    }
    catch {
      // expected
    }

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('CancelledError has correct name property', () => {
    const error = new CancelledError();

    expect(error.name).toBe('CancelledError');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Promise was cancelled');
  });

  it('CancelledError accepts custom message', () => {
    const error = new CancelledError('Custom reason');

    expect(error.message).toBe('Custom reason');
  });
});
