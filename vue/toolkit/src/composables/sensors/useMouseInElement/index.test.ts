import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useMouseInElement } from '.';

class StubObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

function makeElement(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0,
    ...rect,
  } as DOMRect);
  return el;
}

// jsdom computes `pageX`/`pageY` from `clientX + scrollX` and ignores any
// `pageX` passed to the constructor, so tests dispatch client coordinates and
// rely on that derivation for `type: 'page'`.
function dispatchMouse(type: string, init: MouseEventInit) {
  globalThis.dispatchEvent(new MouseEvent(type, init));
}

describe(useMouseInElement, () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubObserver);
    vi.stubGlobal('MutationObserver', StubObserver);
    (globalThis as any).scrollX = 0;
    (globalThis as any).scrollY = 0;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('computes element-relative coordinates when the cursor is inside', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100, right: 300, bottom: 150 });

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el));
    });

    dispatchMouse('mousemove', { clientX: 150, clientY: 80 });

    expect(result!.elementPositionX.value).toBe(100);
    expect(result!.elementPositionY.value).toBe(50);
    expect(result!.elementWidth.value).toBe(200);
    expect(result!.elementHeight.value).toBe(100);
    expect(result!.elementX.value).toBe(50);
    expect(result!.elementY.value).toBe(30);
    expect(result!.isOutside.value).toBeFalsy();
    scope.stop();
  });

  it('flags isOutside when the cursor is beyond the element bounds', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100 });

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el));
    });

    dispatchMouse('mousemove', { clientX: 10, clientY: 10 });

    expect(result!.isOutside.value).toBeTruthy();
    scope.stop();
  });

  it('freezes element coordinates outside the element when handleOutside is false', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100 });

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el), { handleOutside: false });
    });

    // Move inside first
    dispatchMouse('mousemove', { clientX: 150, clientY: 80 });
    expect(result!.elementX.value).toBe(50);
    expect(result!.elementY.value).toBe(30);

    // Now move outside — coordinates should not update
    dispatchMouse('mousemove', { clientX: 5, clientY: 5 });
    expect(result!.isOutside.value).toBeTruthy();
    expect(result!.elementX.value).toBe(50);
    expect(result!.elementY.value).toBe(30);
    scope.stop();
  });

  it('accounts for page scroll offset with type "page"', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100 });
    (globalThis as any).scrollX = 30;
    (globalThis as any).scrollY = 20;

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el));
    });

    // jsdom reports pageX === clientX (it does not fold scroll into pageX), so
    // here pageX = 200, pageY = 120. The element position folds in scroll:
    // left + scrollX = 130, top + scrollY = 70.
    dispatchMouse('mousemove', { clientX: 200, clientY: 120 });

    expect(result!.elementPositionX.value).toBe(130);
    expect(result!.elementPositionY.value).toBe(70);
    expect(result!.elementX.value).toBe(70);
    expect(result!.elementY.value).toBe(50);
    scope.stop();
  });

  it('ignores scroll offset with type "client"', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100 });
    (globalThis as any).scrollX = 30;
    (globalThis as any).scrollY = 20;

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el), { type: 'client' });
    });

    dispatchMouse('mousemove', { clientX: 150, clientY: 80 });

    expect(result!.elementPositionX.value).toBe(100);
    expect(result!.elementPositionY.value).toBe(50);
    expect(result!.elementX.value).toBe(50);
    expect(result!.elementY.value).toBe(30);
    scope.stop();
  });

  it('sets isOutside on document mouseleave', () => {
    const el = makeElement({ left: 0, top: 0, width: 200, height: 100 });

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el));
    });

    dispatchMouse('mousemove', { clientX: 50, clientY: 50 });
    expect(result!.isOutside.value).toBeFalsy();

    document.dispatchEvent(new MouseEvent('mouseleave'));
    expect(result!.isOutside.value).toBeTruthy();
    scope.stop();
  });

  it('stop() halts further updates', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100 });

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    scope.run(() => {
      result = useMouseInElement(ref(el));
    });

    dispatchMouse('mousemove', { clientX: 150, clientY: 80 });
    expect(result!.elementX.value).toBe(50);

    result!.stop();

    dispatchMouse('mousemove', { clientX: 250, clientY: 130 });
    // x still updates (useMouse listener), but elementX no longer recomputes
    expect(result!.elementX.value).toBe(50);
    scope.stop();
  });

  it('does not throw and stays outside when window is unavailable (SSR)', () => {
    const el = makeElement({ left: 100, top: 50, width: 200, height: 100 });

    const scope = effectScope();
    let result: ReturnType<typeof useMouseInElement>;
    expect(() => {
      scope.run(() => {
        result = useMouseInElement(ref(el), { window: undefined });
      });
    }).not.toThrow();

    expect(result!.isOutside.value).toBeTruthy();
    expect(result!.x.value).toBe(0);
    expect(result!.y.value).toBe(0);
    scope.stop();
  });
});
