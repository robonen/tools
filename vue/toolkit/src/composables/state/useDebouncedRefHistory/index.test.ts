import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useDebouncedRefHistory } from '.';

describe(useDebouncedRefHistory, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('seeds history with the initial value', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, last, canUndo, canRedo } = useDebouncedRefHistory(count, {
        flush: 'sync',
        debounce: 100,
      });

      expect(history.value).toHaveLength(1);
      expect(history.value[0]!.snapshot).toBe(0);
      expect(last.value.snapshot).toBe(0);
      expect(canUndo.value).toBeFalsy();
      expect(canRedo.value).toBeFalsy();
    });
    scope.stop();
  });

  it('collapses a burst of changes into a single commit after the debounce window', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, { flush: 'sync', debounce: 100 });

      count.value = 1;
      count.value = 2;
      count.value = 3;

      // Nothing committed yet — still within the debounce window.
      expect(history.value.map(r => r.snapshot)).toEqual([0]);

      vi.advanceTimersByTime(100);

      // Only the final value is recorded.
      expect(history.value.map(r => r.snapshot)).toEqual([3, 0]);
    });
    scope.stop();
  });

  it('records separate commits for changes spaced beyond the debounce window', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, { flush: 'sync', debounce: 100 });

      count.value = 1;
      vi.advanceTimersByTime(100);
      count.value = 2;
      vi.advanceTimersByTime(100);

      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('resets the timer on each change (trailing edge)', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, { flush: 'sync', debounce: 100 });

      count.value = 1;
      vi.advanceTimersByTime(60);
      count.value = 2;
      vi.advanceTimersByTime(60); // 60ms since last change -> still pending

      expect(history.value.map(r => r.snapshot)).toEqual([0]);

      vi.advanceTimersByTime(40); // now 100ms since last change

      expect(history.value.map(r => r.snapshot)).toEqual([2, 0]);
    });
    scope.stop();
  });

  it('honours maxWait, forcing a commit under sustained input', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, {
        flush: 'sync',
        debounce: 100,
        maxWait: 250,
      });

      // Keep poking every 60ms so the trailing debounce never settles on its own.
      count.value = 1;
      vi.advanceTimersByTime(60);
      count.value = 2;
      vi.advanceTimersByTime(60);
      count.value = 3;
      vi.advanceTimersByTime(60);
      count.value = 4;
      vi.advanceTimersByTime(60); // 240ms elapsed, still under maxWait
      expect(history.value.map(r => r.snapshot)).toEqual([0]);

      count.value = 5;
      vi.advanceTimersByTime(10); // crosses maxWait of 250ms

      // The latest value at the forced commit is recorded.
      expect(history.value[0]!.snapshot).toBe(5);
    });
    scope.stop();
  });

  it('commits synchronously when debounce is not provided', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, { flush: 'sync' });

      count.value = 1;
      count.value = 2;

      // No debounce filter -> immediate commits, just like useRefHistory.
      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('commits synchronously when debounce is non-positive', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, { flush: 'sync', debounce: 0 });

      count.value = 1;
      count.value = 2;

      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('supports undo/redo on debounced records', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { undo, redo, canUndo, canRedo } = useDebouncedRefHistory(count, {
        flush: 'sync',
        debounce: 100,
      });

      count.value = 1;
      vi.advanceTimersByTime(100);
      count.value = 2;
      vi.advanceTimersByTime(100);

      expect(canUndo.value).toBeTruthy();
      undo();
      expect(count.value).toBe(1);
      undo();
      expect(count.value).toBe(0);
      expect(canUndo.value).toBeFalsy();

      expect(canRedo.value).toBeTruthy();
      redo();
      expect(count.value).toBe(1);
    });
    scope.stop();
  });

  it('forwards capacity through to useRefHistory', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useDebouncedRefHistory(count, {
        flush: 'sync',
        debounce: 100,
        capacity: 2,
      });

      count.value = 1;
      vi.advanceTimersByTime(100);
      count.value = 2;
      vi.advanceTimersByTime(100);
      count.value = 3;
      vi.advanceTimersByTime(100);

      expect(history.value).toHaveLength(2);
      expect(history.value.map(r => r.snapshot)).toEqual([3, 2]);
    });
    scope.stop();
  });

  it('supports a reactive debounce delay', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const delay = ref(100);
      const { history } = useDebouncedRefHistory(count, { flush: 'sync', debounce: delay });

      count.value = 1;
      vi.advanceTimersByTime(100);
      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);

      delay.value = 300;
      count.value = 2;
      vi.advanceTimersByTime(100); // not enough for the new delay
      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);

      vi.advanceTimersByTime(200); // total 300ms
      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('stops feeding the filter after dispose', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, dispose } = useDebouncedRefHistory(count, { flush: 'sync', debounce: 100 });

      dispose();

      // The watcher is stopped, so post-dispose mutations never reach the
      // debounce filter and schedule no commits.
      count.value = 1;
      count.value = 2;
      vi.advanceTimersByTime(100);

      expect(history.value).toHaveLength(1);
      expect(history.value[0]!.snapshot).toBe(0);
    });
    scope.stop();
  });

  it('is SSR-safe: instantiates without touching window/document', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const api = useDebouncedRefHistory(count, { flush: 'sync', debounce: 100 });

      expect(typeof api.undo).toBe('function');
      expect(typeof api.redo).toBe('function');
      expect(typeof api.dispose).toBe('function');
      expect(api.history.value).toHaveLength(1);
    });
    scope.stop();
  });
});
