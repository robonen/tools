import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncMutex } from '.';

describe('SyncMutex', () => {
  let mutex: SyncMutex;

  beforeEach(() => {
    mutex = new SyncMutex();
  });

  it('unlocked by default', () => {
    expect(mutex.isLocked).toBe(false);
  });

  it('lock the mutex', () => {
    mutex.lock();
  
    expect(mutex.isLocked).toBe(true);
  });

  it('remain locked when locked multiple times', () => {
    mutex.lock();
    mutex.lock();
  
    expect(mutex.isLocked).toBe(true);
  });

  it('unlock a locked mutex', () => {
    mutex.lock();
    mutex.unlock();
  
    expect(mutex.isLocked).toBe(false);
  });

  it('remain unlocked when unlocked multiple times', () => {
    mutex.unlock();
    mutex.unlock();

    expect(mutex.isLocked).toBe(false);
  });

  it('reflect the current lock state', () => {
    expect(mutex.isLocked).toBe(false);
    mutex.lock();
    expect(mutex.isLocked).toBe(true);
    mutex.unlock();
    expect(mutex.isLocked).toBe(false);
  });

  it('execute a callback when unlocked', async () => {
    const callback = vi.fn(() => 'done');
    const result = await mutex.execute(callback);
  
    expect(result).toBe('done');
    expect(callback).toHaveBeenCalled();
  });

  it('execute a promise callback when unlocked', async () => {
    const callback = vi.fn(() => Promise.resolve('done'));
    const result = await mutex.execute(callback);
  
    expect(result).toBe('done');
    expect(callback).toHaveBeenCalled();
  });

  it('execute concurrent callbacks only one at a time', async () => {
    const callback = vi.fn(() => Promise.resolve('done'));

    const result = await Promise.all([
      mutex.execute(callback),
      mutex.execute(callback),
      mutex.execute(callback),
    ]);
  
    expect(result).toEqual(['done', undefined, undefined]);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not execute a callback when locked', async () => {
    const callback = vi.fn(() => 'done');
    mutex.lock();
    const result = await mutex.execute(callback);

    expect(result).toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it('unlocks after executing a callback', async () => {
    const callback = vi.fn(() => 'done');
    await mutex.execute(callback);
  
    expect(mutex.isLocked).toBe(false);
  });
});
