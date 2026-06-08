import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { createEventHook } from '.';

describe(createEventHook, () => {
  it('triggers registered listeners with the payload', async () => {
    const { on, trigger } = createEventHook<string>();
    const listener = vi.fn();

    on(listener);
    await trigger('hello');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('hello');
  });

  it('triggers multiple listeners', async () => {
    const { on, trigger } = createEventHook<number>();
    const a = vi.fn();
    const b = vi.fn();

    on(a);
    on(b);
    await trigger(42);

    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('supports tuple payloads for multiple positional arguments', async () => {
    const { on, trigger } = createEventHook<[number, number]>();
    const listener = vi.fn();

    on(listener);
    await trigger(2, 3);

    expect(listener).toHaveBeenCalledWith(2, 3);
  });

  it('resolves with the results of all listeners', async () => {
    const { on, trigger } = createEventHook<number>();

    on(x => x + 1);
    on(async x => x * 2);

    const results = await trigger(10);
    expect(results).toEqual([11, 20]);
  });

  it('awaits async listeners before resolving', async () => {
    const { on, trigger } = createEventHook<void>();
    let done = false;

    on(async () => {
      await Promise.resolve();
      done = true;
    });

    const promise = trigger();
    expect(done).toBeFalsy();

    await promise;
    expect(done).toBeTruthy();
  });

  it('off removes a listener', async () => {
    const { on, off, trigger } = createEventHook<string>();
    const listener = vi.fn();

    on(listener);
    off(listener);
    await trigger('x');

    expect(listener).not.toHaveBeenCalled();
  });

  it('on returns a callable off handle', async () => {
    const { on, trigger } = createEventHook<string>();
    const listener = vi.fn();

    const stop = on(listener);
    stop();
    await trigger('x');

    expect(listener).not.toHaveBeenCalled();
  });

  it('on returns a handle whose .off method removes the listener', async () => {
    const { on, trigger } = createEventHook<string>();
    const listener = vi.fn();

    const { off } = on(listener);
    off();
    await trigger('x');

    expect(listener).not.toHaveBeenCalled();
  });

  it('clear removes every listener', async () => {
    const { on, trigger, clear } = createEventHook<string>();
    const a = vi.fn();
    const b = vi.fn();

    on(a);
    on(b);
    clear();
    await trigger('x');

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('does not call listeners added during a trigger in the same pass', async () => {
    const { on, trigger } = createEventHook<void>();
    const late = vi.fn();

    on(() => {
      on(late);
    });

    await trigger();
    expect(late).not.toHaveBeenCalled();

    await trigger();
    expect(late).toHaveBeenCalledOnce();
  });

  it('allows a listener to remove itself during a trigger', async () => {
    const { on, trigger } = createEventHook<void>();
    const listener = vi.fn();

    const off = on(() => {
      off();
      listener();
    });

    await trigger();
    await trigger();

    expect(listener).toHaveBeenCalledOnce();
  });

  it('routes a throwing listener to onError without rejecting trigger', async () => {
    const onError = vi.fn();
    const { on, trigger } = createEventHook<void>({ onError });
    const after = vi.fn();

    on(() => {
      throw new Error('boom');
    });
    on(after);

    await expect(trigger()).resolves.toBeDefined();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect(after).toHaveBeenCalledOnce();
  });

  it('routes a rejecting async listener to onError without rejecting trigger', async () => {
    const onError = vi.fn();
    const { on, trigger } = createEventHook<void>({ onError });

    on(async () => {
      throw new Error('async boom');
    });

    await expect(trigger()).resolves.toEqual([undefined]);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('swallows listener errors by default', async () => {
    const { on, trigger } = createEventHook<void>();

    on(() => {
      throw new Error('boom');
    });

    await expect(trigger()).resolves.toBeDefined();
  });

  it('removes the listener when the effect scope is disposed', async () => {
    const listener = vi.fn();
    const hook = createEventHook<void>();
    const scope = effectScope();

    scope.run(() => {
      hook.on(listener);
    });

    scope.stop();
    await hook.trigger();

    expect(listener).not.toHaveBeenCalled();
  });

  it('works outside of an effect scope (SSR-safe, no scope available)', async () => {
    const listener = vi.fn();
    const hook = createEventHook<string>();

    // No getCurrentScope here -> tryOnScopeDispose is a no-op, must not throw.
    const off = hook.on(listener);
    await hook.trigger('ok');
    expect(listener).toHaveBeenCalledWith('ok');

    off();
    await hook.trigger('again');
    expect(listener).toHaveBeenCalledOnce();
  });
});
