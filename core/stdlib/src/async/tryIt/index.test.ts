import { describe, it, expect } from 'vitest';
import { tryIt } from '.';

describe('tryIt', () => {
  it('handle synchronous functions without errors', () => {
    const syncFn = (x: number) => x * 2;
    const wrappedSyncFn = tryIt(syncFn);

    const { error, data } = wrappedSyncFn(2);

    expect(error).toBeUndefined();
    expect(data).toBe(4);
  });

  it('handle synchronous functions with errors', () => {
    const syncFn = (): void => { throw new Error('Test error') };
    const wrappedSyncFn = tryIt(syncFn);

    const { error, data } = wrappedSyncFn();

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Test error');
    expect(data).toBeUndefined();
  });

  it('handle asynchronous functions without errors', async () => {
    const asyncFn = async (x: number) => x * 2;
    const wrappedAsyncFn = tryIt(asyncFn);

    const { error, data } = await wrappedAsyncFn(2);

    expect(error).toBeUndefined();
    expect(data).toBe(4);
  });

  it('handle asynchronous functions with errors', async () => {
    const asyncFn = async () => { throw new Error('Test error') };
    const wrappedAsyncFn = tryIt(asyncFn);

    const { error, data } = await wrappedAsyncFn();

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Test error');
    expect(data).toBeUndefined();
  });

  it('handle promise-based functions without errors', async () => {
    const promiseFn = (x: number) => Promise.resolve(x * 2);
    const wrappedPromiseFn = tryIt(promiseFn);

    const { error, data } = await wrappedPromiseFn(2);

    expect(error).toBeUndefined();
    expect(data).toBe(4);
  });

  it('handle promise-based functions with errors', async () => {
    const promiseFn = () => Promise.reject(new Error('Test error'));
    const wrappedPromiseFn = tryIt(promiseFn);

    const { error, data } = await wrappedPromiseFn();

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Test error');
    expect(data).toBeUndefined();
  });
});