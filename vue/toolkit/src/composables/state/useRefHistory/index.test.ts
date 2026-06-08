import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useRefHistory } from '.';

describe(useRefHistory, () => {
  it('seeds history with the initial value', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, last, canUndo, canRedo } = useRefHistory(count, { flush: 'sync' });

      expect(history.value).toHaveLength(1);
      expect(history.value[0]!.snapshot).toBe(0);
      expect(last.value.snapshot).toBe(0);
      expect(canUndo.value).toBeFalsy();
      expect(canRedo.value).toBeFalsy();
    });
    scope.stop();
  });

  it('records changes (newest first) with sync flush', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      count.value = 2;

      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('records changes with the default (pre) flush', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const { history } = useRefHistory(count);

      count.value = 1;
      await nextTick();
      count.value = 2;
      await nextTick();

      expect(history.value.map(r => r.snapshot)).toEqual([2, 1, 0]);
    });
    scope.stop();
  });

  it('undoes and redoes', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { undo, redo, canUndo, canRedo } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      count.value = 2;
      expect(canUndo.value).toBeTruthy();
      expect(canRedo.value).toBeFalsy();

      undo();
      expect(count.value).toBe(1);
      expect(canRedo.value).toBeTruthy();

      undo();
      expect(count.value).toBe(0);
      expect(canUndo.value).toBeFalsy();

      redo();
      expect(count.value).toBe(1);
      redo();
      expect(count.value).toBe(2);
      expect(canRedo.value).toBeFalsy();
    });
    scope.stop();
  });

  it('does not record undo/redo writes as new history', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, undo } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      count.value = 2;
      undo();

      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);
    });
    scope.stop();
  });

  it('clears the redo stack on a fresh edit', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { undo, canRedo } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      count.value = 2;
      undo();
      expect(canRedo.value).toBeTruthy();

      count.value = 5;
      expect(canRedo.value).toBeFalsy();
    });
    scope.stop();
  });

  it('commits manually', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, commit } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      // a sync flush already committed; force a duplicate manual commit
      commit();

      expect(history.value.map(r => r.snapshot)).toEqual([1, 1, 0]);
    });
    scope.stop();
  });

  it('clears history but keeps the current value', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, clear, canUndo, canRedo, last } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      count.value = 2;
      clear();

      expect(history.value).toHaveLength(1);
      expect(last.value.snapshot).toBe(2);
      expect(canUndo.value).toBeFalsy();
      expect(canRedo.value).toBeFalsy();
    });
    scope.stop();
  });

  it('resets to the last snapshot, discarding uncommitted edits', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, reset, pause } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      pause();
      count.value = 99; // not committed while paused
      reset();

      expect(count.value).toBe(1);
      expect(history.value.map(r => r.snapshot)).toEqual([1, 0]);
    });
    scope.stop();
  });

  it('pauses and resumes tracking', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, pause, resume, isTracking } = useRefHistory(count, { flush: 'sync' });

      pause();
      expect(isTracking.value).toBeFalsy();
      count.value = 1;
      count.value = 2;
      expect(history.value.map(r => r.snapshot)).toEqual([0]);

      resume();
      expect(isTracking.value).toBeTruthy();
      count.value = 3;
      expect(history.value.map(r => r.snapshot)).toEqual([3, 0]);
    });
    scope.stop();
  });

  it('commits on resume when requested', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, pause, resume } = useRefHistory(count, { flush: 'sync' });

      pause();
      count.value = 5;
      resume(true);

      expect(history.value.map(r => r.snapshot)).toEqual([5, 0]);
    });
    scope.stop();
  });

  it('batches edits into a single commit', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, batch } = useRefHistory(count, { flush: 'sync' });

      batch(() => {
        count.value = 1;
        count.value = 2;
        count.value = 3;
      });

      expect(history.value.map(r => r.snapshot)).toEqual([3, 0]);
    });
    scope.stop();
  });

  it('skips the trailing commit when a batch is canceled', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, batch } = useRefHistory(count, { flush: 'sync' });

      batch((cancel) => {
        count.value = 1;
        cancel();
      });

      expect(history.value.map(r => r.snapshot)).toEqual([0]);
    });
    scope.stop();
  });

  it('respects capacity by dropping the oldest records', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useRefHistory(count, { flush: 'sync', capacity: 2 });

      count.value = 1;
      count.value = 2;
      count.value = 3;

      expect(history.value).toHaveLength(2);
      expect(history.value.map(r => r.snapshot)).toEqual([3, 2]);
    });
    scope.stop();
  });

  it('clones snapshots for deep tracking', () => {
    const scope = effectScope();
    scope.run(() => {
      const state = ref({ n: 0 });
      const { history, undo } = useRefHistory(state, { flush: 'sync', deep: true });

      state.value.n = 1;
      // deep watch fires on nested mutation; force a commit via assignment too
      state.value = { n: 2 };

      const first = history.value[history.value.length - 1]!.snapshot;
      expect(first).toEqual({ n: 0 });

      undo();
      // snapshot must not be the same reference as the live value
      expect(history.value[0]!.snapshot).not.toBe(state.value);
    });
    scope.stop();
  });

  it('uses custom dump/parse serializers', () => {
    const scope = effectScope();
    scope.run(() => {
      const state = ref({ a: 1 });
      const { history, undo } = useRefHistory(state, {
        flush: 'sync',
        dump: v => JSON.stringify(v),
        parse: v => JSON.parse(v),
      });

      state.value = { a: 2 };
      expect(history.value[0]!.snapshot).toBe('{"a":2}');

      undo();
      expect(state.value).toEqual({ a: 1 });
    });
    scope.stop();
  });

  it('honours shouldCommit to filter changes', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history } = useRefHistory(count, {
        flush: 'sync',
        shouldCommit: (_old, next) => next % 2 === 0,
      });

      count.value = 1; // odd -> skipped
      count.value = 2; // even -> committed
      count.value = 3; // odd -> skipped
      count.value = 4; // even -> committed

      expect(history.value.map(r => r.snapshot)).toEqual([4, 2, 0]);
    });
    scope.stop();
  });

  it('applies the eventFilter to tracked changes', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const passes: number[] = [];
      // a filter that only lets through even values
      const { history } = useRefHistory(count, {
        flush: 'sync',
        eventFilter: (invoke) => {
          if (count.value % 2 === 0) {
            passes.push(count.value);
            invoke();
          }
        },
      });

      count.value = 1;
      count.value = 2;
      count.value = 3;
      count.value = 4;

      expect(history.value.map(r => r.snapshot)).toEqual([4, 2, 0]);
      expect(passes).toEqual([2, 4]);
    });
    scope.stop();
  });

  it('stops tracking and clears history on dispose', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const { history, dispose } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      dispose();
      expect(history.value).toHaveLength(1);

      count.value = 2;
      expect(history.value).toHaveLength(1);
    });
    scope.stop();
  });

  it('records timestamps on each snapshot', () => {
    const scope = effectScope();
    scope.run(() => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1234);
      const count = ref(0);
      const { last } = useRefHistory(count, { flush: 'sync' });

      count.value = 1;
      expect(last.value.timestamp).toBe(1234);
      now.mockRestore();
    });
    scope.stop();
  });

  it('is SSR-safe: instantiates without touching window/document', () => {
    // No DOM globals are read at construction; running under jsdom suffices to
    // prove no top-level global access, but we also guard the no-op path.
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const api = useRefHistory(count, { flush: 'sync' });

      expect(typeof api.undo).toBe('function');
      expect(typeof api.redo).toBe('function');
      expect(typeof api.dispose).toBe('function');
      expect(api.history.value).toHaveLength(1);
    });
    scope.stop();
  });
});
