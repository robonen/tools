import { describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick, reactive, ref } from 'vue';
import { pausableWatch, watchPausable } from '.';
import { debounceFilter } from '@/utils/filters';

describe(watchPausable, () => {
  it('invokes the callback on source change when active', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const cb = vi.fn();
      watchPausable(count, cb);

      count.value = 1;
      await nextTick();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenLastCalledWith(1, 0, expect.anything());
    });
    scope.stop();
  });

  it('starts active by default', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isActive } = watchPausable(ref(0), () => {});
      expect(isActive.value).toBeTruthy();
    });
    scope.stop();
  });

  it('does not invoke the callback while paused', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const cb = vi.fn();
      const { pause } = watchPausable(count, cb);

      pause();
      count.value = 1;
      await nextTick();
      expect(cb).not.toHaveBeenCalled();
    });
    scope.stop();
  });

  it('isActive reflects pause/resume', () => {
    const scope = effectScope();
    scope.run(() => {
      const { pause, resume, isActive } = watchPausable(ref(0), () => {});

      expect(isActive.value).toBeTruthy();
      pause();
      expect(isActive.value).toBeFalsy();
      resume();
      expect(isActive.value).toBeTruthy();
    });
    scope.stop();
  });

  it('resumes reacting to changes after resume', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const cb = vi.fn();
      const { pause, resume } = watchPausable(count, cb);

      pause();
      count.value = 1;
      await nextTick();
      expect(cb).not.toHaveBeenCalled();

      resume();
      count.value = 2;
      await nextTick();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenLastCalledWith(2, 1, expect.anything());
    });
    scope.stop();
  });

  it('does not replay changes that happened while paused', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const cb = vi.fn();
      const { pause, resume } = watchPausable(count, cb);

      pause();
      count.value = 1;
      count.value = 2;
      await nextTick();
      resume();
      await nextTick();

      // Resume alone must not fire the callback for the missed changes.
      expect(cb).not.toHaveBeenCalled();
    });
    scope.stop();
  });

  it('respects initialState: paused', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const cb = vi.fn();
      const { isActive, resume } = watchPausable(count, cb, { initialState: 'paused' });

      expect(isActive.value).toBeFalsy();
      count.value = 1;
      await nextTick();
      expect(cb).not.toHaveBeenCalled();

      resume();
      count.value = 2;
      await nextTick();
      expect(cb).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it('stop() halts the watcher permanently', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const count = ref(0);
      const cb = vi.fn();
      const { stop, resume } = watchPausable(count, cb);

      stop();
      count.value = 1;
      await nextTick();
      expect(cb).not.toHaveBeenCalled();

      // resume cannot revive a stopped watcher
      resume();
      count.value = 2;
      await nextTick();
      expect(cb).not.toHaveBeenCalled();
    });
    scope.stop();
  });

  it('returns a readonly isActive ref', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isActive } = watchPausable(ref(0), () => {});
      expect(isReadonly(isActive)).toBeTruthy();
    });
    scope.stop();
  });

  it('supports multiple sources', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const a = ref(0);
      const b = ref('x');
      const cb = vi.fn();
      watchPausable([a, b], cb);

      a.value = 1;
      await nextTick();
      expect(cb).toHaveBeenLastCalledWith([1, 'x'], [0, 'x'], expect.anything());

      b.value = 'y';
      await nextTick();
      expect(cb).toHaveBeenLastCalledWith([1, 'y'], [1, 'x'], expect.anything());
    });
    scope.stop();
  });

  it('supports a getter source', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const state = reactive({ n: 1 });
      const cb = vi.fn();
      watchPausable(() => state.n, cb);

      state.n = 2;
      await nextTick();
      expect(cb).toHaveBeenLastCalledWith(2, 1, expect.anything());
    });
    scope.stop();
  });

  it('supports a reactive object source with deep', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const state = reactive({ nested: { n: 1 } });
      const cb = vi.fn();
      watchPausable(state, cb, { deep: true });

      state.nested.n = 2;
      await nextTick();
      expect(cb).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it('fires synchronously with flush: sync', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const cb = vi.fn();
      watchPausable(count, cb, { flush: 'sync' });

      count.value = 1;
      expect(cb).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it('honors immediate option', () => {
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const cb = vi.fn();
      watchPausable(count, cb, { immediate: true, flush: 'sync' });

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenLastCalledWith(0, undefined, expect.anything());
    });
    scope.stop();
  });

  it('composes with a custom eventFilter (debounce)', async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    scope.run(() => {
      const count = ref(0);
      const cb = vi.fn();
      const { pause } = watchPausable(count, cb, {
        eventFilter: debounceFilter(100),
        flush: 'sync',
      });

      count.value = 1;
      count.value = 2;
      expect(cb).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledTimes(1);

      // While paused the filter must not even be reached.
      pause();
      count.value = 3;
      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledTimes(1);
    });
    scope.stop();
    vi.useRealTimers();
  });

  it('pausableWatch is an alias for watchPausable', () => {
    expect(pausableWatch).toBe(watchPausable);
  });

  it('works outside an effect scope (SSR-style, manual stop)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { stop } = watchPausable(count, cb);

    count.value = 1;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
  });
});
