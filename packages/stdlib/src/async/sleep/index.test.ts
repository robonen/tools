import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { sleep } from '.';

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('delay execution by the specified amount of time', async () => {
    const start = performance.now();
    const delay = 100;

    await sleep(delay);

    const end = performance.now();

    expect(end - start).toBeGreaterThan(delay - 5);
  });
});