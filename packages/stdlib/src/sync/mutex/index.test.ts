import { describe, it, expect, beforeEach } from 'vitest';
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
});
