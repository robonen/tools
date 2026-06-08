import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useEventBus } from '@/composables/utilities/useEventBus';
import type { EventBusKey } from '@/composables/utilities/useEventBus';

describe(useEventBus, () => {
  it('should call listeners on emit', () => {
    const bus = useEventBus(Symbol('emit'));
    const listener = vi.fn();

    bus.on(listener);
    bus.emit('hello');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('hello', undefined);
  });

  it('should forward event and payload', () => {
    const bus = useEventBus<string, { id: number }>(Symbol('payload'));
    const listener = vi.fn();

    bus.on(listener);
    bus.emit('open', { id: 7 });

    expect(listener).toHaveBeenCalledWith('open', { id: 7 });
  });

  it('should support multiple listeners', () => {
    const bus = useEventBus(Symbol('multi'));
    const a = vi.fn();
    const b = vi.fn();

    bus.on(a);
    bus.on(b);
    bus.emit('x');

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('should remove a listener via the returned stop function', () => {
    const bus = useEventBus(Symbol('stop'));
    const listener = vi.fn();

    const stop = bus.on(listener);
    bus.emit('a');
    stop();
    bus.emit('b');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('a', undefined);
  });

  it('should remove a listener via off', () => {
    const bus = useEventBus(Symbol('off'));
    const listener = vi.fn();

    bus.on(listener);
    bus.off(listener);
    bus.emit('a');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should be a no-op when off is called for an unknown key', () => {
    const bus = useEventBus(Symbol('unknown'));
    const listener = vi.fn();

    expect(() => bus.off(listener)).not.toThrow();
  });

  it('should fire once listeners exactly once', () => {
    const bus = useEventBus(Symbol('once'));
    const listener = vi.fn();

    bus.once(listener);
    bus.emit('a');
    bus.emit('b');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('a', undefined);
  });

  it('should allow stopping a once listener before it fires', () => {
    const bus = useEventBus(Symbol('once-stop'));
    const listener = vi.fn();

    const stop = bus.once(listener);
    stop();
    bus.emit('a');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should remove all listeners on reset', () => {
    const bus = useEventBus(Symbol('reset'));
    const a = vi.fn();
    const b = vi.fn();

    bus.on(a);
    bus.on(b);
    bus.reset();
    bus.emit('x');

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('should share listeners across buses with the same key', () => {
    const key: EventBusKey<string> = Symbol('shared');
    const busA = useEventBus(key);
    const busB = useEventBus(key);
    const listener = vi.fn();

    busA.on(listener);
    busB.emit('cross');

    expect(listener).toHaveBeenCalledWith('cross', undefined);
  });

  it('should isolate listeners across different keys', () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    useEventBus(Symbol('iso-a')).on(listenerA);
    useEventBus(Symbol('iso-b')).on(listenerB);
    useEventBus(Symbol('iso-a-emit'));

    // Emit on a fresh, unrelated key
    useEventBus(Symbol('iso-c')).emit('x');

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).not.toHaveBeenCalled();
  });

  it('should support string and number identifiers', () => {
    const strListener = vi.fn();
    const numListener = vi.fn();

    useEventBus('string-key').on(strListener);
    useEventBus(42).on(numListener);

    useEventBus('string-key').emit('s');
    useEventBus(42).emit('n');

    expect(strListener).toHaveBeenCalledWith('s', undefined);
    expect(numListener).toHaveBeenCalledWith('n', undefined);
  });

  it('should not throw when emitting with no listeners', () => {
    const bus = useEventBus(Symbol('empty'));

    expect(() => bus.emit('x')).not.toThrow();
  });

  it('should snapshot listeners so emit is stable against self-removal', () => {
    const bus = useEventBus(Symbol('snapshot'));
    const order: string[] = [];

    const stopFirst = bus.on(() => {
      order.push('first');
      stopFirst();
    });
    bus.on(() => order.push('second'));

    bus.emit('x');

    expect(order).toEqual(['first', 'second']);
  });

  it('should auto-unsubscribe listeners when the owning scope is disposed', () => {
    const key = Symbol('scope');
    const listener = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      const bus = useEventBus(key);
      bus.on(listener);
    });

    useEventBus(key).emit('before');
    expect(listener).toHaveBeenCalledTimes(1);

    scope.stop();

    useEventBus(key).emit('after');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not register scope cleanup when called outside a scope', () => {
    // Running outside any effectScope must still work and not throw.
    const bus = useEventBus(Symbol('no-scope'));
    const listener = vi.fn();

    const stop = bus.on(listener);
    bus.emit('x');
    stop();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
