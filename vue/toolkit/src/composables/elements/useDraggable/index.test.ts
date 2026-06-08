import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useDraggable } from '.';

interface PointerCoords {
  clientX?: number;
  clientY?: number;
  button?: number;
  pointerType?: string;
}

function dispatchPointer(targetEl: EventTarget, type: string, coords: PointerCoords = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: coords.clientX ?? 0, configurable: true });
  Object.defineProperty(event, 'clientY', { value: coords.clientY ?? 0, configurable: true });
  Object.defineProperty(event, 'button', { value: coords.button ?? 0, configurable: true });
  Object.defineProperty(event, 'pointerType', { value: coords.pointerType ?? 'mouse', configurable: true });
  Object.defineProperty(event, 'target', { value: targetEl, configurable: true });
  targetEl.dispatchEvent(event);
  return event;
}

function makeElement(rect: Partial<DOMRect> = {}): HTMLElement {
  const el = document.createElement('div');
  const full: DOMRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect;
  el.getBoundingClientRect = () => full;
  return el;
}

describe(useDraggable, () => {
  it('uses the initial value', () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { initialValue: { x: 20, y: 30 } });
    });
    expect(drag!.x.value).toBe(20);
    expect(drag!.y.value).toBe(30);
    expect(drag!.position.value).toEqual({ x: 20, y: 30 });
    expect(drag!.isDragging.value).toBeFalsy();
    scope.stop();
  });

  it('defaults to { x: 0, y: 0 }', () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el);
    });
    expect(drag!.position.value).toEqual({ x: 0, y: 0 });
    scope.stop();
  });

  it('drags along both axes and tracks isDragging', async () => {
    const el = makeElement({ left: 0, top: 0, width: 50, height: 50 });
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el);
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 10, clientY: 10 });
    expect(drag!.isDragging.value).toBeTruthy();

    dispatchPointer(globalThis, 'pointermove', { clientX: 40, clientY: 60 });
    // delta captured at start was (10, 10); new pos = client - delta
    expect(drag!.position.value).toEqual({ x: 30, y: 50 });

    dispatchPointer(globalThis, 'pointerup', { clientX: 40, clientY: 60 });
    expect(drag!.isDragging.value).toBeFalsy();

    // moving after end does nothing
    dispatchPointer(globalThis, 'pointermove', { clientX: 100, clientY: 100 });
    expect(drag!.position.value).toEqual({ x: 30, y: 50 });
    scope.stop();
  });

  it('locks to the x axis', async () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { axis: 'x' });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(globalThis, 'pointermove', { clientX: 25, clientY: 99 });
    expect(drag!.position.value).toEqual({ x: 25, y: 0 });
    scope.stop();
  });

  it('locks to the y axis', async () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { axis: 'y' });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(globalThis, 'pointermove', { clientX: 99, clientY: 25 });
    expect(drag!.position.value).toEqual({ x: 0, y: 25 });
    scope.stop();
  });

  it('fires onStart, onMove and onEnd callbacks', async () => {
    const el = makeElement();
    const onStart = vi.fn();
    const onMove = vi.fn();
    const onEnd = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useDraggable(el, { onStart, onMove, onEnd });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 5, clientY: 5 });
    dispatchPointer(globalThis, 'pointermove', { clientX: 15, clientY: 25 });
    dispatchPointer(globalThis, 'pointerup', { clientX: 15, clientY: 25 });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({ x: 10, y: 20 }, expect.any(Object));
    expect(onEnd).toHaveBeenCalledWith({ x: 10, y: 20 }, expect.any(Object));
    scope.stop();
  });

  it('cancels the drag when onStart returns false', async () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { onStart: () => false });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(drag!.isDragging.value).toBeFalsy();

    dispatchPointer(globalThis, 'pointermove', { clientX: 50, clientY: 50 });
    expect(drag!.position.value).toEqual({ x: 0, y: 0 });
    scope.stop();
  });

  it('does not drag when disabled', async () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { disabled: true });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(globalThis, 'pointermove', { clientX: 30, clientY: 30 });
    expect(drag!.isDragging.value).toBeFalsy();
    expect(drag!.position.value).toEqual({ x: 0, y: 0 });
    scope.stop();
  });

  it('respects a reactive disabled flag', async () => {
    const el = makeElement();
    const disabled = shallowRef(true);
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { disabled });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(drag!.isDragging.value).toBeFalsy();

    disabled.value = false;
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    dispatchPointer(globalThis, 'pointermove', { clientX: 10, clientY: 10 });
    expect(drag!.position.value).toEqual({ x: 10, y: 10 });
    scope.stop();
  });

  it('ignores non-allowed pointer buttons', async () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el);
    });
    await nextTick();

    // right button (2) should be ignored when default buttons = [0]
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0, button: 2 });
    expect(drag!.isDragging.value).toBeFalsy();
    scope.stop();
  });

  it('filters by pointer type', async () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { pointerTypes: ['touch'] });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerType: 'mouse' });
    expect(drag!.isDragging.value).toBeFalsy();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerType: 'touch' });
    expect(drag!.isDragging.value).toBeTruthy();
    scope.stop();
  });

  it('starts from a separate handle element', async () => {
    const el = makeElement();
    const handle = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { handle });
    });
    await nextTick();

    // pointerdown on the target itself should NOT start a drag
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(drag!.isDragging.value).toBeFalsy();

    // pointerdown on the handle should
    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(drag!.isDragging.value).toBeTruthy();
    scope.stop();
  });

  it('honours exact (only starts on the target itself, not children)', async () => {
    const el = makeElement();
    const child = makeElement();
    el.appendChild(child);
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { exact: true });
    });
    await nextTick();

    // event.target is the child -> should be ignored
    dispatchPointer(child, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(drag!.isDragging.value).toBeFalsy();

    // event.target is the element itself -> allowed
    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    expect(drag!.isDragging.value).toBeTruthy();
    scope.stop();
  });

  it('clamps within a container element', async () => {
    const el = makeElement({ left: 0, top: 0, width: 20, height: 20 });
    const container = makeElement({ left: 0, top: 0, width: 100, height: 100 });
    Object.defineProperty(container, 'scrollWidth', { value: 100, configurable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(container, 'scrollLeft', { value: 0, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true });

    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { containerElement: container });
    });
    await nextTick();

    dispatchPointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    // try to drag way past the container; clamps to scrollWidth - width = 80
    dispatchPointer(globalThis, 'pointermove', { clientX: 500, clientY: 500 });
    expect(drag!.position.value).toEqual({ x: 80, y: 80 });

    // negative also clamps to 0
    dispatchPointer(globalThis, 'pointermove', { clientX: -50, clientY: -50 });
    expect(drag!.position.value).toEqual({ x: 0, y: 0 });
    scope.stop();
  });

  it('exposes a writable x/y that updates position', () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el);
    });
    drag!.x.value = 11;
    drag!.y.value = 22;
    expect(drag!.position.value).toEqual({ x: 11, y: 22 });
    scope.stop();
  });

  it('produces a style string', () => {
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { initialValue: { x: 4, y: 8 } });
    });
    expect(drag!.style.value).toBe('left:4px;top:8px;');
    scope.stop();
  });

  it('attaches passive listeners when not preventing default', async () => {
    const el = makeElement();
    const addSpy = vi.spyOn(el, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      useDraggable(el);
    });
    await nextTick();

    const downCall = addSpy.mock.calls.find(([name]) => name === 'pointerdown');
    expect(downCall).toBeDefined();
    expect((downCall![2] as AddEventListenerOptions).passive).toBeTruthy();

    addSpy.mockRestore();
    scope.stop();
  });

  it('does nothing on the SSR path (no window)', () => {
    // Simulate a missing window by passing draggingElement undefined and a
    // detached element; the composable must still return sane defaults.
    const el = makeElement();
    const scope = effectScope();
    let drag: ReturnType<typeof useDraggable>;
    scope.run(() => {
      drag = useDraggable(el, { draggingElement: undefined });
    });
    expect(drag!.x.value).toBe(0);
    expect(drag!.y.value).toBe(0);
    expect(drag!.isDragging.value).toBeFalsy();
    expect(drag!.style.value).toBe('left:0px;top:0px;');
    scope.stop();
  });
});
