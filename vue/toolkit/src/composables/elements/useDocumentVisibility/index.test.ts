import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useDocumentVisibility } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe(useDocumentVisibility, () => {
  it('reads the current visibility state', () => {
    const scope = effectScope();
    let visibility: ReturnType<typeof useDocumentVisibility>;
    scope.run(() => {
      visibility = useDocumentVisibility();
    });

    expect(visibility!.value).toBe('visible');
    scope.stop();
  });

  it('updates on visibilitychange', async () => {
    const scope = effectScope();
    let visibility: ReturnType<typeof useDocumentVisibility>;
    scope.run(() => {
      visibility = useDocumentVisibility();
    });

    setVisibility('hidden');
    await nextTick();

    expect(visibility!.value).toBe('hidden');
    scope.stop();
  });

  it('invokes onChange with new state, previous state, and the event', async () => {
    const onChange = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useDocumentVisibility({ onChange });
    });

    setVisibility('hidden');
    await nextTick();

    expect(onChange).toHaveBeenCalledTimes(1);
    const [state, previous, event] = onChange.mock.calls[0]!;
    expect(state).toBe('hidden');
    expect(previous).toBe('visible');
    expect(event).toBeInstanceOf(Event);

    setVisibility('visible');
    await nextTick();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1]!.slice(0, 2)).toEqual(['visible', 'hidden']);
    scope.stop();
  });

  it('does not update or fire onChange when the state is unchanged', async () => {
    const onChange = vi.fn();
    const scope = effectScope();
    let visibility: ReturnType<typeof useDocumentVisibility>;
    scope.run(() => {
      visibility = useDocumentVisibility({ onChange });
    });

    // visibilityState is already 'visible'; dispatching with no real change is a no-op
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();

    expect(onChange).not.toHaveBeenCalled();
    expect(visibility!.value).toBe('visible');
    scope.stop();
  });

  it('reflects a non-default initial state at setup time', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    const scope = effectScope();
    let visibility: ReturnType<typeof useDocumentVisibility>;
    scope.run(() => {
      visibility = useDocumentVisibility();
    });

    expect(visibility!.value).toBe('hidden');
    scope.stop();
  });

  it('is SSR-safe and returns "visible" without a document', () => {
    const scope = effectScope();
    let visibility: ReturnType<typeof useDocumentVisibility>;
    scope.run(() => {
      visibility = useDocumentVisibility({ document: undefined });
    });

    expect(visibility!.value).toBe('visible');
    scope.stop();
  });

  it('accepts a custom document instance', async () => {
    const onChange = vi.fn();
    let listener: ((event: Event) => void) | undefined;
    const customDoc = {
      visibilityState: 'visible' as DocumentVisibilityState,
      addEventListener: (_type: string, cb: (event: Event) => void) => { listener = cb; },
      removeEventListener: vi.fn(),
    } as unknown as Document;

    const scope = effectScope();
    let visibility: ReturnType<typeof useDocumentVisibility>;
    scope.run(() => {
      visibility = useDocumentVisibility({ document: customDoc, onChange });
    });

    expect(visibility!.value).toBe('visible');

    (customDoc as { visibilityState: DocumentVisibilityState }).visibilityState = 'hidden';
    listener?.(new Event('visibilitychange'));
    await nextTick();

    expect(visibility!.value).toBe('hidden');
    expect(onChange).toHaveBeenCalledWith('hidden', 'visible', expect.any(Event));
    scope.stop();
  });
});
