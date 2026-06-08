import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useThrottledRefHistory } from '.';

describe(useThrottledRefHistory, () => {
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
      const { history, last, canUndo, canRedo } = useThrottledRefHistory(count, { flush: 'sync' });

      expect(history.value).toHaveLength(1);
      expect(history.value[0]!.snapshot).toBe(0);
      expect(last.value.snapshot).toBe(0);
      expect(canUndo.value).toBeFalsy();
      expect(canRedo.value).toBeFalsy();
    });
    scope.stop();
  });

  it('commits the leading change immediately', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 1000, flush: 'sync' });

      count.value = 1;

      // Leading edge: the first change records right away.
      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);
    });
    scope.stop();
  });

  it('coalesces rapid changes within the throttle window into a trailing commit', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 1000, flush: 'sync' });

      count.value = 1; // leading commit
      count.value = 2; // within window — coalesced
      count.value = 3; // within window — coalesced

      // Only the leading snapshot is present so far.
      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);

      // Trailing edge fires after the window elapses with the latest value.
      vi.advanceTimersByTime(1000);

      expect(history.value.map(r => r.snapshot)).toEqual([3, 1, 0]);
    });
    scope.stop();
  });

  it('records again after the window resets', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 500, flush: 'sync' });

      count.value = 1; // leading
      vi.advanceTimersByTime(500);

      count.value = 2; // new window — leading again
      vi.advanceTimersByTime(500);

      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('skips the trailing commit when trailing is false', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 1000, trailing: false, flush: 'sync' });

      count.value = 1; // leading commit
      count.value = 2; // dropped (no trailing)
      count.value = 3; // dropped (no trailing)

      vi.advanceTimersByTime(1000);

      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);
    });
    scope.stop();
  });

  it('skips the leading commit when leading is false', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 1000, leading: false, flush: 'sync' });

      count.value = 1; // no leading commit
      count.value = 2;

      expect(history.value.map(r => r.snapshot)).toEqual([0]);

      vi.advanceTimersByTime(1000);

      // Only the trailing snapshot is recorded.
      expect(history.value.map(r => r.snapshot)).toEqual([2, 0]);
    });
    scope.stop();
  });

  it('supports a reactive throttle interval', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const throttle = ref(1000);
      const { history } = useThrottledRefHistory(count, { throttle, flush: 'sync' });

      count.value = 1; // leading
      count.value = 2; // coalesced

      vi.advanceTimersByTime(1000);
      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);

      // Shrink the window: a shorter advance now flushes the trailing commit.
      throttle.value = 100;
      count.value = 3; // within the (now 100ms) window — schedules trailing
      count.value = 4; // coalesced into the same trailing commit

      vi.advanceTimersByTime(100);
      expect(history.value.map(r => r.snapshot)).toEqual([4, 2, 1, 0]);
    });
    scope.stop();
  });

  it('defaults to a 200ms throttle window', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { flush: 'sync' });

      count.value = 1; // leading
      count.value = 2; // coalesced

      vi.advanceTimersByTime(199);
      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);

      vi.advanceTimersByTime(1);
      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('exposes the full useRefHistory API (undo/redo)', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { undo, redo, canUndo, canRedo } = useThrottledRefHistory(count, { throttle: 100, flush: 'sync' });

      count.value = 1;
      vi.advanceTimersByTime(100);
      count.value = 2;
      vi.advanceTimersByTime(100);

      expect(canUndo.value).toBeTruthy();
      expect(canRedo.value).toBeFalsy();

      undo();
      expect(count.value).toBe(1);
      expect(canRedo.value).toBeTruthy();

      redo();
      expect(count.value).toBe(2);
    });
    scope.stop();
  });

  it('honors capacity together with throttling', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 100, capacity: 2, flush: 'sync' });

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

  it('stops recording after dispose', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, dispose } = useThrottledRefHistory(count, { throttle: 100, flush: 'sync' });

      count.value = 1;
      vi.advanceTimersByTime(100);
      dispose();

      count.value = 2;
      vi.advanceTimersByTime(100);

      // After dispose history is cleared and no further commits land.
      expect(history.value.map(r => r.snapshot)).toEqual([1]);
    });
    scope.stop();
  });

  it('works without any DOM globals (SSR-safe)', () => {
    // The composable is pure composition over refs/timers — it must never touch
    // window/document/navigator. Run it with those globals stubbed undefined.
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('navigator', undefined);

    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useThrottledRefHistory(count, { throttle: 100, flush: 'sync' });

      count.value = 1;
      vi.advanceTimersByTime(100);

      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);
    });
    scope.stop();

    vi.unstubAllGlobals();
  });
});
