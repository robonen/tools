import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useDebounceFn } from '.';

describe(useDebounceFn, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delays invocation until ms elapsed', () => {
    const fn = vi.fn();
    const debounced = useDebounceFn(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('coalesces rapid calls into one with the latest args', () => {
    const fn = vi.fn();
    const debounced = useDebounceFn(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('resolves the promise with the function result', async () => {
    const debounced = useDebounceFn((x: number) => x * 2, 100);

    const promise = debounced(21);
    vi.advanceTimersByTime(100);

    await expect(promise).resolves.toBe(42);
  });

  it('rejects the promise when the function throws', async () => {
    const debounced = useDebounceFn(() => {
      throw new Error('boom');
    }, 100);

    const promise = debounced();
    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('boom');
  });

  it('preserves the `this` context', () => {
    const ctx = { value: 7, fn: vi.fn() };
    const obj = {
      value: 7,
      debounced: useDebounceFn(function (this: typeof ctx) {
        ctx.fn(this.value);
      }, 100),
    } as unknown as typeof ctx & { debounced: () => Promise<void> };

    obj.debounced();
    vi.advanceTimersByTime(100);
    expect(ctx.fn).toHaveBeenCalledWith(7);
  });

  it('runs synchronously when ms <= 0', () => {
    const fn = vi.fn();
    const debounced = useDebounceFn(fn, 0);

    debounced();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('accepts a reactive/getter delay', () => {
    const fn = vi.fn();
    let ms = 100;
    const debounced = useDebounceFn(fn, () => ms);

    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    ms = 300;
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // not yet — delay grew to 300
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  describe('isPending', () => {
    it('reflects the pending state', () => {
      const debounced = useDebounceFn(vi.fn(), 100);
      expect(debounced.isPending.value).toBeFalsy();

      debounced();
      expect(debounced.isPending.value).toBeTruthy();

      vi.advanceTimersByTime(100);
      expect(debounced.isPending.value).toBeFalsy();
    });

    it('is false after ms <= 0 synchronous calls', () => {
      const debounced = useDebounceFn(vi.fn(), 0);
      debounced();
      expect(debounced.isPending.value).toBeFalsy();
    });
  });

  describe('cancel', () => {
    it('cancels a pending invocation', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100);

      debounced();
      debounced.cancel();
      expect(debounced.isPending.value).toBeFalsy();

      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('resolves the pending promise with undefined by default', async () => {
      const debounced = useDebounceFn((x: number) => x, 100);

      const promise = debounced(5);
      debounced.cancel();

      await expect(promise).resolves.toBeUndefined();
    });

    it('rejects the pending promise when rejectOnCancel is set', async () => {
      const debounced = useDebounceFn((x: number) => x, 100, { rejectOnCancel: true });

      const promise = debounced(5);
      const assertion = expect(promise).rejects.toBeUndefined();
      debounced.cancel();

      await assertion;
    });

    it('is a no-op when nothing is pending', () => {
      const debounced = useDebounceFn(vi.fn(), 100);
      expect(() => debounced.cancel()).not.toThrow();
    });
  });

  describe('flush', () => {
    it('invokes the pending call immediately', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100);

      debounced('x');
      debounced.flush();

      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('x');
      expect(debounced.isPending.value).toBeFalsy();
    });

    it('resolves the pending promise with the result', async () => {
      const debounced = useDebounceFn((x: number) => x * 3, 100);

      const promise = debounced(4);
      debounced.flush();

      await expect(promise).resolves.toBe(12);
    });

    it('does not invoke twice when the timer later fires', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100);

      debounced();
      debounced.flush();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledOnce();
    });

    it('is a no-op when nothing is pending', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100);
      debounced.flush();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('maxWait', () => {
    it('forces invocation after maxWait under sustained calls', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100, { maxWait: 250 });

      // Keep resetting the 100ms timer every 80ms so it never fires on its own.
      debounced();
      vi.advanceTimersByTime(80);
      debounced();
      vi.advanceTimersByTime(80);
      debounced();
      vi.advanceTimersByTime(80);
      expect(fn).not.toHaveBeenCalled(); // 240ms elapsed, under maxWait

      vi.advanceTimersByTime(10); // 250ms total — maxWait fires
      expect(fn).toHaveBeenCalledOnce();
    });

    it('resets the maxWait window after firing', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100, { maxWait: 250 });

      debounced();
      vi.advanceTimersByTime(250);
      expect(fn).toHaveBeenCalledTimes(1);

      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('runs synchronously when maxWait <= 0', () => {
      const fn = vi.fn();
      const debounced = useDebounceFn(fn, 100, { maxWait: 0 });
      debounced();
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('scope disposal', () => {
    it('cancels pending timers when the owning scope is disposed', () => {
      const fn = vi.fn();
      const scope = effectScope();
      let debounced!: ReturnType<typeof useDebounceFn>;

      scope.run(() => {
        debounced = useDebounceFn(fn, 100);
      });

      debounced();
      expect(debounced.isPending.value).toBeTruthy();

      scope.stop();
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
      expect(debounced.isPending.value).toBeFalsy();
    });
  });

  it('settles superseded promises with undefined (default)', async () => {
    const debounced = useDebounceFn((x: string) => x, 100);

    const first = debounced('a');
    const second = debounced('b');

    vi.advanceTimersByTime(100);
    await nextTick();

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBe('b');
  });
});
