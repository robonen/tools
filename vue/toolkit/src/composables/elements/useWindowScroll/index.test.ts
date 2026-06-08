import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useWindowScroll } from '.';

function setScroll(x: number, y: number): void {
  (globalThis as any).scrollX = x;
  (globalThis as any).scrollY = y;
}

describe(useWindowScroll, () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'scrollX', { value: 0, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'scrollY', { value: 0, configurable: true, writable: true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the initial scroll position', () => {
    setScroll(15, 25);
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    expect(result!.x.value).toBe(15);
    expect(result!.y.value).toBe(25);
    scope.stop();
  });

  it('updates on scroll', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    setScroll(30, 60);
    globalThis.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result!.x.value).toBe(30);
    expect(result!.y.value).toBe(60);
    scope.stop();
  });

  it('scrolls the window when writing to x/y', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    result!.x.value = 100;
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 100 }));
    result!.y.value = 200;
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 200 }));
    scope.stop();
  });

  it('passes the configured behavior when writing to x/y', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll({ behavior: 'smooth' });
    });

    result!.x.value = 50;
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 50, behavior: 'smooth' }));
    scope.stop();
  });

  it('exposes isScrolling that toggles on scroll and resets after idle', async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll({ idle: 50 });
    });

    expect(result!.isScrolling.value).toBeFalsy();

    setScroll(10, 10);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(result!.isScrolling.value).toBeTruthy();

    vi.advanceTimersByTime(60);
    await nextTick();
    expect(result!.isScrolling.value).toBeFalsy();

    scope.stop();
    vi.useRealTimers();
  });

  it('calls onScroll and onStop callbacks', async () => {
    vi.useFakeTimers();
    const onScroll = vi.fn();
    const onStop = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useWindowScroll({ idle: 50, onScroll, onStop });
    });

    setScroll(5, 5);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60);
    await nextTick();
    expect(onStop).toHaveBeenCalledTimes(1);

    scope.stop();
    vi.useRealTimers();
  });

  it('tracks scroll directions', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    setScroll(40, 80);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(result!.directions.right).toBeTruthy();
    expect(result!.directions.bottom).toBeTruthy();
    expect(result!.directions.left).toBeFalsy();
    expect(result!.directions.top).toBeFalsy();

    setScroll(10, 20);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(result!.directions.left).toBeTruthy();
    expect(result!.directions.top).toBeTruthy();
    expect(result!.directions.right).toBeFalsy();
    expect(result!.directions.bottom).toBeFalsy();

    scope.stop();
  });

  it('reports arrivedState at the top/left edges initially', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    expect(result!.arrivedState.top).toBeTruthy();
    expect(result!.arrivedState.left).toBeTruthy();
    scope.stop();
  });

  it('clears arrivedState.top once scrolled down', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    setScroll(0, 100);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(result!.arrivedState.top).toBeFalsy();
    scope.stop();
  });

  it('honors the top offset for arrivedState', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll({ offset: { top: 30 } });
    });

    setScroll(0, 20);
    globalThis.dispatchEvent(new Event('scroll'));
    // Within the 30px offset, still considered "arrived at top".
    expect(result!.arrivedState.top).toBeTruthy();

    setScroll(0, 40);
    globalThis.dispatchEvent(new Event('scroll'));
    expect(result!.arrivedState.top).toBeFalsy();
    scope.stop();
  });

  it('measure() recomputes state without a scroll event', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll();
    });

    setScroll(0, 70);
    // No event dispatched; values are stale until measure().
    expect(result!.y.value).toBe(0);
    result!.measure();
    expect(result!.y.value).toBe(70);
    scope.stop();
  });

  it('is SSR-safe when window is undefined', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useWindowScroll>;
    scope.run(() => {
      result = useWindowScroll({ window: undefined });
    });

    expect(result!.x.value).toBe(0);
    expect(result!.y.value).toBe(0);
    expect(result!.isScrolling.value).toBeFalsy();
    // Writing should be a no-op (no throw).
    expect(() => {
      result!.x.value = 10;
    }).not.toThrow();
    scope.stop();
  });

  it('throttles the scroll handler when throttle is set', async () => {
    vi.useFakeTimers();
    const onScroll = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useWindowScroll({ throttle: 100, onScroll });
    });

    setScroll(1, 1);
    globalThis.dispatchEvent(new Event('scroll'));
    setScroll(2, 2);
    globalThis.dispatchEvent(new Event('scroll'));
    setScroll(3, 3);
    globalThis.dispatchEvent(new Event('scroll'));

    // Trailing-only throttle: collapses the burst into a single deferred call.
    vi.advanceTimersByTime(120);
    await nextTick();
    expect(onScroll).toHaveBeenCalledTimes(1);

    scope.stop();
    vi.useRealTimers();
  });
});
