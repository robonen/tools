import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useScroll } from '.';

function makeScrollable(overrides: Partial<{
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}> = {}) {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    scrollWidth: { value: overrides.scrollWidth ?? 1000, configurable: true },
    scrollHeight: { value: overrides.scrollHeight ?? 1000, configurable: true },
    clientWidth: { value: overrides.clientWidth ?? 100, configurable: true },
    clientHeight: { value: overrides.clientHeight ?? 100, configurable: true },
  });
  el.scrollLeft = 0;
  el.scrollTop = 0;
  return el;
}

function withScope<T>(fn: () => T): { result: T; scope: ReturnType<typeof effectScope> } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, scope };
}

describe(useScroll, () => {
  it('starts at the top-left with arrived state', () => {
    const el = makeScrollable();
    const { result, scope } = withScope(() => useScroll(ref(el)));

    expect(result.x.value).toBe(0);
    expect(result.y.value).toBe(0);
    expect(result.arrivedState.top).toBeTruthy();
    expect(result.arrivedState.left).toBeTruthy();
    scope.stop();
  });

  it('updates position and isScrolling on scroll', async () => {
    const el = makeScrollable();
    const { result, scope } = withScope(() => useScroll(ref(el)));

    el.scrollTop = 50;
    el.scrollLeft = 20;
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result.x.value).toBe(20);
    expect(result.y.value).toBe(50);
    expect(result.isScrolling.value).toBeTruthy();
    expect(result.directions.bottom).toBeTruthy();
    expect(result.directions.right).toBeTruthy();
    scope.stop();
  });

  it('flags arrival at the bottom edge', async () => {
    const el = makeScrollable();
    const { result, scope } = withScope(() => useScroll(ref(el)));

    el.scrollTop = 900; // 900 + 100 clientHeight >= 1000 scrollHeight
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result.arrivedState.bottom).toBeTruthy();
    scope.stop();
  });

  it('measures the initial scroll position on mount', () => {
    const el = makeScrollable();
    el.scrollLeft = 30;
    el.scrollTop = 40;
    const { result, scope } = withScope(() => useScroll(ref(el)));

    expect(result.x.value).toBe(30);
    expect(result.y.value).toBe(40);
    expect(result.arrivedState.top).toBeFalsy();
    expect(result.arrivedState.left).toBeFalsy();
    scope.stop();
  });

  it('exposes measure() to re-sync without a scroll event', () => {
    const el = makeScrollable();
    const { result, scope } = withScope(() => useScroll(ref(el)));

    expect(result.y.value).toBe(0);

    el.scrollTop = 200;
    result.measure();

    expect(result.y.value).toBe(200);
    // measure() must not fabricate directions.
    expect(result.directions.bottom).toBeFalsy();
    scope.stop();
  });

  it('respects the offset when computing arrived state', async () => {
    const el = makeScrollable();
    const { result, scope } = withScope(() => useScroll(ref(el), { offset: { top: 10, bottom: 50 } }));

    el.scrollTop = 8; // <= offset.top (10) => still arrived at top
    el.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(result.arrivedState.top).toBeTruthy();

    el.scrollTop = 855; // 855 + 100 >= 1000 - 50 - 1 => arrived at bottom early
    el.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(result.arrivedState.bottom).toBeTruthy();
    scope.stop();
  });

  it('resets isScrolling and directions and calls onStop after idle', async () => {
    vi.useFakeTimers();
    const onStop = vi.fn();
    const el = makeScrollable();
    const { result, scope } = withScope(() => useScroll(ref(el), { idle: 100, onStop }));

    el.scrollTop = 50;
    el.dispatchEvent(new Event('scroll'));
    expect(result.isScrolling.value).toBeTruthy();
    expect(result.directions.bottom).toBeTruthy();

    vi.advanceTimersByTime(150);
    await nextTick();

    expect(result.isScrolling.value).toBeFalsy();
    expect(result.directions.bottom).toBeFalsy();
    expect(onStop).toHaveBeenCalledTimes(1);
    scope.stop();
    vi.useRealTimers();
  });

  it('normalises a negative (RTL) scrollLeft for arrived state', async () => {
    const el = makeScrollable();
    const styleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({ direction: 'rtl' } as CSSStyleDeclaration);
    const { result, scope } = withScope(() => useScroll(ref(el)));

    // RTL: scrolled to the far end reports a large negative magnitude.
    el.scrollLeft = -900;
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    // |−900| + 100 clientWidth >= 1000 scrollWidth => arrived at the right edge.
    expect(result.arrivedState.right).toBeTruthy();
    expect(result.arrivedState.left).toBeFalsy();
    styleSpy.mockRestore();
    scope.stop();
  });

  it('writes scroll position through the x/y setters with behavior', () => {
    const el = makeScrollable();
    const scrollToSpy = vi.fn();
    el.scrollTo = scrollToSpy as typeof el.scrollTo;
    const { result, scope } = withScope(() => useScroll(ref(el), { behavior: 'smooth' }));

    result.y.value = 120;
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 120, behavior: 'smooth' });

    result.x.value = 60;
    expect(scrollToSpy).toHaveBeenCalledWith({ left: 60, behavior: 'smooth' });
    scope.stop();
  });

  it('invokes onError when reading metrics throws', () => {
    const el = makeScrollable();
    const onError = vi.fn();
    const styleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(() => {
      throw new Error('detached');
    });
    const { scope } = withScope(() => useScroll(ref(el), { onError }));

    expect(onError).toHaveBeenCalled();
    styleSpy.mockRestore();
    scope.stop();
  });

  it('does nothing when target is nullish', () => {
    const { result, scope } = withScope(() => useScroll(ref(null)));

    expect(result.x.value).toBe(0);
    expect(result.y.value).toBe(0);
    expect(() => result.measure()).not.toThrow();
    scope.stop();
  });

  it('throttles scroll updates when throttle is set', async () => {
    vi.useFakeTimers();
    const onScroll = vi.fn();
    const el = makeScrollable();
    const { scope } = withScope(() => useScroll(ref(el), { throttle: 100, onScroll }));

    el.scrollTop = 10;
    el.dispatchEvent(new Event('scroll'));
    el.scrollTop = 20;
    el.dispatchEvent(new Event('scroll'));
    el.scrollTop = 30;
    el.dispatchEvent(new Event('scroll'));

    // Leading edge fires once immediately, the rest are throttled.
    expect(onScroll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(150);
    // Trailing edge flushes the latest.
    expect(onScroll).toHaveBeenCalledTimes(2);

    scope.stop();
    vi.useRealTimers();
  });
});
