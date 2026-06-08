import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useSwipe } from '.';

function withScope<T>(fn: () => T): { result: T; scope: ReturnType<typeof effectScope> } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, scope };
}

interface TouchPoint {
  clientX: number;
  clientY: number;
}

// jsdom does not implement the Touch/TouchEvent constructors fully; build a
// minimal event carrying the `touches` list our composable reads.
function dispatchTouch(el: EventTarget, type: string, points: TouchPoint[]): TouchEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as unknown as TouchEvent;
  Object.defineProperty(event, 'touches', {
    value: points.map(p => ({ clientX: p.clientX, clientY: p.clientY })),
    configurable: true,
  });
  el.dispatchEvent(event as unknown as Event);
  return event;
}

function makeTarget(): HTMLElement {
  return document.createElement('div');
}

describe(useSwipe, () => {
  it('starts idle with zeroed coordinates and no direction', () => {
    const el = makeTarget();
    const { result, scope } = withScope(() => useSwipe(ref(el)));

    expect(result.isSwiping.value).toBeFalsy();
    expect(result.direction.value).toBe('none');
    expect(result.coordsStart.x).toBe(0);
    expect(result.coordsEnd.y).toBe(0);
    expect(result.lengthX.value).toBe(0);
    expect(result.lengthY.value).toBe(0);
    scope.stop();
  });

  it('records start coordinates and fires onSwipeStart on touchstart', () => {
    const el = makeTarget();
    const onSwipeStart = vi.fn();
    const { result, scope } = withScope(() => useSwipe(ref(el), { onSwipeStart }));

    dispatchTouch(el, 'touchstart', [{ clientX: 100, clientY: 100 }]);

    expect(onSwipeStart).toHaveBeenCalledTimes(1);
    expect(result.coordsStart.x).toBe(100);
    expect(result.coordsStart.y).toBe(100);
    expect(result.isSwiping.value).toBeFalsy();
    scope.stop();
  });

  it('detects a left swipe once the threshold is exceeded', () => {
    const el = makeTarget();
    const onSwipe = vi.fn();
    const onSwipeEnd = vi.fn();
    const { result, scope } = withScope(() =>
      useSwipe(ref(el), { threshold: 50, onSwipe, onSwipeEnd }));

    dispatchTouch(el, 'touchstart', [{ clientX: 200, clientY: 100 }]);
    // Move left less than threshold: not swiping yet.
    dispatchTouch(el, 'touchmove', [{ clientX: 180, clientY: 100 }]);
    expect(result.isSwiping.value).toBeFalsy();
    expect(onSwipe).not.toHaveBeenCalled();

    // Move past the threshold.
    dispatchTouch(el, 'touchmove', [{ clientX: 100, clientY: 100 }]);
    expect(result.isSwiping.value).toBeTruthy();
    expect(onSwipe).toHaveBeenCalled();
    expect(result.direction.value).toBe('left');
    expect(result.lengthX.value).toBe(-100);
    expect(result.lengthY.value).toBe(0);

    dispatchTouch(el, 'touchend', [{ clientX: 100, clientY: 100 }]);
    expect(onSwipeEnd).toHaveBeenCalledTimes(1);
    expect(onSwipeEnd.mock.calls[0]![1]).toBe('left');
    expect(result.isSwiping.value).toBeFalsy();
    scope.stop();
  });

  it('detects a right swipe', () => {
    const el = makeTarget();
    const { result, scope } = withScope(() => useSwipe(ref(el)));

    dispatchTouch(el, 'touchstart', [{ clientX: 50, clientY: 100 }]);
    dispatchTouch(el, 'touchmove', [{ clientX: 200, clientY: 100 }]);

    expect(result.direction.value).toBe('right');
    expect(result.lengthX.value).toBe(150);
    scope.stop();
  });

  it('detects up and down swipes on the dominant axis', () => {
    const up = makeTarget();
    const { result: upResult, scope: upScope } = withScope(() => useSwipe(ref(up)));
    dispatchTouch(up, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(up, 'touchmove', [{ clientX: 100, clientY: 100 }]);
    expect(upResult.direction.value).toBe('up');
    expect(upResult.lengthY.value).toBe(-100);
    upScope.stop();

    const down = makeTarget();
    const { result: downResult, scope: downScope } = withScope(() => useSwipe(ref(down)));
    dispatchTouch(down, 'touchstart', [{ clientX: 100, clientY: 50 }]);
    dispatchTouch(down, 'touchmove', [{ clientX: 100, clientY: 200 }]);
    expect(downResult.direction.value).toBe('down');
    expect(downResult.lengthY.value).toBe(150);
    downScope.stop();
  });

  it('ignores multi-touch gestures', () => {
    const el = makeTarget();
    const onSwipeStart = vi.fn();
    const { result, scope } = withScope(() => useSwipe(ref(el), { onSwipeStart }));

    dispatchTouch(el, 'touchstart', [
      { clientX: 100, clientY: 100 },
      { clientX: 150, clientY: 150 },
    ]);

    expect(onSwipeStart).not.toHaveBeenCalled();
    expect(result.coordsStart.x).toBe(0);
    scope.stop();
  });

  it('does not call preventDefault when passive (default)', () => {
    const el = makeTarget();
    const { scope } = withScope(() => useSwipe(ref(el)));

    dispatchTouch(el, 'touchstart', [{ clientX: 200, clientY: 100 }]);
    const moveEvent = dispatchTouch(el, 'touchmove', [{ clientX: 100, clientY: 100 }]);

    expect(moveEvent.defaultPrevented).toBeFalsy();
    scope.stop();
  });

  it('calls preventDefault on horizontal move when passive is false', () => {
    const el = makeTarget();
    const { scope } = withScope(() => useSwipe(ref(el), { passive: false }));

    dispatchTouch(el, 'touchstart', [{ clientX: 200, clientY: 100 }]);
    // Horizontal dominant move should preventDefault to block scrolling.
    const moveEvent = dispatchTouch(el, 'touchmove', [{ clientX: 100, clientY: 100 }]);
    expect(moveEvent.defaultPrevented).toBeTruthy();

    // Vertical dominant move should NOT preventDefault.
    dispatchTouch(el, 'touchstart', [{ clientX: 100, clientY: 200 }]);
    const verticalMove = dispatchTouch(el, 'touchmove', [{ clientX: 100, clientY: 100 }]);
    expect(verticalMove.defaultPrevented).toBeFalsy();
    scope.stop();
  });

  it('respects a custom threshold', () => {
    const el = makeTarget();
    const { result, scope } = withScope(() => useSwipe(ref(el), { threshold: 200 }));

    dispatchTouch(el, 'touchstart', [{ clientX: 0, clientY: 100 }]);
    dispatchTouch(el, 'touchmove', [{ clientX: 150, clientY: 100 }]);
    expect(result.isSwiping.value).toBeFalsy();
    expect(result.direction.value).toBe('none');

    dispatchTouch(el, 'touchmove', [{ clientX: 250, clientY: 100 }]);
    expect(result.isSwiping.value).toBeTruthy();
    expect(result.direction.value).toBe('right');
    scope.stop();
  });

  it('stop() removes listeners so further touches are ignored', () => {
    const el = makeTarget();
    const onSwipeStart = vi.fn();
    const { result, scope } = withScope(() => useSwipe(ref(el), { onSwipeStart }));

    result.stop();

    dispatchTouch(el, 'touchstart', [{ clientX: 100, clientY: 100 }]);
    expect(onSwipeStart).not.toHaveBeenCalled();
    expect(result.coordsStart.x).toBe(0);
    scope.stop();
  });

  it('re-binds listeners when the target ref changes', async () => {
    const a = makeTarget();
    const b = makeTarget();
    const target = ref<HTMLElement | null>(a);
    const onSwipeStart = vi.fn();
    const { scope } = withScope(() => useSwipe(target, { onSwipeStart }));

    dispatchTouch(a, 'touchstart', [{ clientX: 10, clientY: 10 }]);
    expect(onSwipeStart).toHaveBeenCalledTimes(1);

    target.value = b;
    await nextTick();

    // Old target no longer listened to.
    dispatchTouch(a, 'touchstart', [{ clientX: 10, clientY: 10 }]);
    expect(onSwipeStart).toHaveBeenCalledTimes(1);

    // New target is.
    dispatchTouch(b, 'touchstart', [{ clientX: 20, clientY: 20 }]);
    expect(onSwipeStart).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('does nothing and stays safe when window is undefined (SSR)', () => {
    const el = makeTarget();
    const { result, scope } = withScope(() =>
      useSwipe(ref(el), { window: undefined }));

    expect(result.isSwiping.value).toBeFalsy();
    expect(result.direction.value).toBe('none');
    expect(() => result.stop()).not.toThrow();

    // No listeners registered, so a touch is a no-op.
    dispatchTouch(el, 'touchstart', [{ clientX: 100, clientY: 100 }]);
    expect(result.coordsStart.x).toBe(0);
    scope.stop();
  });
});
