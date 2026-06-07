import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sleep } from '.';

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolve only after the requested delay elapses', async () => {
    let done = false;
    sleep(100).then(() => (done = true));

    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('resolve with undefined', async () => {
    const promise = sleep(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(await promise).toBeUndefined();
  });

  it('resolve on the next macrotask for a zero delay', async () => {
    let done = false;
    sleep(0).then(() => (done = true));

    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });
});
