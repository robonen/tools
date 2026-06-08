import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick, ref, shallowRef } from 'vue';
import { useScrollLock } from '.';

function makeIOSNavigator(): Navigator {
  return {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    platform: 'iPhone',
    maxTouchPoints: 5,
  } as unknown as Navigator;
}

function makeDesktopNavigator(): Navigator {
  return {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    platform: 'MacIntel',
    maxTouchPoints: 0,
  } as unknown as Navigator;
}

describe(useScrollLock, () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a writable boolean ref (not readonly)', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el));
    });

    expect(isLocked!.value).toBeFalsy();
    expect(isReadonly(isLocked!)).toBeFalsy();
    scope.stop();
  });

  it('respects the initialState argument and applies overflow when the element resolves', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), true);
    });
    await nextTick();

    expect(isLocked!.value).toBeTruthy();
    expect(el.style.overflow).toBe('hidden');
    scope.stop();
  });

  it('sets overflow:hidden when locked via the setter', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeDesktopNavigator() });
    });

    expect(el.style.overflow).toBe('');

    isLocked!.value = true;
    expect(el.style.overflow).toBe('hidden');
    expect(isLocked!.value).toBeTruthy();
    scope.stop();
  });

  it('restores the prior overflow value on unlock', () => {
    const el = document.createElement('div');
    el.style.overflow = 'auto';
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeDesktopNavigator() });
    });

    isLocked!.value = true;
    expect(el.style.overflow).toBe('hidden');

    isLocked!.value = false;
    expect(el.style.overflow).toBe('auto');
    expect(isLocked!.value).toBeFalsy();
    scope.stop();
  });

  it('restores an empty inline overflow when none was set before locking', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeDesktopNavigator() });
    });

    isLocked!.value = true;
    expect(el.style.overflow).toBe('hidden');

    isLocked!.value = false;
    expect(el.style.overflow).toBe('');
    scope.stop();
  });

  it('lock is idempotent — setting true twice does not change state', () => {
    const el = document.createElement('div');
    el.style.overflow = 'scroll';
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeDesktopNavigator() });
    });

    isLocked!.value = true;
    isLocked!.value = true;
    expect(el.style.overflow).toBe('hidden');

    isLocked!.value = false;
    // The original 'scroll' is preserved across the double-lock.
    expect(el.style.overflow).toBe('scroll');
    scope.stop();
  });

  it('treats an element that already has overflow:hidden as locked', async () => {
    const el = document.createElement('div');
    el.style.overflow = 'hidden';
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el));
    });
    await nextTick();

    expect(isLocked!.value).toBeTruthy();
    scope.stop();
  });

  it('applies the lock once a lazily-resolved element appears', async () => {
    const target = shallowRef<HTMLElement | null>(null);
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(target);
    });

    isLocked!.value = true;
    // No element yet, so nothing to lock.
    expect(isLocked!.value).toBeFalsy();

    const el = document.createElement('div');
    target.value = el;
    await nextTick();

    // The watcher sees isLocked still false; lock again now that the el exists.
    isLocked!.value = true;
    expect(el.style.overflow).toBe('hidden');
    scope.stop();
  });

  it('does nothing when there is no element', () => {
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(null));
    });

    isLocked!.value = true;
    expect(isLocked!.value).toBeFalsy();
    isLocked!.value = false;
    expect(isLocked!.value).toBeFalsy();
    scope.stop();
  });

  it('registers a passive:false touchmove listener on iOS when locking', () => {
    const el = document.createElement('div');
    const addSpy = vi.spyOn(el, 'addEventListener');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeIOSNavigator() });
    });

    isLocked!.value = true;

    expect(addSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      expect.objectContaining({ passive: false }),
    );
    scope.stop();
  });

  it('does not register a touchmove listener on non-iOS platforms', () => {
    const el = document.createElement('div');
    const addSpy = vi.spyOn(el, 'addEventListener');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeDesktopNavigator() });
    });

    isLocked!.value = true;

    expect(addSpy).not.toHaveBeenCalledWith('touchmove', expect.any(Function), expect.anything());
    scope.stop();
  });

  it('removes the iOS touchmove listener on unlock', () => {
    const el = document.createElement('div');
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeIOSNavigator() });
    });

    isLocked!.value = true;
    isLocked!.value = false;

    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.objectContaining({ passive: false }));
    scope.stop();
  });

  it('prevents default on a single-touch touchmove over a non-scrollable target (iOS)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    let captured: EventListener | undefined;
    vi.spyOn(el, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'touchmove')
        captured = listener as EventListener;
    });

    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeIOSNavigator() });
    });
    isLocked!.value = true;

    expect(captured).toBeTypeOf('function');

    const event = {
      target: el,
      touches: [{}],
      cancelable: true,
      preventDefault: vi.fn(),
    } as unknown as TouchEvent;
    captured!(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    document.body.removeChild(el);
    scope.stop();
  });

  it('does NOT prevent default for multi-touch gestures (iOS pinch-zoom)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    let captured: EventListener | undefined;
    vi.spyOn(el, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'touchmove')
        captured = listener as EventListener;
    });

    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeIOSNavigator() });
    });
    isLocked!.value = true;

    const event = {
      target: el,
      touches: [{}, {}],
      cancelable: true,
      preventDefault: vi.fn(),
    } as unknown as TouchEvent;
    captured!(event);

    expect(event.preventDefault).not.toHaveBeenCalled();

    document.body.removeChild(el);
    scope.stop();
  });

  it('does NOT prevent default when the touch target is itself scrollable (iOS)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    let captured: EventListener | undefined;
    vi.spyOn(el, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'touchmove')
        captured = listener as EventListener;
    });

    const scrollable = document.createElement('div');
    el.appendChild(scrollable);

    // Force the inner element to look scrollable.
    const win = {
      getComputedStyle: (node: Element) =>
        node === scrollable
          ? ({ overflowX: 'scroll', overflowY: 'scroll' } as CSSStyleDeclaration)
          : ({ overflowX: 'visible', overflowY: 'visible' } as CSSStyleDeclaration),
    } as unknown as Window;

    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeIOSNavigator(), window: win });
    });
    isLocked!.value = true;

    const event = {
      target: scrollable,
      touches: [{}],
      cancelable: true,
      preventDefault: vi.fn(),
    } as unknown as TouchEvent;
    captured!(event);

    expect(event.preventDefault).not.toHaveBeenCalled();

    el.removeChild(scrollable);
    document.body.removeChild(el);
    scope.stop();
  });

  it('restores overflow and detaches the touchmove listener on scope dispose', () => {
    // The composable registers tryOnScopeDispose(unlock), so disposing the scope
    // restores the prior overflow and tears the iOS touchmove listener down even
    // though the lock was triggered from the setter (outside the scope).
    const el = document.createElement('div');
    el.style.overflow = 'auto';
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, { navigator: makeIOSNavigator() });
    });

    isLocked!.value = true;
    expect(el.style.overflow).toBe('hidden');

    scope.stop();

    expect(el.style.overflow).toBe('auto');
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.anything());
  });

  it('does not register listeners when window is falsy (SSR)', () => {
    const el = document.createElement('div');
    const addSpy = vi.spyOn(el, 'addEventListener');
    const scope = effectScope();
    let isLocked: ReturnType<typeof useScrollLock>;
    scope.run(() => {
      isLocked = useScrollLock(ref(el), false, {
        window: null as unknown as Window,
        navigator: makeIOSNavigator(),
      });
    });

    isLocked!.value = true;

    // overflow is still toggled, but no iOS touchmove listener is attached.
    expect(el.style.overflow).toBe('hidden');
    expect(addSpy).not.toHaveBeenCalledWith('touchmove', expect.any(Function), expect.anything());
    scope.stop();
  });
});
