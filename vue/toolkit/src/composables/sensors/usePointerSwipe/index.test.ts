import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { usePointerSwipe } from '.';

interface PointerProps {
  clientX?: number;
  clientY?: number;
  pointerId?: number;
  pointerType?: string;
  buttons?: number;
}

function dispatchPointer(target: EventTarget, type: string, props: PointerProps = {}) {
  const event = new Event(type, { bubbles: true });
  const merged: PointerProps = { buttons: 1, pointerId: 1, pointerType: 'mouse', ...props };
  for (const [key, value] of Object.entries(merged))
    Object.defineProperty(event, key, { value, configurable: true });
  // Provide a target that supports pointer capture (jsdom lacks it).
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  target.dispatchEvent(event);
  return event;
}

function createTarget() {
  const el = document.createElement('div');
  // jsdom does not implement setPointerCapture; stub it to a noop spy.
  (el as any).setPointerCapture = vi.fn();
  document.body.appendChild(el);
  return el;
}

describe(usePointerSwipe, () => {
  it('starts from the default state', () => {
    const el = createTarget();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el);
    });

    expect(swipe!.isSwiping.value).toBeFalsy();
    expect(swipe!.direction.value).toBe('none');
    expect(swipe!.posStart.x).toBe(0);
    expect(swipe!.posStart.y).toBe(0);
    expect(swipe!.posEnd.x).toBe(0);
    expect(swipe!.posEnd.y).toBe(0);
    expect(swipe!.distanceX.value).toBe(0);
    expect(swipe!.distanceY.value).toBe(0);
    scope.stop();
  });

  it('records start position and fires onSwipeStart on pointerdown', async () => {
    const el = createTarget();
    const onSwipeStart = vi.fn();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { onSwipeStart });
    });

    dispatchPointer(el, 'pointerdown', { clientX: 10, clientY: 20 });
    await nextTick();

    expect(swipe!.posStart.x).toBe(10);
    expect(swipe!.posStart.y).toBe(20);
    expect(swipe!.posEnd.x).toBe(10);
    expect(swipe!.posEnd.y).toBe(20);
    expect(onSwipeStart).toHaveBeenCalledTimes(1);
    expect((el as any).setPointerCapture).toHaveBeenCalledWith(1);
    scope.stop();
  });

  it('detects a horizontal swipe (left) once threshold is exceeded', async () => {
    const el = createTarget();
    const onSwipe = vi.fn();
    const onSwipeEnd = vi.fn();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { threshold: 50, onSwipe, onSwipeEnd });
    });

    dispatchPointer(el, 'pointerdown', { clientX: 100, clientY: 100 });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeFalsy();

    // small move, under threshold
    dispatchPointer(el, 'pointermove', { clientX: 90, clientY: 100 });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeFalsy();
    expect(onSwipe).not.toHaveBeenCalled();

    // move left past threshold (posStart.x - posEnd.x = 100 - 40 = 60 > 50)
    dispatchPointer(el, 'pointermove', { clientX: 40, clientY: 100 });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeTruthy();
    expect(swipe!.distanceX.value).toBe(60);
    expect(swipe!.direction.value).toBe('left');
    expect(onSwipe).toHaveBeenCalled();

    dispatchPointer(el, 'pointerup', { clientX: 40, clientY: 100, buttons: 0 });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeFalsy();
    expect(onSwipeEnd).toHaveBeenCalledTimes(1);
    expect(onSwipeEnd.mock.calls[0]![1]).toBe('left');
    scope.stop();
  });

  it('resolves right / up / down directions', async () => {
    const el = createTarget();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { threshold: 10 });
    });

    // right: posStart.x - posEnd.x < 0
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(el, 'pointermove', { clientX: 100, clientY: 0 });
    await nextTick();
    expect(swipe!.direction.value).toBe('right');
    dispatchPointer(el, 'pointerup', { clientX: 100, clientY: 0, buttons: 0 });
    await nextTick();

    // up: posStart.y - posEnd.y > 0
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 100 });
    dispatchPointer(el, 'pointermove', { clientX: 0, clientY: 0 });
    await nextTick();
    expect(swipe!.direction.value).toBe('up');
    dispatchPointer(el, 'pointerup', { clientX: 0, clientY: 0, buttons: 0 });
    await nextTick();

    // down: posStart.y - posEnd.y < 0
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(el, 'pointermove', { clientX: 0, clientY: 100 });
    await nextTick();
    expect(swipe!.direction.value).toBe('down');
    scope.stop();
  });

  it('ignores pointermove when no pointer is down', async () => {
    const el = createTarget();
    const onSwipe = vi.fn();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { threshold: 10, onSwipe });
    });

    dispatchPointer(el, 'pointermove', { clientX: 200, clientY: 200 });
    await nextTick();

    expect(swipe!.posEnd.x).toBe(0);
    expect(swipe!.isSwiping.value).toBeFalsy();
    expect(onSwipe).not.toHaveBeenCalled();
    scope.stop();
  });

  it('filters by pointerTypes', async () => {
    const el = createTarget();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { threshold: 10, pointerTypes: ['touch'] });
    });

    // mouse rejected
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerType: 'mouse' });
    dispatchPointer(el, 'pointermove', { clientX: 100, clientY: 0, pointerType: 'mouse' });
    await nextTick();
    expect(swipe!.posStart.x).toBe(0);
    expect(swipe!.isSwiping.value).toBeFalsy();

    // touch accepted
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerType: 'touch' });
    dispatchPointer(el, 'pointermove', { clientX: 100, clientY: 0, pointerType: 'touch' });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeTruthy();
    expect(swipe!.direction.value).toBe('right');
    scope.stop();
  });

  it('stop() removes the listeners', async () => {
    const el = createTarget();
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { threshold: 10 });
    });

    swipe!.stop();

    expect(removeSpy.mock.calls.some(([name]) => name === 'pointerdown')).toBeTruthy();
    expect(removeSpy.mock.calls.some(([name]) => name === 'pointermove')).toBeTruthy();

    // after stop, further events have no effect
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(el, 'pointermove', { clientX: 100, clientY: 0 });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeFalsy();

    removeSpy.mockRestore();
    scope.stop();
  });

  it('attaches passive listeners', () => {
    const el = createTarget();
    const addSpy = vi.spyOn(el, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      usePointerSwipe(el);
    });

    const downCall = addSpy.mock.calls.find(([name]) => name === 'pointerdown');
    expect(downCall).toBeDefined();
    expect((downCall![2] as AddEventListenerOptions).passive).toBeTruthy();

    addSpy.mockRestore();
    scope.stop();
  });

  it('re-binds listeners when the target ref changes', async () => {
    const elRef = shallowRef<HTMLElement | undefined>(undefined);
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(elRef, { threshold: 10 });
    });

    const el = createTarget();
    elRef.value = el;
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(el, 'pointermove', { clientX: 100, clientY: 0 });
    await nextTick();
    expect(swipe!.isSwiping.value).toBeTruthy();
    scope.stop();
  });

  it('does nothing when window is unavailable (SSR)', () => {
    const el = createTarget();
    const scope = effectScope();
    let swipe: ReturnType<typeof usePointerSwipe>;
    scope.run(() => {
      swipe = usePointerSwipe(el, { window: undefined });
    });

    expect(swipe!.isSwiping.value).toBeFalsy();
    expect(swipe!.direction.value).toBe('none');
    expect(() => swipe!.stop()).not.toThrow();
    scope.stop();
  });
});
