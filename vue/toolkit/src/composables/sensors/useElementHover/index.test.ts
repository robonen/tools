import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { useElementHover } from '.';

function dispatch(el: HTMLElement, type: 'mouseenter' | 'mouseleave') {
  el.dispatchEvent(new Event(type));
}

describe(useElementHover, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is false initially', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el));
    });

    expect(isHovered!.value).toBeFalsy();
    scope.stop();
  });

  it('toggles on mouseenter / mouseleave', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el));
    });

    dispatch(el, 'mouseenter');
    expect(isHovered!.value).toBeTruthy();

    dispatch(el, 'mouseleave');
    expect(isHovered!.value).toBeFalsy();
    scope.stop();
  });

  it('returns a writable shallow ref (not readonly)', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el));
    });

    expect(isReadonly(isHovered!)).toBeFalsy();
    scope.stop();
  });

  it('respects delayEnter', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el), { delayEnter: 100 });
    });

    dispatch(el, 'mouseenter');
    expect(isHovered!.value).toBeFalsy();

    vi.advanceTimersByTime(99);
    expect(isHovered!.value).toBeFalsy();

    vi.advanceTimersByTime(1);
    expect(isHovered!.value).toBeTruthy();
    scope.stop();
  });

  it('respects delayLeave', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el), { delayLeave: 200 });
    });

    dispatch(el, 'mouseenter');
    expect(isHovered!.value).toBeTruthy();

    dispatch(el, 'mouseleave');
    expect(isHovered!.value).toBeTruthy();

    vi.advanceTimersByTime(199);
    expect(isHovered!.value).toBeTruthy();

    vi.advanceTimersByTime(1);
    expect(isHovered!.value).toBeFalsy();
    scope.stop();
  });

  it('cancels a pending enter timer when leaving before the delay elapses', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el), { delayEnter: 100 });
    });

    dispatch(el, 'mouseenter');
    vi.advanceTimersByTime(50);
    expect(isHovered!.value).toBeFalsy();

    // Leaving cancels the pending enter; with no leave delay it settles to false.
    dispatch(el, 'mouseleave');
    vi.advanceTimersByTime(100);
    expect(isHovered!.value).toBeFalsy();
    scope.stop();
  });

  it('cancels a pending leave timer when re-entering before the delay elapses', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el), { delayLeave: 200 });
    });

    dispatch(el, 'mouseenter');
    expect(isHovered!.value).toBeTruthy();

    dispatch(el, 'mouseleave');
    vi.advanceTimersByTime(100);
    // Re-enter before the leave delay finishes: stays hovered, no flip.
    dispatch(el, 'mouseenter');
    vi.advanceTimersByTime(200);
    expect(isHovered!.value).toBeTruthy();
    scope.stop();
  });

  it('stops listening once the scope is disposed', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el));
    });

    scope.stop();

    dispatch(el, 'mouseenter');
    expect(isHovered!.value).toBeFalsy();
  });

  it('clears a pending timer on scope dispose (no late update)', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el), { delayEnter: 100 });
    });

    dispatch(el, 'mouseenter');
    scope.stop();

    vi.advanceTimersByTime(200);
    expect(isHovered!.value).toBeFalsy();
  });

  it('returns a static ref and registers no listeners when window is falsy (SSR)', () => {
    // `defaultWindow` is captured at import time and cannot be stubbed via
    // vi.stubGlobal, so we cast a falsy window through options to exercise the
    // SSR early-return without touching the global. Note that passing literal
    // `undefined` would resolve back to `defaultWindow` via the destructure
    // default, hence the explicit null cast here.
    const el = document.createElement('div');
    const addSpy = vi.spyOn(el, 'addEventListener');
    const scope = effectScope();
    let isHovered: ReturnType<typeof useElementHover>;
    scope.run(() => {
      isHovered = useElementHover(ref(el), { window: null as unknown as Window });
    });

    expect(isHovered!.value).toBeFalsy();
    expect(addSpy).not.toHaveBeenCalled();

    dispatch(el, 'mouseenter');
    expect(isHovered!.value).toBeFalsy();
    scope.stop();
  });
});
