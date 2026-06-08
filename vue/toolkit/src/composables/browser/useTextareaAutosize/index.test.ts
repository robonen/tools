import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useTextareaAutosize } from '.';

let instances: Array<{ cb: ResizeObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];

class StubResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    instances.push(this);
  }
}

// jsdom returns 0 for scrollHeight; force a deterministic value
function makeTextarea(scrollHeight = 42): HTMLTextAreaElement {
  const el = document.createElement('textarea');
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  return el;
}

// A window whose rAF runs synchronously so resize callbacks are observable
function syncWindow(): Window {
  return {
    requestAnimationFrame: (fn: FrameRequestCallback) => {
      fn(0);
      return 1;
    },
  } as unknown as Window;
}

describe(useTextareaAutosize, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns textarea, input, and triggerResize', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize();
    });

    expect(result.textarea.value).toBeUndefined();
    expect(result.input.value).toBe('');
    expect(typeof result.triggerResize).toBe('function');
    scope.stop();
  });

  it('seeds input and element from options', () => {
    const el = makeTextarea();
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ element: el, input: 'hello' });
    });

    expect(result.textarea.value).toBe(el);
    expect(result.input.value).toBe('hello');
    scope.stop();
  });

  it('sizes the textarea height to its scrollHeight on resize', () => {
    const el = makeTextarea(80);
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ element: el });
    });

    result.triggerResize();
    expect(el.style.height).toBe('80px');
    scope.stop();
  });

  it('clamps the height to maxHeight', () => {
    const el = makeTextarea(500);
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ element: el, maxHeight: 200 });
    });

    result.triggerResize();
    expect(el.style.height).toBe('200px');
    scope.stop();
  });

  it('applies the configured styleProp', () => {
    const el = makeTextarea(64);
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ element: el, styleProp: 'minHeight' });
    });

    result.triggerResize();
    expect(el.style.minHeight).toBe('64px');
    scope.stop();
  });

  it('sizes the styleTarget instead of the textarea when provided', () => {
    const el = makeTextarea(70);
    const wrapper = document.createElement('div');
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ element: el, styleTarget: wrapper });
    });

    result.triggerResize();
    expect(wrapper.style.height).toBe('70px');
    expect(el.style.height).toBe('');
    scope.stop();
  });

  it('resizes on textarea input event', async () => {
    const el = makeTextarea(90);
    const scope = effectScope();
    scope.run(() => useTextareaAutosize({ element: el }));
    await nextTick();

    el.style.height = '';
    el.dispatchEvent(new Event('input'));
    expect(el.style.height).toBe('90px');
    scope.stop();
  });

  it('resizes when the bound input ref changes', async () => {
    const el = makeTextarea(55);
    const input = ref('a');
    const scope = effectScope();
    scope.run(() => useTextareaAutosize({ element: el, input }));
    await nextTick();

    el.style.height = '';
    input.value = 'a longer value';
    // post-flush watch schedules nextTick(triggerResize): flush both
    await nextTick();
    await nextTick();
    expect(el.style.height).toBe('55px');
    scope.stop();
  });

  it('invokes onResize when the content height changes', async () => {
    const el = makeTextarea(40);
    const onResize = vi.fn();
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ element: el, onResize });
    });
    await nextTick();

    onResize.mockClear();
    result.triggerResize();
    // height unchanged -> no extra onResize
    expect(onResize).not.toHaveBeenCalled();
    scope.stop();
  });

  it('observes the textarea via ResizeObserver and resizes on width change', async () => {
    const el = makeTextarea(60);
    const scope = effectScope();
    scope.run(() => useTextareaAutosize({ element: el, window: syncWindow() }));
    await nextTick();

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, undefined);

    el.style.height = '';
    instances[0]!.cb([{ contentRect: { width: 123 } } as ResizeObserverEntry], instances[0] as unknown as ResizeObserver);
    expect(el.style.height).toBe('60px');
    scope.stop();
  });

  it('ignores ResizeObserver callbacks with an unchanged width', async () => {
    const el = makeTextarea(60);
    const scope = effectScope();
    scope.run(() => useTextareaAutosize({ element: el, window: syncWindow() }));
    await nextTick();

    const entry = [{ contentRect: { width: 200 } } as ResizeObserverEntry];
    instances[0]!.cb(entry, instances[0] as unknown as ResizeObserver);
    el.style.height = '';
    // same width again -> should not re-size
    instances[0]!.cb(entry, instances[0] as unknown as ResizeObserver);
    expect(el.style.height).toBe('');
    scope.stop();
  });

  it('resizes on a custom watch source', async () => {
    const el = makeTextarea(33);
    const dep = ref(0);
    const scope = effectScope();
    scope.run(() => useTextareaAutosize({ element: el, watch: dep }));
    await nextTick();

    el.style.height = '';
    dep.value = 1;
    await nextTick();
    expect(el.style.height).toBe('33px');
    scope.stop();
  });

  it('triggerResize is a no-op without a textarea (SSR / unmounted path)', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useTextareaAutosize>;
    scope.run(() => {
      result = useTextareaAutosize({ window: undefined });
    });

    // No textarea bound: must not throw
    expect(() => result.triggerResize()).not.toThrow();
    expect(instances).toHaveLength(0);
    scope.stop();
  });

  it('does not throw when constructed with no DOM globals supplied via options', () => {
    const scope = effectScope();
    expect(() => {
      scope.run(() => useTextareaAutosize({ window: undefined }));
    }).not.toThrow();
    scope.stop();
  });
});
