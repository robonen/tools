import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { onLongPress } from '.';

interface PointerInit { type: string; x?: number; y?: number }

// jsdom's PointerEvent does not reliably map clientX/clientY to the `x`/`y`
// shorthands the composable reads, so build a plain Event and stamp the fields.
function pointerEvent({ type, x = 0, y = 0 }: PointerInit): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as any;
  event.x = x;
  event.y = y;
  return event as PointerEvent;
}

function dispatch(el: EventTarget, init: PointerInit) {
  el.dispatchEvent(pointerEvent(init));
}

describe(onLongPress, () => {
  let scope: ReturnType<typeof effectScope>;
  let el: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    scope = effectScope();
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    scope.stop();
    el.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fires the handler after the default delay', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler);
    });

    dispatch(el, { type: 'pointerdown' });
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]).toBeInstanceOf(Event);
  });

  it('respects a custom numeric delay', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler, { delay: 1000 });
    });

    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(999);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports a function delay derived from the event', () => {
    const handler = vi.fn();
    const delay = vi.fn(() => 200);

    scope.run(() => {
      onLongPress(el, handler, { delay });
    });

    dispatch(el, { type: 'pointerdown' });
    expect(delay).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cancels the press on pointerup before the delay elapses', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler);
    });

    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(200);
    dispatch(el, { type: 'pointerup' });

    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('cancels the press on pointerleave before the delay elapses', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler);
    });

    dispatch(el, { type: 'pointerdown' });
    dispatch(el, { type: 'pointerleave' });

    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('cancels the press when the pointer moves beyond the distance threshold', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler, { distanceThreshold: 10 });
    });

    dispatch(el, { type: 'pointerdown', x: 0, y: 0 });
    dispatch(el, { type: 'pointermove', x: 20, y: 0 });

    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not cancel for small moves within the threshold', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler, { distanceThreshold: 10 });
    });

    dispatch(el, { type: 'pointerdown', x: 0, y: 0 });
    dispatch(el, { type: 'pointermove', x: 3, y: 3 });

    vi.advanceTimersByTime(500);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores movement when distanceThreshold is false', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler, { distanceThreshold: false });
    });

    dispatch(el, { type: 'pointerdown', x: 0, y: 0 });
    dispatch(el, { type: 'pointermove', x: 999, y: 999 });

    vi.advanceTimersByTime(500);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports duration, distance, and long-press status via onMouseUp', () => {
    const handler = vi.fn();
    const onMouseUp = vi.fn();

    scope.run(() => {
      onLongPress(el, handler, { onMouseUp });
    });

    dispatch(el, { type: 'pointerdown', x: 0, y: 0 });
    vi.advanceTimersByTime(500);
    expect(handler).toHaveBeenCalledTimes(1);

    dispatch(el, { type: 'pointerup', x: 3, y: 4 });

    expect(onMouseUp).toHaveBeenCalledTimes(1);
    const [duration, distance, isLongPress, event] = onMouseUp.mock.calls[0]!;
    expect(typeof duration).toBe('number');
    expect(distance).toBeCloseTo(5);
    expect(isLongPress).toBeTruthy();
    expect(event).toBeInstanceOf(Event);
  });

  it('reports a non-long-press when released early', () => {
    const handler = vi.fn();
    const onMouseUp = vi.fn();

    scope.run(() => {
      onLongPress(el, handler, { onMouseUp });
    });

    dispatch(el, { type: 'pointerdown', x: 0, y: 0 });
    vi.advanceTimersByTime(100);
    dispatch(el, { type: 'pointerup', x: 0, y: 0 });

    expect(handler).not.toHaveBeenCalled();
    expect(onMouseUp).toHaveBeenCalledTimes(1);
    expect(onMouseUp.mock.calls[0]![2]).toBeFalsy();
  });

  it('does not call onMouseUp when there was no preceding pointerdown', () => {
    const onMouseUp = vi.fn();

    scope.run(() => {
      onLongPress(el, vi.fn(), { onMouseUp });
    });

    dispatch(el, { type: 'pointerup' });
    expect(onMouseUp).not.toHaveBeenCalled();
  });

  it('only reacts to events on the element itself when self modifier is set', () => {
    const handler = vi.fn();
    const child = document.createElement('span');
    el.appendChild(child);

    scope.run(() => {
      onLongPress(el, handler, { modifiers: { self: true } });
    });

    // pointerdown bubbling up from a child should be ignored
    child.dispatchEvent(pointerEvent({ type: 'pointerdown' }));
    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();

    // pointerdown on the element itself fires
    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(500);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls preventDefault when the prevent modifier is set', () => {
    scope.run(() => {
      onLongPress(el, vi.fn(), { modifiers: { prevent: true } });
    });

    const event = pointerEvent({ type: 'pointerdown' });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    el.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('registers passive listeners by default and active when prevent is set', () => {
    const passiveEl = document.createElement('div');
    const activeEl = document.createElement('div');
    const passiveSpy = vi.spyOn(passiveEl, 'addEventListener');
    const activeSpy = vi.spyOn(activeEl, 'addEventListener');

    scope.run(() => {
      onLongPress(passiveEl, vi.fn());
      onLongPress(activeEl, vi.fn(), { modifiers: { prevent: true } });
    });

    expect(passiveSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), expect.objectContaining({ passive: true }));
    expect(activeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), expect.objectContaining({ passive: false }));
  });

  it('stops listening when the returned stop handle is called', () => {
    const handler = vi.fn();
    let stop!: () => void;

    scope.run(() => {
      stop = onLongPress(el, handler);
    });

    stop();

    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears a pending timeout when stopped mid-press', () => {
    const handler = vi.fn();
    let stop!: () => void;

    scope.run(() => {
      stop = onLongPress(el, handler);
    });

    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(200);
    stop();

    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('auto-cleans up when the effect scope is disposed', () => {
    const handler = vi.fn();

    scope.run(() => {
      onLongPress(el, handler);
    });

    scope.stop();

    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('reacts to a reactive target', () => {
    const handler = vi.fn();
    const target = ref<HTMLElement | null>(null);

    scope.run(() => {
      onLongPress(target, handler);
    });

    // No target yet: pointer events on a detached element do nothing.
    dispatch(el, { type: 'pointerdown' });
    vi.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns noop-safe stop when the target is undefined', () => {
    let stop!: () => void;

    scope.run(() => {
      stop = onLongPress(undefined, vi.fn());
    });

    expect(stop).toBeTypeOf('function');
    expect(() => stop()).not.toThrow();
  });
});
