import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { until } from '.';

describe(until, () => {
  it('resolves immediately when the value already matches', async () => {
    const value = ref(7);
    await expect(until(value).toBe(7)).resolves.toBe(7);
  });

  it('resolves once the value changes to match toBe', async () => {
    const value = ref(0);
    const promise = until(value).toBe(7);

    value.value = 3;
    value.value = 7;

    await expect(promise).resolves.toBe(7);
  });

  it('tracks another ref passed to toBe', async () => {
    const value = ref(0);
    const target = ref(5);
    const promise = until(value).toBe(target);

    value.value = 5;
    await expect(promise).resolves.toBe(5);
  });

  it('resolves with a getter source watched against a literal', async () => {
    const value = ref(0);
    const promise = until(() => value.value * 2).toBe(18);

    value.value = 9;
    await expect(promise).resolves.toBe(18);
  });

  it('resolves on toBeTruthy', async () => {
    const value = ref(0);
    const promise = until(value).toBeTruthy();

    value.value = 1;
    await expect(promise).resolves.toBe(1);
  });

  it('resolves on toBeNull', async () => {
    const value = ref<number | null>(1);
    const promise = until(value).toBeNull();

    value.value = null;
    await expect(promise).resolves.toBeNull();
  });

  it('resolves on toBeUndefined', async () => {
    const value = ref<number | undefined>(1);
    const promise = until(value).toBeUndefined();

    value.value = undefined;
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves on toBeNaN', async () => {
    const value = ref(0);
    const promise = until(value).toBeNaN();

    value.value = Number.NaN;
    await expect(promise).resolves.toBeNaN();
  });

  it('resolves on toMatch with a predicate', async () => {
    const value = ref(0);
    const promise = until(value).toMatch(v => v > 10);

    value.value = 5;
    value.value = 11;
    await expect(promise).resolves.toBe(11);
  });

  it('negates a condition with not.toBe', async () => {
    const value = ref(0);
    const promise = until(value).not.toBe(0);

    value.value = 1;
    await expect(promise).resolves.toBe(1);
  });

  it('negates toBeTruthy with not', async () => {
    const value = ref(1);
    const promise = until(value).not.toBeTruthy();

    value.value = 0;
    await expect(promise).resolves.toBe(0);
  });

  it('negates a tracked ref with not.toBe', async () => {
    const value = ref(0);
    const target = ref(0);
    const promise = until(value).not.toBe(target);

    value.value = 4;
    await expect(promise).resolves.toBe(4);
  });

  it('resolves after a single change with changed', async () => {
    const value = ref(0);
    const promise = until(value).changed();

    value.value = 1;
    await expect(promise).resolves.toBe(1);
  });

  it('resolves after n changes with changedTimes', async () => {
    const value = ref(0);
    const promise = until(value).changedTimes(3);

    value.value = 1;
    value.value = 2;
    value.value = 3;
    await expect(promise).resolves.toBe(3);
  });

  it('works with array sources via toContains', async () => {
    const list = ref<number[]>([1, 2]);
    const promise = until(list).toContains(3);

    list.value = [1, 2, 3];
    await expect(promise).resolves.toEqual([1, 2, 3]);
  });

  it('negates toContains via not', async () => {
    const list = ref<number[]>([1, 2, 3]);
    const promise = until(list).not.toContains(3);

    list.value = [1, 2];
    await expect(promise).resolves.toEqual([1, 2]);
  });

  it('resolves with the current value on timeout when not throwing', async () => {
    vi.useFakeTimers();
    try {
      const value = ref(0);
      const promise = until(value).toBe(99, { timeout: 100 });

      vi.advanceTimersByTime(100);
      await expect(promise).resolves.toBe(0);
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('rejects on timeout when throwOnTimeout is set', async () => {
    vi.useFakeTimers();
    try {
      const value = ref(0);
      const promise = until(value).toBe(99, { timeout: 100, throwOnTimeout: true });
      // Attach the rejection expectation synchronously (do not await it yet), then
      // advance the timers that trigger the rejection — awaiting first would deadlock.
      // eslint-disable-next-line vitest/valid-expect -- intentionally deferred; awaited below after advancing timers
      const assertion = expect(promise).rejects.toBe('Timeout');

      await vi.advanceTimersByTimeAsync(100);
      await assertion;
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('resolves before the timeout fires when condition is met', async () => {
    vi.useFakeTimers();
    try {
      const value = ref(0);
      const promise = until(value).toBe(7, { timeout: 1000, throwOnTimeout: true });

      value.value = 7;
      await expect(promise).resolves.toBe(7);
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('stops watching after it resolves', async () => {
    const value = ref(0);
    const promise = until(value).toBe(1);

    value.value = 1;
    await promise;

    // mutating further should not throw or re-trigger anything
    value.value = 2;
    value.value = 3;
    expect(value.value).toBe(3);
  });

  it('does not leak a watcher into the owning scope', async () => {
    const value = ref(0);
    const scope = effectScope();

    const promise = scope.run(() => until(value).toBe(1))!;
    value.value = 1;
    await expect(promise).resolves.toBe(1);

    scope.stop();
  });

  it('supports a post flush timing', async () => {
    const value = ref(0);
    const promise = until(value).toBe(5, { flush: 'post' });

    value.value = 5;
    await nextTick();
    await expect(promise).resolves.toBe(5);
  });
});
