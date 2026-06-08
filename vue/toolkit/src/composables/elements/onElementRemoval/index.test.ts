import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { onElementRemoval } from '.';

let instances: Array<{ cb: MutationCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];

class StubMutationObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  cb: MutationCallback;
  constructor(cb: MutationCallback) {
    this.cb = cb;
    instances.push(this);
  }
}

function fireRemoval(index: number, removedNodes: Node[]): void {
  const record = { removedNodes } as unknown as MutationRecord;
  instances[index]!.cb([record], instances[index] as unknown as MutationObserver);
}

describe(onElementRemoval, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('MutationObserver', StubMutationObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('observes the document subtree once a target is available', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => onElementRemoval(ref(el), vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(
      document.documentElement,
      { childList: true, subtree: true },
    );
    scope.stop();
  });

  it('fires the callback when the element itself is removed', () => {
    const el = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => onElementRemoval(el, callback));

    fireRemoval(0, [el]);
    expect(callback).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('fires when an ancestor containing the element is removed', () => {
    const parent = document.createElement('div');
    const el = document.createElement('span');
    parent.appendChild(el);
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => onElementRemoval(el, callback));

    fireRemoval(0, [parent]);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([{ removedNodes: [parent] }]);
    scope.stop();
  });

  it('does not fire when an unrelated node is removed', () => {
    const el = document.createElement('div');
    const other = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => onElementRemoval(el, callback));

    fireRemoval(0, [other]);
    expect(callback).not.toHaveBeenCalled();
    scope.stop();
  });

  it('does not observe for a nullish target', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => onElementRemoval(ref(null), callback));

    expect(instances).toHaveLength(0);
    scope.stop();
  });

  it('re-observes when a reactive target appears, and tears down the old observer', async () => {
    const target = ref<HTMLElement | null>(null);
    const scope = effectScope();
    scope.run(() => onElementRemoval(target, vi.fn(), { flush: 'sync' }));

    expect(instances).toHaveLength(0);

    target.value = document.createElement('div');
    await nextTick();
    expect(instances).toHaveLength(1);

    target.value = document.createElement('span');
    await nextTick();
    expect(instances).toHaveLength(2);
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    scope.stop();
  });

  it('stop() disconnects and prevents further callbacks', () => {
    const el = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    let stop: () => void;
    scope.run(() => {
      stop = onElementRemoval(el, callback);
    });

    stop!();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    scope.stop();
  });

  it('disposes the observer when the scope stops', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => onElementRemoval(el, vi.fn()));

    expect(instances).toHaveLength(1);
    scope.stop();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
  });

  it('supports post flush timing', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => onElementRemoval(ref(el), vi.fn(), { flush: 'post' }));

    await nextTick();
    expect(instances).toHaveLength(1);
    scope.stop();
  });

  it('returns a no-op and does not observe when document is unavailable (SSR)', () => {
    const el = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    let stop: () => void;
    scope.run(() => {
      stop = onElementRemoval(el, callback, {
        window: { document: undefined } as unknown as Window & typeof globalThis,
      });
    });

    expect(instances).toHaveLength(0);
    expect(callback).not.toHaveBeenCalled();
    expect(() => stop!()).not.toThrow();
    scope.stop();
  });
});
