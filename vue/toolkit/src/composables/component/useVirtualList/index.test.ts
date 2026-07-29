import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useVirtualList } from '.';

type ObserverRecord = InstanceType<typeof StubResizeObserver>;

const observers: ObserverRecord[] = [];

class StubResizeObserver {
  callback: ResizeObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
}

function makeContainer(overrides: Partial<{
  clientWidth: number;
  clientHeight: number;
}> = {}) {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    clientWidth: { value: overrides.clientWidth ?? 100, configurable: true },
    clientHeight: { value: overrides.clientHeight ?? 100, configurable: true },
  });
  el.scrollTop = 0;
  el.scrollLeft = 0;
  el.scrollTo = vi.fn((opts: ScrollToOptions) => {
    if (typeof opts.top === 'number')
      el.scrollTop = opts.top;
    if (typeof opts.left === 'number')
      el.scrollLeft = opts.left;
  }) as unknown as typeof el.scrollTo;
  return el;
}

function makeRow(index: number): HTMLElement {
  const el = document.createElement('div');
  el.dataset.index = String(index);
  document.body.appendChild(el);
  return el;
}

function resizeEntry(target: Element, blockSize: number, inlineSize = 50): ResizeObserverEntry {
  return { target, borderBoxSize: [{ blockSize, inlineSize }] } as unknown as ResizeObserverEntry;
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
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

  it('renders the initial window from estimates and initialContainerSize', () => {
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 40,
      initialContainerSize: 200,
      overscan: 1,
    }));

    // top=0 → start 0; bottom=200 → lowerBound=5 (5*40 ≤ 200) → end 6 → +overscan
    expect(result.range.value).toEqual({ start: 0, end: 7 });
    expect(result.list.value).toHaveLength(7);
    expect(result.list.value[0]!.start).toBe(0);
    expect(result.list.value[3]!.start).toBe(120);
    expect(result.totalSize.value).toBe(1000 * 40);
    scope.stop();
  });

  it('applies paddingStart and gap to offsets and totalSize', () => {
    const { result, scope } = withScope(() => useVirtualList(() => items.slice(0, 10), {
      estimateSize: 40,
      gap: 8,
      paddingStart: 12,
      paddingEnd: 20,
      initialContainerSize: 100,
      overscan: 0,
    }));

    expect(result.list.value[0]!.start).toBe(12);
    expect(result.list.value[1]!.start).toBe(12 + 40 + 8);
    expect(result.totalSize.value).toBe(12 + 10 * 40 + 9 * 8 + 20);
    scope.stop();
  });

  it('passes item and index to the estimate function', () => {
    const estimateSize = vi.fn((item: { id: number }, _index: number) => 10 + item.id);
    const { result, scope } = withScope(() => useVirtualList(() => items.slice(0, 3), {
      estimateSize,
      initialContainerSize: 100,
    }));

    expect(estimateSize).toHaveBeenCalledWith(items[0], 0);
    expect(result.totalSize.value).toBe(10 + 11 + 12);
    scope.stop();
  });

  it('rebuilds when the source ref is replaced', async () => {
    const source = shallowRef(items.slice(0, 10));
    const { result, scope } = withScope(() => useVirtualList(source, {
      estimateSize: 40,
      initialContainerSize: 100,
    }));

    expect(result.totalSize.value).toBe(400);

    source.value = items.slice(0, 3);
    await nextTick();

    expect(result.totalSize.value).toBe(120);
    expect(result.range.value.end).toBeLessThanOrEqual(3);
    scope.stop();
  });

  it('clamps the range when the source shrinks to empty', async () => {
    const source = shallowRef(items.slice(0, 10));
    const { result, scope } = withScope(() => useVirtualList(source, {
      estimateSize: 40,
      initialContainerSize: 100,
    }));

    source.value = [];
    await nextTick();

    expect(result.range.value).toEqual({ start: 0, end: 0 });
    expect(result.list.value).toEqual([]);
    expect(result.totalSize.value).toBe(0);
    scope.stop();
  });

  it('getOffsetForIndex honors align and clamps to content bounds', () => {
    const { result, scope } = withScope(() => useVirtualList(() => items.slice(0, 100), {
      estimateSize: 40,
      initialContainerSize: 200,
    }));

    expect(result.getOffsetForIndex(0, 'start')).toBe(0);
    expect(result.getOffsetForIndex(50, 'start')).toBe(2000);
    expect(result.getOffsetForIndex(50, 'center')).toBe(2000 - (200 - 40) / 2);
    expect(result.getOffsetForIndex(50, 'end')).toBe(2000 - 200 + 40);
    // clamp: the last item can't be aligned past max scroll
    expect(result.getOffsetForIndex(99, 'start')).toBe(100 * 40 - 200);
    // 'auto' on a visible item → keep the current offset
    expect(result.getOffsetForIndex(1, 'auto')).toBe(0);
    scope.stop();
  });

  it('resolves auto-align with nearest-edge semantics for oversized items', () => {
    // item 50 is taller than the 200px viewport and lies below it
    const below = withScope(() => useVirtualList(() => items.slice(0, 100), {
      estimateSize: (_item, index) => index === 50 ? 500 : 40,
      initialContainerSize: 200,
    }));
    // nearest: approaching an oversized item from above aligns its start
    expect(below.result.getOffsetForIndex(50, 'auto')).toBe(2000);
    below.scope.stop();

    // item 0 is taller than the viewport and already covers it → no-op
    const covering = withScope(() => useVirtualList(() => items.slice(0, 100), {
      estimateSize: (_item, index) => index === 0 ? 500 : 40,
      initialContainerSize: 200,
    }));
    expect(covering.result.getOffsetForIndex(0, 'auto')).toBe(0);
    covering.scope.stop();
  });

  it('scrollTo re-syncs a same-tick source replacement synchronously', () => {
    const source = shallowRef(items.slice(0, 10));
    const { result, scope } = withScope(() => useVirtualList(source, {
      estimateSize: 40,
      initialContainerSize: 200,
    }));

    expect(result.totalSize.value).toBe(400);

    source.value = items.slice(0, 100);
    // no nextTick: the canonical "append then scroll to newest" gesture
    result.scrollTo(99);

    expect(result.totalSize.value).toBe(4000);
    scope.stop();
  });

  it('scrollTo and remeasure are safe no-ops without a scroll element', () => {
    const { result, scope } = withScope(() => useVirtualList(() => items.slice(0, 10), {
      estimateSize: 40,
      initialContainerSize: 100,
    }));

    expect(() => {
      result.scrollTo(5);
      result.scrollToOffset(100);
      result.remeasure();
      result.remeasure(2);
      result.updateLayout();
    }).not.toThrow();
    scope.stop();
  });

  it('slices the window with correct data and indices once the container mounts', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      overscan: 2,
    }));

    // pre-mount: a small fallback window instead of an empty flash
    expect(result.list.value.length).toBeGreaterThan(0);
    expect(result.list.value.length).toBeLessThanOrEqual(1 + 2);
    expect(result.containerProps.style).toMatchObject({ overflowY: 'auto', overflowAnchor: 'none' });

    result.containerProps.ref.value = el;
    await nextTick();

    // capacity = 100/20 = 5 → end 6, +overscan 2 → 8 rows
    expect(result.list.value[0]).toMatchObject({ data: items[0], index: 0, start: 0, size: 20 });
    expect(result.list.value).toHaveLength(8);
    expect(result.list.value[0]!.props['data-index']).toBe(0);
    expect(result.list.value[0]!.props.style.transform).toBe('translateY(0px)');
    scope.stop();
  });

  it('recomputes the window on scroll with correct original indices', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      overscan: 2,
    }));

    result.containerProps.ref.value = el;
    await nextTick();

    el.scrollTop = 400; // first visible = 400/20 = 20
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(result.list.value[0]!.index).toBe(18); // 20 - overscan
    expect(result.isScrolling.value).toBeTruthy();
    scope.stop();
  });

  it('scrollTo writes the scroll offset for the requested alignment', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      overscan: 0,
    }));

    result.containerProps.ref.value = el;
    await nextTick();

    result.scrollTo(30, { align: 'start' });
    expect(el.scrollTop).toBe(600);

    result.scrollTo(30, { align: 'center' });
    expect(el.scrollTop).toBe(600 - (100 - 20) / 2);
    scope.stop();
  });

  it('applies measured sizes delivered by the ResizeObserver', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      overscan: 0,
    }));

    result.containerProps.ref.value = el;
    await nextTick();

    const observer = observers[0]!;
    const row = makeRow(0);
    result.measureElement(row);
    expect(observer.observe).toHaveBeenCalledWith(row, { box: 'border-box' });

    observer.callback([resizeEntry(row, 90)], observer as unknown as ResizeObserver);
    await nextTick();

    // row 0: 20 → 90, total grows by 70
    expect(result.totalSize.value).toBe(1000 * 20 + 70);
    expect(result.list.value[0]!.size).toBe(90);
    expect(result.list.value[1]!.start).toBe(90);
    scope.stop();
  });

  it('compensates the scroll offset when an item above the viewport grows', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      overscan: 0,
    }));

    result.containerProps.ref.value = el;
    await nextTick();

    el.scrollTop = 400;
    el.dispatchEvent(new Event('scroll'));
    await nextTick();

    const observer = observers[0]!;
    const row = makeRow(0); // starts at 0, above the viewport top (400)
    result.measureElement(row);
    observer.callback([resizeEntry(row, 100)], observer as unknown as ResizeObserver);
    await nextTick(); // deferred compensation write lands post-patch

    // growth of 80 above the viewport → scrollTop compensated to 480
    expect(el.scrollTop).toBe(480);
    scope.stop();
  });

  it('measures component instances through $el', () => {
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      initialContainerSize: 100,
    }));

    const row = makeRow(3);
    result.measureElement({ $el: row });

    expect(observers[0]!.observe).toHaveBeenCalledWith(row, { box: 'border-box' });
    scope.stop();
  });

  it('warns once when the ref target cannot be measured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 20,
      initialContainerSize: 100,
    }));

    result.measureElement({ $el: document.createTextNode('fragment anchor') });
    result.measureElement({ $el: null });

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    scope.stop();
  });

  it('supports horizontal layout', async () => {
    const el = makeContainer({ clientWidth: 100 });
    const { result, scope } = withScope(() => useVirtualList(() => items, {
      estimateSize: 25,
      axis: 'x',
      overscan: 1,
    }));

    expect(result.containerProps.style).toMatchObject({ overflowX: 'auto' });

    result.containerProps.ref.value = el;
    await nextTick();

    // capacity = 100/25 = 4 → end 5, +overscan 1 → 6 rows
    expect(result.list.value).toHaveLength(6);
    expect(result.list.value[1]!.props.style.transform).toBe('translateX(25px)');
    expect(result.wrapperProps.value.style.width).toBe(`${1000 * 25}px`);
    expect(result.wrapperProps.value.style.height).toBe('100%');
    scope.stop();
  });
});
