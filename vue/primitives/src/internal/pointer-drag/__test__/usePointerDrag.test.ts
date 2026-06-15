import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { usePointerDrag } from '../usePointerDrag';
import type { UsePointerDragOptions } from '../usePointerDrag';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

/** One animation-frame tick, so the rAF-batched flush has run. */
function raf(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function down(el: Element, clientX: number, clientY: number, pointerId = 1): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId, button: 0, clientX, clientY, bubbles: true, cancelable: true }));
}
function move(el: Element, clientX: number, clientY: number, pointerId = 1): void {
  el.dispatchEvent(new PointerEvent('pointermove', { pointerId, clientX, clientY, bubbles: true }));
}
function up(el: Element, clientX: number, clientY: number, pointerId = 1): void {
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId, clientX, clientY, bubbles: true }));
}
function cancelPointer(el: Element, pointerId = 1): void {
  el.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true }));
}

function mountDrag(options: UsePointerDragOptions = {}) {
  const api = shallowRef<ReturnType<typeof usePointerDrag>>();
  const Harness = defineComponent({
    setup() {
      const el = shallowRef<HTMLElement | null>(null);
      api.value = usePointerDrag(el, options);
      return () => h('div', { ref: el, style: 'width:200px;height:200px;' });
    },
  });
  const wrapper = track(mount(Harness, { attachTo: document.body }));
  const el = wrapper.element as HTMLElement;
  return { wrapper, el, api };
}

describe('usePointerDrag', () => {
  it('a sub-threshold press is a click: onStart/onMove/onCommit never fire', async () => {
    const onStart = vi.fn();
    const onCommit = vi.fn();
    const onEnd = vi.fn();
    const { el, api } = mountDrag({ threshold: 5, onStart, onCommit, onEnd });
    await nextTick();

    down(el, 50, 50);
    move(el, 52, 51); // < 5px in both axes
    await raf();
    up(el, 52, 51);
    await raf();

    expect(onStart).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(api.value!.isDragging.value).toBe(false);
    // onEnd does not fire when the drag never started.
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('a real drag toggles isDragging and commits once with the terminal total', async () => {
    const onCommit = vi.fn();
    const onStart = vi.fn();
    const { el, api } = mountDrag({ threshold: 3, onStart, onCommit });
    await nextTick();

    down(el, 100, 100);
    move(el, 140, 130);
    await raf();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(api.value!.isDragging.value).toBe(true);
    expect(api.value!.total.value).toEqual({ x: 40, y: 30 });

    up(el, 140, 130);
    await raf();

    expect(api.value!.isDragging.value).toBe(false);
    expect(onCommit).toHaveBeenCalledTimes(1);
    const committed = onCommit.mock.calls[0]![0];
    expect(committed.total).toEqual({ x: 40, y: 30 });
  });

  it('the final pointerup flush captures a move that had no rAF tick yet', async () => {
    const onCommit = vi.fn();
    const { el } = mountDrag({ threshold: 3, onCommit });
    await nextTick();

    down(el, 0, 0);
    move(el, 50, 0);
    await raf(); // establish the drag

    // A trailing move with NO rAF tick before the up — endDrag must flush it.
    move(el, 80, 0);
    up(el, 80, 0);
    await raf();

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]![0].total).toEqual({ x: 80, y: 0 });
  });

  it('pointercancel fires onEnd but NOT onCommit', async () => {
    const onEnd = vi.fn();
    const onCommit = vi.fn();
    const { el, api } = mountDrag({ threshold: 3, onEnd, onCommit });
    await nextTick();

    down(el, 0, 0);
    move(el, 40, 40);
    await raf();
    cancelPointer(el);
    await raf();

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![1].type).toBe('pointercancel');
    expect(onCommit).not.toHaveBeenCalled();
    expect(api.value!.isDragging.value).toBe(false);
  });

  it('a second pointerId during a drag is ignored (multi-touch guard)', async () => {
    const { el, api } = mountDrag({ threshold: 3 });
    await nextTick();

    down(el, 0, 0, 1);
    move(el, 40, 0, 1);
    await raf();
    expect(api.value!.total.value).toEqual({ x: 40, y: 0 });

    // Foreign pointer 2 must not move the gesture.
    move(el, 999, 999, 2);
    await raf();
    expect(api.value!.total.value).toEqual({ x: 40, y: 0 });

    // A foreign pointerup must not end the gesture either.
    up(el, 999, 999, 2);
    await raf();
    expect(api.value!.isDragging.value).toBe(true);

    up(el, 40, 0, 1);
    await raf();
    expect(api.value!.isDragging.value).toBe(false);
  });

  it('onStart returning false unwinds the gesture (clean re-press)', async () => {
    const onMove = vi.fn();
    const onCommit = vi.fn();
    const { el, api } = mountDrag({ threshold: 3, onStart: () => false, onMove, onCommit });
    await nextTick();

    down(el, 0, 0);
    move(el, 40, 0);
    await raf();

    expect(api.value!.isDragging.value).toBe(false);
    expect(onMove).not.toHaveBeenCalled();

    up(el, 40, 0);
    await raf();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('a pointerup on window (not the target) still ends the gesture', async () => {
    const onCommit = vi.fn();
    const { el, api } = mountDrag({ threshold: 3, onCommit });
    await nextTick();

    down(el, 0, 0);
    move(el, 40, 0);
    await raf();
    expect(api.value!.isDragging.value).toBe(true);

    // The release is seen on window, not the target (capture lost / pointer left
    // the element). The gesture must still end.
    globalThis.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 40, clientY: 0 }));
    await raf();

    expect(api.value!.isDragging.value).toBe(false);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('a target detached mid-drag does NOT strand the gesture (the stuck-handler bug)', async () => {
    const onCommit = vi.fn();
    const { el, api } = mountDrag({ threshold: 0, onCommit });
    await nextTick();

    down(el, 10, 0);
    move(el, 50, 0);
    await raf();
    expect(api.value!.isDragging.value).toBe(true);

    // Simulate the target being replaced/removed by a re-render during the drag.
    el.remove();
    // The release now happens with the original element gone; window must catch it.
    globalThis.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 50, clientY: 0 }));
    await raf();

    expect(api.value!.isDragging.value).toBe(false);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('cancel() aborts imperatively: onEnd fires, onCommit does not', async () => {
    const onEnd = vi.fn();
    const onCommit = vi.fn();
    const { el, api } = mountDrag({ threshold: 3, onEnd, onCommit });
    await nextTick();

    down(el, 0, 0);
    move(el, 40, 40);
    await raf();

    api.value!.cancel();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(api.value!.isDragging.value).toBe(false);
  });
});
