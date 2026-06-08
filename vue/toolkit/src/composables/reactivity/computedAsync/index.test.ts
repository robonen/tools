import { describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick, ref } from 'vue';
import { asyncComputed, computedAsync } from '.';

function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe(computedAsync, () => {
  it('uses the initial state until the first evaluation resolves', async () => {
    const value = computedAsync(async () => {
      await flushPromises();
      return 'resolved';
    }, 'initial');

    expect(value.value).toBe('initial');

    await flushPromises();
    await nextTick();
    expect(value.value).toBe('resolved');
  });

  it('defaults to undefined when no initial state is given', () => {
    const value = computedAsync(async () => 42);
    expect(value.value).toBeUndefined();
  });

  it('re-evaluates when a reactive dependency changes', async () => {
    const id = ref(1);
    const spy = vi.fn(async () => `user-${id.value}`);
    const value = computedAsync(spy, undefined);

    await flushPromises();
    await nextTick();
    expect(value.value).toBe('user-1');
    expect(spy).toHaveBeenCalledTimes(1);

    id.value = 2;
    await nextTick();
    await flushPromises();
    await nextTick();
    expect(value.value).toBe('user-2');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('tracks pending state through the evaluating ref', async () => {
    const evaluating = ref(false);
    const value = computedAsync(async () => {
      await flushPromises();
      return 'done';
    }, 'init', { evaluating });

    // deferred to a microtask after the effect runs
    await nextTick();
    expect(evaluating.value).toBeTruthy();
    expect(value.value).toBe('init');

    await flushPromises();
    await nextTick();
    expect(evaluating.value).toBeFalsy();
    expect(value.value).toBe('done');
  });

  it('accepts a bare Ref<boolean> as the evaluating ref', async () => {
    const evaluating = ref(false);
    const value = computedAsync(async () => {
      await flushPromises();
      return 1;
    }, 0, evaluating);

    await nextTick();
    expect(evaluating.value).toBeTruthy();

    await flushPromises();
    await nextTick();
    expect(evaluating.value).toBeFalsy();
    expect(value.value).toBe(1);
  });

  it('invokes onError and keeps the previous value when the callback rejects', async () => {
    const onError = vi.fn();
    const fail = ref(false);
    const value = computedAsync(async () => {
      if (fail.value)
        throw new Error('boom');

      return 'ok';
    }, 'init', { onError });

    await flushPromises();
    await nextTick();
    expect(value.value).toBe('ok');

    fail.value = true;
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toBe('boom');
    // value is retained on error
    expect(value.value).toBe('ok');
  });

  it('does not throw or call onError by default when no handler is provided', async () => {
    const value = computedAsync(async () => {
      throw new Error('silent');
    }, 'fallback');

    await flushPromises();
    await nextTick();
    // default onError is noop; value stays at the initial state
    expect(value.value).toBe('fallback');
  });

  it('does not evaluate until read when lazy', async () => {
    const spy = vi.fn(async () => 'lazy-value');
    const value = computedAsync(spy, 'pending', { lazy: true });

    await flushPromises();
    await nextTick();
    expect(spy).not.toHaveBeenCalled();

    // first read triggers evaluation
    expect(value.value).toBe('pending');
    await flushPromises();
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(value.value).toBe('lazy-value');
  });

  it('returns a readonly computed when lazy', () => {
    const value = computedAsync(async () => 1, 0, { lazy: true });
    expect(isReadonly(value)).toBeTruthy();
  });

  it('discards out-of-order resolutions so only the latest run wins', async () => {
    const delays = ref(0);
    const value = computedAsync(async () => {
      const wait = delays.value;
      await new Promise(resolve => setTimeout(resolve, wait));
      return wait;
    }, -1);

    // first run: slow (30ms)
    delays.value = 30;
    await nextTick();
    // second run: fast (0ms) — triggered before the slow one settles
    delays.value = 0;
    await nextTick();

    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    // the fast (latest) run committed; the slow stale run was discarded
    expect(value.value).toBe(0);
  });

  it('invokes the onCancel callback when a stale run is invalidated', async () => {
    const cancelled = vi.fn();
    const tick = ref(0);

    computedAsync(async (onCancel) => {
      void tick.value;
      onCancel(cancelled);
      await new Promise(resolve => setTimeout(resolve, 20));
      return tick.value;
    }, 0);

    await nextTick();
    // trigger a re-run before the first settles
    tick.value = 1;
    await nextTick();

    await new Promise(resolve => setTimeout(resolve, 40));
    expect(cancelled).toHaveBeenCalled();
  });

  it('supports a deep ref backing when shallow is false', async () => {
    const value = computedAsync(async () => ({ nested: { count: 1 } }), undefined, { shallow: false });

    await flushPromises();
    await nextTick();
    expect(value.value).toEqual({ nested: { count: 1 } });
  });

  it('stops evaluating when the owning scope is disposed', async () => {
    const trigger = ref(0);
    const spy = vi.fn(async () => trigger.value);
    const scope = effectScope();

    scope.run(() => {
      computedAsync(spy, undefined);
    });

    await flushPromises();
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);

    scope.stop();

    trigger.value = 1;
    await nextTick();
    await flushPromises();
    // effect torn down with the scope; no further evaluation
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('exposes asyncComputed as an alias of computedAsync', () => {
    expect(asyncComputed).toBe(computedAsync);
  });
});
