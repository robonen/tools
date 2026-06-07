import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { onKeyDown, onKeyPressed, onKeyStroke, onKeyUp } from '.';

function keydown(key: string, init: KeyboardEventInit = {}, target: EventTarget = globalThis) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
}

describe(onKeyStroke, () => {
  let stops: Array<() => void> = [];

  function track(stop: () => void) {
    stops.push(stop);
    return stop;
  }

  afterEach(() => {
    stops.forEach(stop => stop());
    stops = [];
  });

  it('fires the handler for a matching string key', () => {
    const handler = vi.fn();
    track(onKeyStroke('a', handler));

    keydown('a');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]).toBeInstanceOf(KeyboardEvent);
  });

  it('ignores non-matching keys', () => {
    const handler = vi.fn();
    track(onKeyStroke('a', handler));

    keydown('b');
    expect(handler).not.toHaveBeenCalled();
  });

  it('matches any key in an array filter', () => {
    const handler = vi.fn();
    track(onKeyStroke(['a', 'b', 'c'], handler));

    keydown('a');
    keydown('b');
    keydown('z');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('uses a predicate filter', () => {
    const handler = vi.fn();
    track(onKeyStroke((e: KeyboardEvent) => e.metaKey && e.key === 's', handler));

    keydown('s');
    expect(handler).not.toHaveBeenCalled();

    keydown('s', { metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches every key when filter is omitted', () => {
    const handler = vi.fn();
    track(onKeyStroke(handler));

    keydown('a');
    keydown('b');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('matches every key when filter is `true`', () => {
    const handler = vi.fn();
    track(onKeyStroke(true, handler));

    keydown('x');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports the handler-plus-options overload', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    track(onKeyStroke(handler, { target }));

    keydown('a', {}, target);
    expect(handler).toHaveBeenCalledTimes(1);

    keydown('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('attaches to a custom target', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    track(onKeyStroke('a', handler, { target }));

    keydown('a', {}, target);
    expect(handler).toHaveBeenCalledTimes(1);

    keydown('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('listens on a custom eventName', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    track(onKeyStroke('a', handler, { target, eventName: 'keyup' }));

    keydown('a', {}, target);
    expect(handler).not.toHaveBeenCalled();

    target.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dedupe ignores auto-repeated events', () => {
    const handler = vi.fn();
    track(onKeyStroke('a', handler, { dedupe: true }));

    keydown('a', { repeat: false });
    keydown('a', { repeat: true });
    keydown('a', { repeat: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dedupe accepts a reactive ref', () => {
    const handler = vi.fn();
    const dedupe = ref(false);
    track(onKeyStroke('a', handler, { dedupe }));

    keydown('a', { repeat: true });
    expect(handler).toHaveBeenCalledTimes(1);

    dedupe.value = true;
    keydown('a', { repeat: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('without dedupe still fires for repeated events', () => {
    const handler = vi.fn();
    track(onKeyStroke('a', handler));

    keydown('a', { repeat: true });
    keydown('a', { repeat: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('stop handle removes the listener', () => {
    const handler = vi.fn();
    const stop = onKeyStroke('a', handler);

    stop();
    keydown('a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('cleans up when the effect scope is disposed', () => {
    const handler = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      onKeyStroke('a', handler);
    });

    scope.stop();
    keydown('a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns a no-op when target is unavailable (SSR / unsupported)', () => {
    const handler = vi.fn();
    const stop = onKeyStroke('a', handler, { target: null });

    expect(typeof stop).toBe('function');
    keydown('a');
    expect(handler).not.toHaveBeenCalled();
    // stop should be safely callable
    expect(() => stop()).not.toThrow();
  });
});

describe(onKeyDown, () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  it('listens for keydown', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    stop = onKeyDown('a', handler, { target });

    keydown('a', {}, target);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe(onKeyUp, () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  it('listens for keyup', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    stop = onKeyUp('a', handler, { target });

    keydown('a', {}, target);
    expect(handler).not.toHaveBeenCalled();

    target.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe(onKeyPressed, () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  it('listens for keypress', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    stop = onKeyPressed('a', handler, { target });

    keydown('a', {}, target);
    expect(handler).not.toHaveBeenCalled();

    target.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
