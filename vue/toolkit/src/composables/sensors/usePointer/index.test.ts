import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { usePointer } from '.';

interface PointerProps {
  x?: number;
  y?: number;
  pressure?: number;
  pointerId?: number;
  tiltX?: number;
  tiltY?: number;
  width?: number;
  height?: number;
  twist?: number;
  pointerType?: string;
}

function dispatchPointer(target: EventTarget, type: string, props: PointerProps = {}) {
  const event = new Event(type, { bubbles: true });
  for (const [key, value] of Object.entries(props))
    Object.defineProperty(event, key, { value, configurable: true });
  target.dispatchEvent(event);
  return event;
}

describe(usePointer, () => {
  it('starts from the default state', () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer();
    });

    expect(ptr!.x.value).toBe(0);
    expect(ptr!.y.value).toBe(0);
    expect(ptr!.pressure.value).toBe(0);
    expect(ptr!.pointerId.value).toBe(0);
    expect(ptr!.tiltX.value).toBe(0);
    expect(ptr!.tiltY.value).toBe(0);
    expect(ptr!.width.value).toBe(0);
    expect(ptr!.height.value).toBe(0);
    expect(ptr!.twist.value).toBe(0);
    expect(ptr!.pointerType.value).toBe(null);
    expect(ptr!.isInside.value).toBeFalsy();
    scope.stop();
  });

  it('merges the initial value over defaults', () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer({ initialValue: { x: 12, pressure: 0.5 } });
    });

    expect(ptr!.x.value).toBe(12);
    expect(ptr!.pressure.value).toBe(0.5);
    expect(ptr!.y.value).toBe(0);
    scope.stop();
  });

  it('tracks pointermove and populates the full state', async () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer();
    });

    dispatchPointer(globalThis, 'pointermove', {
      x: 100,
      y: 200,
      pressure: 0.7,
      pointerId: 3,
      tiltX: 10,
      tiltY: -5,
      width: 4,
      height: 6,
      twist: 90,
      pointerType: 'pen',
    });
    await nextTick();

    expect(ptr!.x.value).toBe(100);
    expect(ptr!.y.value).toBe(200);
    expect(ptr!.pressure.value).toBe(0.7);
    expect(ptr!.pointerId.value).toBe(3);
    expect(ptr!.tiltX.value).toBe(10);
    expect(ptr!.tiltY.value).toBe(-5);
    expect(ptr!.width.value).toBe(4);
    expect(ptr!.height.value).toBe(6);
    expect(ptr!.twist.value).toBe(90);
    expect(ptr!.pointerType.value).toBe('pen');
    scope.stop();
  });

  it('sets isInside true on pointer activity and false on pointerleave', async () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer();
    });

    expect(ptr!.isInside.value).toBeFalsy();

    dispatchPointer(globalThis, 'pointerdown', { x: 1, y: 2, pointerType: 'mouse' });
    await nextTick();
    expect(ptr!.isInside.value).toBeTruthy();

    dispatchPointer(globalThis, 'pointerleave');
    await nextTick();
    expect(ptr!.isInside.value).toBeFalsy();
    scope.stop();
  });

  it('tracks pointerdown and pointerup', async () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer();
    });

    dispatchPointer(globalThis, 'pointerdown', { x: 5, y: 5, pointerType: 'mouse' });
    await nextTick();
    expect(ptr!.x.value).toBe(5);

    dispatchPointer(globalThis, 'pointerup', { x: 9, y: 9, pointerType: 'mouse' });
    await nextTick();
    expect(ptr!.x.value).toBe(9);
    expect(ptr!.y.value).toBe(9);
    scope.stop();
  });

  it('ignores events whose pointerType is not allowed', async () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer({ pointerTypes: ['pen'], initialValue: { x: 1, y: 2 } });
    });

    dispatchPointer(globalThis, 'pointermove', { x: 50, y: 60, pointerType: 'mouse' });
    await nextTick();
    // mouse rejected: position unchanged, but isInside still flips true
    expect(ptr!.x.value).toBe(1);
    expect(ptr!.y.value).toBe(2);
    expect(ptr!.isInside.value).toBeTruthy();

    dispatchPointer(globalThis, 'pointermove', { x: 50, y: 60, pointerType: 'pen' });
    await nextTick();
    expect(ptr!.x.value).toBe(50);
    expect(ptr!.y.value).toBe(60);
    expect(ptr!.pointerType.value).toBe('pen');
    scope.stop();
  });

  it('attaches passive listeners', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      usePointer();
    });

    const moveCall = addSpy.mock.calls.find(([name]) => name === 'pointermove');
    expect(moveCall).toBeDefined();
    expect((moveCall![2] as AddEventListenerOptions).passive).toBeTruthy();

    addSpy.mockRestore();
    scope.stop();
  });

  it('listens on a custom element target', async () => {
    const el = document.createElement('div');
    const elRef = shallowRef(el);
    const addSpy = vi.spyOn(el, 'addEventListener');

    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer({ target: elRef });
    });
    await nextTick();

    expect(addSpy.mock.calls.some(([name]) => name === 'pointermove')).toBeTruthy();

    dispatchPointer(el, 'pointermove', { x: 7, y: 8, pointerType: 'mouse' });
    await nextTick();

    expect(ptr!.x.value).toBe(7);
    expect(ptr!.y.value).toBe(8);

    addSpy.mockRestore();
    scope.stop();
  });

  it('exposes writable state refs', () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer();
    });

    ptr!.x.value = 42;
    expect(ptr!.x.value).toBe(42);
    scope.stop();
  });

  it('does nothing when window is unavailable (SSR)', () => {
    const scope = effectScope();
    let ptr: ReturnType<typeof usePointer>;
    scope.run(() => {
      ptr = usePointer({ window: undefined, target: undefined });
    });

    expect(ptr!.x.value).toBe(0);
    expect(ptr!.y.value).toBe(0);
    expect(ptr!.pointerType.value).toBe(null);
    expect(ptr!.isInside.value).toBeFalsy();
    scope.stop();
  });
});
