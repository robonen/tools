import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useMouse } from '.';

function dispatchMouseMove(target: EventTarget, coords: Partial<Record<'pageX' | 'pageY' | 'clientX' | 'clientY' | 'screenX' | 'screenY' | 'movementX' | 'movementY', number>>) {
  const event = new MouseEvent('mousemove');
  for (const [key, value] of Object.entries(coords))
    Object.defineProperty(event, key, { value, configurable: true });
  target.dispatchEvent(event);
  return event;
}

describe(useMouse, () => {
  it('uses the initial value', () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ initialValue: { x: 5, y: 10 } });
    });
    expect(mouse!.x.value).toBe(5);
    expect(mouse!.y.value).toBe(10);
    scope.stop();
  });

  it('tracks mousemove with page coordinates', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse();
    });

    dispatchMouseMove(globalThis, { pageX: 100, pageY: 200 });
    await nextTick();

    expect(mouse!.x.value).toBe(100);
    expect(mouse!.y.value).toBe(200);
    expect(mouse!.sourceType.value).toBe('mouse');
    scope.stop();
  });

  it('supports client coordinate type', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ type: 'client' });
    });

    const event = new MouseEvent('mousemove', { clientX: 7, clientY: 9 });
    globalThis.dispatchEvent(event);
    await nextTick();

    expect(mouse!.x.value).toBe(7);
    expect(mouse!.y.value).toBe(9);
    scope.stop();
  });

  it('supports screen coordinate type', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ type: 'screen' });
    });

    const event = new MouseEvent('mousemove', { screenX: 11, screenY: 22 });
    globalThis.dispatchEvent(event);
    await nextTick();

    expect(mouse!.x.value).toBe(11);
    expect(mouse!.y.value).toBe(22);
    scope.stop();
  });

  it('supports a custom extractor function', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ type: e => [(e as MouseEvent).pageX * 2, (e as MouseEvent).pageY * 2] });
    });

    dispatchMouseMove(globalThis, { pageX: 3, pageY: 4 });
    await nextTick();

    expect(mouse!.x.value).toBe(6);
    expect(mouse!.y.value).toBe(8);
    scope.stop();
  });

  it('does not update when the extractor returns null', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    // a custom extractor that opts out of updating
    scope.run(() => {
      mouse = useMouse({ type: () => null, initialValue: { x: 1, y: 2 } });
    });

    dispatchMouseMove(globalThis, { pageX: 99, pageY: 99 });
    await nextTick();

    expect(mouse!.x.value).toBe(1);
    expect(mouse!.y.value).toBe(2);
    expect(mouse!.sourceType.value).toBe(null);
    scope.stop();
  });

  it('tracks touch events', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse();
    });

    const touch = { clientX: 0, clientY: 0, pageX: 50, pageY: 60 } as Touch;
    const event = new Event('touchstart') as TouchEvent;
    Object.defineProperty(event, 'touches', { value: [touch], configurable: true });
    globalThis.dispatchEvent(event);
    await nextTick();

    expect(mouse!.x.value).toBe(50);
    expect(mouse!.y.value).toBe(60);
    expect(mouse!.sourceType.value).toBe('touch');
    scope.stop();
  });

  it('ignores touch events when touch is disabled', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ touch: false, initialValue: { x: 1, y: 1 } });
    });

    const touch = { pageX: 50, pageY: 60 } as Touch;
    const event = new Event('touchstart') as TouchEvent;
    Object.defineProperty(event, 'touches', { value: [touch], configurable: true });
    globalThis.dispatchEvent(event);
    await nextTick();

    expect(mouse!.x.value).toBe(1);
    expect(mouse!.y.value).toBe(1);
    scope.stop();
  });

  it('resets on touchend when resetOnTouchEnds is set', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ resetOnTouchEnds: true, initialValue: { x: 9, y: 9 } });
    });

    const touch = { pageX: 50, pageY: 60 } as Touch;
    const start = new Event('touchstart') as TouchEvent;
    Object.defineProperty(start, 'touches', { value: [touch], configurable: true });
    globalThis.dispatchEvent(start);
    await nextTick();
    expect(mouse!.x.value).toBe(50);

    globalThis.dispatchEvent(new Event('touchend'));
    await nextTick();
    expect(mouse!.x.value).toBe(9);
    expect(mouse!.y.value).toBe(9);
    scope.stop();
  });

  it('updates page coordinates on scroll without pointer movement', async () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ type: 'page' });
    });

    // record a mouse position while scrollX/scrollY are 0
    (globalThis as any).scrollX = 0;
    (globalThis as any).scrollY = 0;
    dispatchMouseMove(globalThis, { pageX: 100, pageY: 100 });
    await nextTick();
    expect(mouse!.x.value).toBe(100);

    // scroll the page; page coordinates should shift by the scroll delta
    (globalThis as any).scrollX = 30;
    (globalThis as any).scrollY = 40;
    globalThis.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(mouse!.x.value).toBe(130);
    expect(mouse!.y.value).toBe(140);

    (globalThis as any).scrollX = 0;
    (globalThis as any).scrollY = 0;
    scope.stop();
  });

  it('does not register a scroll listener for non-page types', async () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      useMouse({ type: 'client' });
    });

    const scrollCalls = addSpy.mock.calls.filter(([name]) => name === 'scroll');
    expect(scrollCalls).toHaveLength(0);

    addSpy.mockRestore();
    scope.stop();
  });

  it('attaches passive listeners', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      useMouse();
    });

    const moveCall = addSpy.mock.calls.find(([name]) => name === 'mousemove');
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
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ target: elRef, type: 'client' });
    });
    await nextTick();

    expect(addSpy.mock.calls.some(([name]) => name === 'mousemove')).toBeTruthy();

    const event = new MouseEvent('mousemove', { clientX: 5, clientY: 6 });
    el.dispatchEvent(event);
    await nextTick();

    expect(mouse!.x.value).toBe(5);
    expect(mouse!.y.value).toBe(6);

    addSpy.mockRestore();
    scope.stop();
  });

  it('does nothing when window is unavailable (SSR)', () => {
    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ window: undefined, target: undefined });
    });
    expect(mouse!.x.value).toBe(0);
    expect(mouse!.y.value).toBe(0);
    expect(mouse!.sourceType.value).toBe(null);
    scope.stop();
  });

  it('applies an event filter (throttle drops intermediate moves)', async () => {
    vi.useFakeTimers();
    const filtered = vi.fn();
    // simple leading-only filter: only the first invoke passes immediately
    let used = false;
    const onceFilter = (invoke: () => void) => {
      if (!used) {
        used = true;
        invoke();
      }
    };

    const scope = effectScope();
    let mouse: ReturnType<typeof useMouse>;
    scope.run(() => {
      mouse = useMouse({ eventFilter: onceFilter });
    });

    dispatchMouseMove(globalThis, { pageX: 10, pageY: 10 });
    dispatchMouseMove(globalThis, { pageX: 20, pageY: 20 });
    await nextTick();

    // only the first move was let through
    expect(mouse!.x.value).toBe(10);
    expect(mouse!.y.value).toBe(10);

    filtered();
    scope.stop();
    vi.useRealTimers();
  });
});
