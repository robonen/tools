import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noop, timestamp } from '.';

describe('timestamp', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('return the current epoch milliseconds', () => {
    vi.setSystemTime(1_700_000_000_000);

    expect(timestamp()).toBe(1_700_000_000_000);
  });

  it('track the advancing clock', () => {
    vi.setSystemTime(1_000);
    expect(timestamp()).toBe(1_000);

    vi.advanceTimersByTime(500);
    expect(timestamp()).toBe(1_500);
  });
});

describe('noop', () => {
  it('return undefined and not throw', () => {
    expect(noop()).toBeUndefined();
    expect(() => noop()).not.toThrow();
  });
});
