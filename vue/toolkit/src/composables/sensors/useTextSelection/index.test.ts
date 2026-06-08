import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useTextSelection } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
  // Clear any selection so tests stay isolated.
  globalThis.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
});

/**
 * jsdom never auto-fires `selectionchange`, so mutate the live selection and
 * dispatch the event ourselves to mimic real browser behavior.
 */
function selectContents(node: Node): void {
  const selection = globalThis.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

function clearSelection(): void {
  globalThis.getSelection()?.removeAllRanges();
  document.dispatchEvent(new Event('selectionchange'));
}

describe(useTextSelection, () => {
  it('starts empty when nothing is selected', () => {
    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    expect(state!.text.value).toBe('');
    expect(state!.ranges.value).toEqual([]);
    expect(state!.rects.value).toEqual([]);
    scope.stop();
  });

  it('tracks the selected text on selectionchange', async () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    document.body.appendChild(div);

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    selectContents(div);
    await nextTick();

    expect(state!.text.value).toBe('Hello World');
    scope.stop();
  });

  it('exposes the ranges that make up the selection', async () => {
    const div = document.createElement('div');
    div.textContent = 'Ranges here';
    document.body.appendChild(div);

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    selectContents(div);
    await nextTick();

    expect(state!.ranges.value).toHaveLength(1);
    expect(state!.ranges.value[0]).toBeInstanceOf(Range);
    expect(state!.ranges.value[0]!.toString()).toBe('Ranges here');
    scope.stop();
  });

  it('maps each range to its bounding rect', async () => {
    const div = document.createElement('div');
    div.textContent = 'Rect me';
    document.body.appendChild(div);

    // jsdom Range lacks getBoundingClientRect; define it before spying.
    const fakeRect = { x: 1, y: 2, width: 3, height: 4, top: 2, left: 1, right: 4, bottom: 6 } as DOMRect;
    const original = (Range.prototype as { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect;
    (Range.prototype as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => fakeRect;

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    selectContents(div);
    await nextTick();

    expect(state!.rects.value).toEqual([fakeRect]);

    if (original)
      (Range.prototype as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = original;
    else
      delete (Range.prototype as { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect;
    scope.stop();
  });

  it('exposes the raw Selection object', async () => {
    const div = document.createElement('div');
    div.textContent = 'Raw selection';
    document.body.appendChild(div);

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    selectContents(div);
    await nextTick();

    expect(state!.selection.value).not.toBeNull();
    expect(state!.selection.value!.toString()).toBe('Raw selection');
    scope.stop();
  });

  it('resets when the selection is cleared', async () => {
    const div = document.createElement('div');
    div.textContent = 'Will be cleared';
    document.body.appendChild(div);

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    selectContents(div);
    await nextTick();
    expect(state!.text.value).toBe('Will be cleared');

    clearSelection();
    await nextTick();

    expect(state!.text.value).toBe('');
    expect(state!.ranges.value).toEqual([]);
    expect(state!.rects.value).toEqual([]);
    scope.stop();
  });

  it('reacts to a new identity even when the browser mutates the same Selection in place', async () => {
    const a = document.createElement('div');
    a.textContent = 'First';
    const b = document.createElement('div');
    b.textContent = 'Second';
    document.body.append(a, b);

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection();
    });

    selectContents(a);
    await nextTick();
    expect(state!.text.value).toBe('First');

    selectContents(b);
    await nextTick();
    expect(state!.text.value).toBe('Second');
    scope.stop();
  });

  it('cleans up the listener when the scope is disposed', () => {
    const add = vi.fn();
    const remove = vi.fn();
    const windowStub = { getSelection: () => null } as unknown as Window;
    const documentStub = {
      addEventListener: add,
      removeEventListener: remove,
    } as unknown as Document;

    const scope = effectScope();
    scope.run(() => {
      useTextSelection({ window: windowStub, document: documentStub });
    });

    expect(add).toHaveBeenCalledWith('selectionchange', expect.any(Function), expect.anything());
    expect(remove).not.toHaveBeenCalled();

    scope.stop();

    expect(remove).toHaveBeenCalledWith('selectionchange', expect.any(Function), expect.anything());
  });

  it('accepts a custom document/window via options', async () => {
    let listener: ((event: Event) => void) | undefined;
    const selectionStub = {
      _text: '',
      rangeCount: 0,
      toString() { return this._text; },
      getRangeAt: vi.fn(),
    };
    const windowStub = {
      getSelection: () => selectionStub as unknown as Selection,
    } as unknown as Window;
    const documentStub = {
      addEventListener: (_type: string, cb: (event: Event) => void) => { listener = cb; },
      removeEventListener: vi.fn(),
    } as unknown as Document;

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection({ window: windowStub, document: documentStub });
    });

    expect(state!.text.value).toBe('');

    selectionStub._text = 'Custom doc text';
    listener?.(new Event('selectionchange'));
    await nextTick();

    expect(state!.text.value).toBe('Custom doc text');
    scope.stop();
  });

  it('returns empty state and registers no listener when selection is unsupported', () => {
    // Emulate an SSR / unsupported environment: getSelection yields null and the
    // document never emits selectionchange.
    const add = vi.fn();
    const windowStub = { getSelection: () => null } as unknown as Window;
    const documentStub = {
      addEventListener: add,
      removeEventListener: vi.fn(),
    } as unknown as Document;

    const scope = effectScope();
    let state: ReturnType<typeof useTextSelection>;
    scope.run(() => {
      state = useTextSelection({ window: windowStub, document: documentStub });
    });

    expect(state!.selection.value).toBeNull();
    expect(state!.text.value).toBe('');
    expect(state!.ranges.value).toEqual([]);
    expect(state!.rects.value).toEqual([]);
    scope.stop();
  });
});
