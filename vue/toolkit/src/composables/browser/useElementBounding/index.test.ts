import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useElementBounding } from '.';

class StubObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

describe(useElementBounding, () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubObserver);
    vi.stubGlobal('MutationObserver', StubObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the bounding rect immediately', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
      width: 100, height: 50, top: 10, left: 20, right: 120, bottom: 60, x: 20, y: 10,
    } as DOMRect);

    const scope = effectScope();
    let bounds: ReturnType<typeof useElementBounding>;
    scope.run(() => {
      bounds = useElementBounding(ref(el));
    });

    expect(bounds!.width.value).toBe(100);
    expect(bounds!.height.value).toBe(50);
    expect(bounds!.top.value).toBe(10);
    expect(bounds!.left.value).toBe(20);
    expect(bounds!.x.value).toBe(20);
    expect(bounds!.y.value).toBe(10);
    scope.stop();
  });

  it('update recomputes the rect', () => {
    const el = document.createElement('div');
    let w = 10;
    el.getBoundingClientRect = () => ({ width: w, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0 } as DOMRect);

    const scope = effectScope();
    let bounds: ReturnType<typeof useElementBounding>;
    scope.run(() => {
      bounds = useElementBounding(ref(el));
    });

    expect(bounds!.width.value).toBe(10);
    w = 200;
    bounds!.update();
    expect(bounds!.width.value).toBe(200);
    scope.stop();
  });

  it('resets to zero when target is null', () => {
    const scope = effectScope();
    let bounds: ReturnType<typeof useElementBounding>;
    scope.run(() => {
      bounds = useElementBounding(ref(null));
    });

    expect(bounds!.width.value).toBe(0);
    expect(bounds!.height.value).toBe(0);
    scope.stop();
  });

  // NOTE: defaultWindow is captured at import time, so vi.stubGlobal does not
  // reach requestAnimationFrame. We inject a fake window via the `window` option.
  it('defers measurement to the next frame with updateTiming "next-frame"', () => {
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const fakeWindow = { requestAnimationFrame: raf, cancelAnimationFrame: vi.fn() } as unknown as Window;

    const el = document.createElement('div');
    let w = 10;
    el.getBoundingClientRect = () => ({ width: w, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0 } as DOMRect);

    const scope = effectScope();
    let bounds: ReturnType<typeof useElementBounding>;
    scope.run(() => {
      bounds = useElementBounding(ref(el), { updateTiming: 'next-frame', window: fakeWindow });
    });

    // The immediate update went through requestAnimationFrame
    expect(raf).toHaveBeenCalled();
    expect(bounds!.width.value).toBe(10);

    w = 200;
    bounds!.update();
    expect(bounds!.width.value).toBe(200);
    scope.stop();
  });

  it('coalesces multiple "next-frame" updates into a single read per frame', () => {
    let scheduled: FrameRequestCallback | undefined;
    const raf = vi.fn((cb: FrameRequestCallback) => {
      scheduled = cb;
      return 1;
    });
    const fakeWindow = { requestAnimationFrame: raf, cancelAnimationFrame: vi.fn() } as unknown as Window;

    const el = document.createElement('div');
    const getRect = vi.fn(() => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0 } as DOMRect));
    el.getBoundingClientRect = getRect;

    const scope = effectScope();
    let bounds: ReturnType<typeof useElementBounding>;
    scope.run(() => {
      bounds = useElementBounding(ref(el), { updateTiming: 'next-frame', immediate: false, window: fakeWindow });
    });

    bounds!.update();
    bounds!.update();
    bounds!.update();

    // Only one frame was scheduled despite three update() calls
    expect(raf).toHaveBeenCalledTimes(1);
    expect(getRect).not.toHaveBeenCalled();

    // Flushing the frame reads the rect exactly once
    scheduled!(0);
    expect(getRect).toHaveBeenCalledTimes(1);

    // A new update after the frame flushed schedules a fresh frame
    bounds!.update();
    expect(raf).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('cancels a pending frame on scope dispose', () => {
    const raf = vi.fn(() => 42);
    const caf = vi.fn();
    const fakeWindow = { requestAnimationFrame: raf, cancelAnimationFrame: caf } as unknown as Window;

    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0 } as DOMRect);

    const scope = effectScope();
    scope.run(() => {
      useElementBounding(ref(el), { updateTiming: 'next-frame', window: fakeWindow });
    });

    // The immediate update scheduled a frame that never ran (raf returns id without invoking)
    expect(raf).toHaveBeenCalled();
    scope.stop();
    expect(caf).toHaveBeenCalledWith(42);
  });
});
