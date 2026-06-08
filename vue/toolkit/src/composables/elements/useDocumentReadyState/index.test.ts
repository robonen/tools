import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useDocumentReadyState } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
});

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', { value: state, configurable: true });
  document.dispatchEvent(new Event('readystatechange'));
}

describe(useDocumentReadyState, () => {
  it('reads the current ready state', () => {
    const scope = effectScope();
    let readyState: ReturnType<typeof useDocumentReadyState>;
    scope.run(() => {
      readyState = useDocumentReadyState();
    });

    expect(readyState!.value).toBe('complete');
    scope.stop();
  });

  it('reflects a non-default initial state at setup time', () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

    const scope = effectScope();
    let readyState: ReturnType<typeof useDocumentReadyState>;
    scope.run(() => {
      readyState = useDocumentReadyState();
    });

    expect(readyState!.value).toBe('loading');
    scope.stop();
  });

  it('updates on readystatechange', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

    const scope = effectScope();
    let readyState: ReturnType<typeof useDocumentReadyState>;
    scope.run(() => {
      readyState = useDocumentReadyState();
    });

    expect(readyState!.value).toBe('loading');

    setReadyState('interactive');
    await nextTick();
    expect(readyState!.value).toBe('interactive');

    setReadyState('complete');
    await nextTick();
    expect(readyState!.value).toBe('complete');

    scope.stop();
  });

  it('invokes onChange with new state, previous state, and the event', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

    const onChange = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useDocumentReadyState({ onChange });
    });

    setReadyState('interactive');
    await nextTick();

    expect(onChange).toHaveBeenCalledTimes(1);
    const [state, previous, event] = onChange.mock.calls[0]!;
    expect(state).toBe('interactive');
    expect(previous).toBe('loading');
    expect(event).toBeInstanceOf(Event);

    setReadyState('complete');
    await nextTick();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1]!.slice(0, 2)).toEqual(['complete', 'interactive']);
    scope.stop();
  });

  it('does not update or fire onChange when the state is unchanged', async () => {
    const onChange = vi.fn();
    const scope = effectScope();
    let readyState: ReturnType<typeof useDocumentReadyState>;
    scope.run(() => {
      readyState = useDocumentReadyState({ onChange });
    });

    // readyState is already 'complete'; dispatching with no real change is a no-op
    document.dispatchEvent(new Event('readystatechange'));
    await nextTick();

    expect(onChange).not.toHaveBeenCalled();
    expect(readyState!.value).toBe('complete');
    scope.stop();
  });

  it('is SSR-safe and returns "loading" without a document', () => {
    // Passing `document: undefined` resolves to the default document, so to exercise the
    // no-document branch we cast a falsy value that bypasses the default-parameter logic.
    const scope = effectScope();
    let readyState: ReturnType<typeof useDocumentReadyState>;
    scope.run(() => {
      readyState = useDocumentReadyState({ document: null as unknown as Document });
    });

    expect(readyState!.value).toBe('loading');
    scope.stop();
  });

  it('accepts a custom document instance', async () => {
    const onChange = vi.fn();
    let listener: ((event: Event) => void) | undefined;
    const customDoc = {
      readyState: 'loading' as DocumentReadyState,
      addEventListener: (_type: string, cb: (event: Event) => void) => { listener = cb; },
      removeEventListener: vi.fn(),
    } as unknown as Document;

    const scope = effectScope();
    let readyState: ReturnType<typeof useDocumentReadyState>;
    scope.run(() => {
      readyState = useDocumentReadyState({ document: customDoc, onChange });
    });

    expect(readyState!.value).toBe('loading');

    (customDoc as { readyState: DocumentReadyState }).readyState = 'complete';
    listener?.(new Event('readystatechange'));
    await nextTick();

    expect(readyState!.value).toBe('complete');
    expect(onChange).toHaveBeenCalledWith('complete', 'loading', expect.any(Event));
    scope.stop();
  });
});
