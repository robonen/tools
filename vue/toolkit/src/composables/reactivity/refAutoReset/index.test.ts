import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, watch } from 'vue';
import { refAutoReset } from '.';

describe(refAutoReset, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('initializes with the default value', () => {
    const value = refAutoReset('default', 1000);
    expect(value.value).toBe('default');
  });

  it('resets to the default value after the delay', () => {
    const value = refAutoReset('default', 1000);

    value.value = 'changed';
    expect(value.value).toBe('changed');

    vi.advanceTimersByTime(999);
    expect(value.value).toBe('changed');

    vi.advanceTimersByTime(1);
    expect(value.value).toBe('default');
  });

  it('uses a default delay of 10000ms', () => {
    const value = refAutoReset('default');

    value.value = 'changed';
    vi.advanceTimersByTime(9999);
    expect(value.value).toBe('changed');

    vi.advanceTimersByTime(1);
    expect(value.value).toBe('default');
  });

  it('restarts the timer on each set', () => {
    const value = refAutoReset('default', 1000);

    value.value = 'first';
    vi.advanceTimersByTime(800);

    value.value = 'second';
    vi.advanceTimersByTime(800);
    // 1600ms total elapsed but only 800ms since last set
    expect(value.value).toBe('second');

    vi.advanceTimersByTime(200);
    expect(value.value).toBe('default');
  });

  it('does not reset before any write', () => {
    const value = refAutoReset('default', 1000);

    vi.advanceTimersByTime(5000);
    expect(value.value).toBe('default');
  });

  it('resolves a reactive default value at reset time', () => {
    const fallback = ref('a');
    const value = refAutoReset(fallback, 1000);

    expect(value.value).toBe('a');

    value.value = 'changed';
    fallback.value = 'b';

    vi.advanceTimersByTime(1000);
    expect(value.value).toBe('b');
  });

  it('resolves a reactive delay on each set', () => {
    const delay = ref(1000);
    const value = refAutoReset('default', delay);

    value.value = 'first';
    delay.value = 500;

    // delay is resolved at set time -> still 1000 for the first write
    vi.advanceTimersByTime(1000);
    expect(value.value).toBe('default');

    // next set picks up the new delay
    value.value = 'second';
    vi.advanceTimersByTime(500);
    expect(value.value).toBe('default');
  });

  it('resolves a getter as the default value', () => {
    let base = 1;
    const value = refAutoReset(() => base, 1000);

    expect(value.value).toBe(1);
    value.value = 99;
    base = 5;

    vi.advanceTimersByTime(1000);
    expect(value.value).toBe(5);
  });

  it('is reactive and triggers watchers on set and on reset', async () => {
    const scope = effectScope();
    const spy = vi.fn();

    scope.run(() => {
      const value = refAutoReset('default', 1000);
      watch(value, spy, { flush: 'sync' });
      value.value = 'changed';
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith('changed', 'default', expect.anything());

    vi.advanceTimersByTime(1000);
    await nextTick();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('default', 'changed', expect.anything());

    scope.stop();
  });

  it('cancels the pending reset when the owning scope is disposed', () => {
    const scope = effectScope();
    let value!: ReturnType<typeof refAutoReset<string>>;

    scope.run(() => {
      value = refAutoReset('default', 1000);
      value.value = 'changed';
    });

    scope.stop();

    vi.advanceTimersByTime(1000);
    expect(value.value).toBe('changed');
  });
});
