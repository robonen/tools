import { describe, expect, it } from 'vitest';
import { effectScope, isReadonly } from 'vue';
import { useWindowFocus } from '.';

interface FakeWindow {
  document: { hasFocus: () => boolean };
  addEventListener: Window['addEventListener'];
  removeEventListener: Window['removeEventListener'];
  dispatchEvent: Window['dispatchEvent'];
}

// Build a minimal window-like object whose event plumbing is driven by a real
// EventTarget, while `document.hasFocus()` is controllable for initial state.
function createFakeWindow(initialFocus: boolean): FakeWindow {
  const target = new EventTarget();

  return {
    document: { hasFocus: () => initialFocus },
    addEventListener: target.addEventListener.bind(target) as Window['addEventListener'],
    removeEventListener: target.removeEventListener.bind(target) as Window['removeEventListener'],
    dispatchEvent: target.dispatchEvent.bind(target) as Window['dispatchEvent'],
  };
}

describe(useWindowFocus, () => {
  it('initialises from document.hasFocus() (focused)', () => {
    const fakeWindow = createFakeWindow(true);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    expect(focused!.value).toBeTruthy();

    scope.stop();
  });

  it('initialises from document.hasFocus() (blurred)', () => {
    const fakeWindow = createFakeWindow(false);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    expect(focused!.value).toBeFalsy();

    scope.stop();
  });

  it('becomes false on blur', () => {
    const fakeWindow = createFakeWindow(true);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    expect(focused!.value).toBeTruthy();

    fakeWindow.dispatchEvent(new Event('blur'));
    expect(focused!.value).toBeFalsy();

    scope.stop();
  });

  it('becomes true on focus', () => {
    const fakeWindow = createFakeWindow(false);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    expect(focused!.value).toBeFalsy();

    fakeWindow.dispatchEvent(new Event('focus'));
    expect(focused!.value).toBeTruthy();

    scope.stop();
  });

  it('tracks repeated focus/blur transitions', () => {
    const fakeWindow = createFakeWindow(true);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    fakeWindow.dispatchEvent(new Event('blur'));
    expect(focused!.value).toBeFalsy();

    fakeWindow.dispatchEvent(new Event('focus'));
    expect(focused!.value).toBeTruthy();

    fakeWindow.dispatchEvent(new Event('blur'));
    expect(focused!.value).toBeFalsy();

    scope.stop();
  });

  it('removes listeners when the scope is disposed', () => {
    const fakeWindow = createFakeWindow(true);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    scope.stop();

    // after disposal, events must no longer mutate the ref
    fakeWindow.dispatchEvent(new Event('blur'));
    expect(focused!.value).toBeTruthy();
  });

  it('returns a writable shallow ref (not readonly)', () => {
    const fakeWindow = createFakeWindow(true);

    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: fakeWindow as unknown as Window });
    });

    expect(isReadonly(focused!)).toBeFalsy();

    scope.stop();
  });

  it('returns false and does not throw when window is unavailable (SSR)', () => {
    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus({ window: undefined });
    });

    expect(focused!.value).toBeFalsy();

    scope.stop();
  });

  it('uses the real jsdom window by default', () => {
    const scope = effectScope();
    let focused: ReturnType<typeof useWindowFocus>;
    scope.run(() => {
      focused = useWindowFocus();
    });

    // initial value mirrors document.hasFocus()
    expect(focused!.value).toBe(document.hasFocus());

    globalThis.dispatchEvent(new Event('blur'));
    expect(focused!.value).toBeFalsy();

    globalThis.dispatchEvent(new Event('focus'));
    expect(focused!.value).toBeTruthy();

    scope.stop();
  });
});
