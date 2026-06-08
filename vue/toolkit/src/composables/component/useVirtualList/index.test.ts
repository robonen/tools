import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useVirtualList } from '.';

class StubResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

function makeContainer(overrides: Partial<{
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}> = {}) {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    clientWidth: { value: overrides.clientWidth ?? 100, configurable: true },
    clientHeight: { value: overrides.clientHeight ?? 100, configurable: true },
    scrollWidth: { value: overrides.scrollWidth ?? 10000, configurable: true },
    scrollHeight: { value: overrides.scrollHeight ?? 10000, configurable: true },
  });
  el.scrollTop = 0;
  el.scrollLeft = 0;
  el.scrollTo = vi.fn((opts: ScrollToOptions) => {
    if (typeof opts.top === 'number') el.scrollTop = opts.top;
    if (typeof opts.left === 'number') el.scrollLeft = opts.left;
  }) as unknown as typeof el.scrollTo;
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

describe(useVirtualList, () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders an empty window before the container mounts (SSR-safe)', () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20 }));

    expect(result.list.value).toEqual([]);
    expect(result.containerProps.ref.value).toBeNull();
    expect(result.containerProps.style).toEqual({ overflowY: 'auto' });
    scope.stop();
  });

  it('exposes the documented return shape', () => {
    const { result, scope } = withScope(() => useVirtualList([1, 2, 3], { itemHeight: 20 }));

    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('scrollTo');
    expect(result).toHaveProperty('containerProps');
    expect(result).toHaveProperty('wrapperProps');
    expect(typeof result.scrollTo).toBe('function');
    expect(typeof result.containerProps.onScroll).toBe('function');
    scope.stop();
  });

  it('slices the visible window plus overscan (vertical, fixed height)', async () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20, overscan: 2 }));

    result.containerProps.ref.value = el;
    await nextTick();

    // offset(0) = 0, capacity = ceil(100/20) = 5, overscan 2 -> start 0, end 7.
    expect(result.list.value[0]).toEqual({ data: 0, index: 0 });
    expect(result.list.value).toHaveLength(7);
    expect(result.list.value.at(-1)).toEqual({ data: 6, index: 6 });
    scope.stop();
  });

  it('recomputes the window on scroll with correct original indices', async () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20, overscan: 2 }));

    result.containerProps.ref.value = el;
    await nextTick();

    el.scrollTop = 400; // offset = floor(400/20) = 20
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    // start = 20 - 2 = 18, end = 20 + 5 + 2 = 27
    expect(result.list.value[0]).toEqual({ data: 18, index: 18 });
    expect(result.list.value.at(-1)).toEqual({ data: 26, index: 26 });
    scope.stop();
  });

  it('computes total height and offset spacers via wrapperProps', async () => {
    const data = Array.from({ length: 50 }, (_, i) => i);
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20, overscan: 0 }));

    result.containerProps.ref.value = el;
    await nextTick();

    // total height = 50 * 20 = 1000; at top, marginTop = 0
    expect(result.wrapperProps.value.style.height).toBe('1000px');
    expect(result.wrapperProps.value.style.marginTop).toBe('0px');
    expect(result.wrapperProps.value.style.width).toBe('100%');

    el.scrollTop = 200; // offset = 10, start = 10
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    // marginTop = distance(10) = 200px; remaining height = 1000 - 200 = 800px
    expect(result.wrapperProps.value.style.marginTop).toBe('200px');
    expect(result.wrapperProps.value.style.height).toBe('800px');
    scope.stop();
  });

  it('supports horizontal layout with itemWidth', async () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const el = makeContainer({ clientWidth: 100 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemWidth: 25, overscan: 1 }));

    expect(result.containerProps.style).toEqual({ overflowX: 'auto' });

    result.containerProps.ref.value = el;
    await nextTick();

    // capacity = ceil(100/25) = 4, overscan 1 -> start 0, end 5
    expect(result.list.value).toHaveLength(5);
    expect(result.wrapperProps.value.style.display).toBe('flex');
    expect(result.wrapperProps.value.style.height).toBe('100%');
    expect(result.wrapperProps.value.style.marginLeft).toBe('0px');
    scope.stop();
  });

  it('supports variable item heights via a getter (prefix-sum metrics)', async () => {
    const data = Array.from({ length: 100 }, (_, i) => i);
    const el = makeContainer({ clientHeight: 100 });
    // even indices: 40px, odd: 10px
    const itemHeight = (i: number) => (i % 2 === 0 ? 40 : 10);
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight, overscan: 0 }));

    result.containerProps.ref.value = el;
    await nextTick();

    expect(result.list.value[0]).toEqual({ data: 0, index: 0 });

    // total = 50 * 40 + 50 * 10 = 2500
    expect(result.wrapperProps.value.style.height).toBe('2500px');

    // distance to index 4 = sizes[0..3] = 40+10+40+10 = 100
    el.scrollTop = 100;
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result.list.value[0]).toEqual({ data: 4, index: 4 });
    expect(result.wrapperProps.value.style.marginTop).toBe('100px');
    scope.stop();
  });

  it('scrollTo moves the container and re-slices', async () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20, overscan: 0 }));

    result.containerProps.ref.value = el;
    await nextTick();

    result.scrollTo(30);
    // distance(30) = 30 * 20 = 600; block 'start' keeps offset 0
    expect(el.scrollTop).toBe(600);
    expect(result.list.value[0]).toEqual({ data: 30, index: 30 });
    scope.stop();
  });

  it('scrollTo is a no-op when the container is not mounted', () => {
    const { result, scope } = withScope(() => useVirtualList([1, 2, 3], { itemHeight: 20 }));
    expect(() => result.scrollTo(2)).not.toThrow();
    scope.stop();
  });

  it('reacts to a changing source ref', async () => {
    const data = ref(Array.from({ length: 10 }, (_, i) => i));
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20, overscan: 0 }));

    result.containerProps.ref.value = el;
    await nextTick();

    // total = 10 * 20 = 200
    expect(result.wrapperProps.value.style.height).toBe('200px');

    data.value = Array.from({ length: 100 }, (_, i) => i);
    await nextTick();

    // total = 100 * 20 = 2000
    expect(result.wrapperProps.value.style.height).toBe('2000px');
    scope.stop();
  });

  it('clamps the window to the source bounds', async () => {
    const data = Array.from({ length: 3 }, (_, i) => i);
    const el = makeContainer({ clientHeight: 1000 });
    const { result, scope } = withScope(() => useVirtualList(data, { itemHeight: 20, overscan: 5 }));

    result.containerProps.ref.value = el;
    await nextTick();

    expect(result.list.value).toHaveLength(3);
    expect(result.list.value.at(-1)).toEqual({ data: 2, index: 2 });
    scope.stop();
  });
});
