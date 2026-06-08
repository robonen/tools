import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useScreenOrientation } from '.';
import type { OrientationLockType, OrientationType } from '.';

type Listener = (event: Event) => void;

interface StubScreenOrientation {
  type: OrientationType;
  angle: number;
  lock: ReturnType<typeof vi.fn>;
  unlock: ReturnType<typeof vi.fn>;
  addEventListener: (type: string, cb: Listener) => void;
  removeEventListener: (type: string, cb: Listener) => void;
  dispatch: (type: OrientationType, angle: number) => void;
}

function makeScreenOrientation(
  type: OrientationType = 'portrait-primary',
  angle = 0,
): StubScreenOrientation {
  const listeners = new Set<Listener>();

  const so: StubScreenOrientation = {
    type,
    angle,
    lock: vi.fn(() => Promise.resolve()),
    unlock: vi.fn(),
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    dispatch(nextType: OrientationType, nextAngle: number) {
      so.type = nextType;
      so.angle = nextAngle;
      for (const cb of listeners) cb(new Event('change'));
    },
  };

  return so;
}

/** A window stub exposing `screen.orientation` + an event target for `orientationchange`. */
function makeWindowStub(so?: StubScreenOrientation): Window {
  const winListeners = new Set<Listener>();
  return {
    screen: so ? { orientation: so } : {},
    addEventListener: (_: string, cb: Listener) => winListeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => winListeners.delete(cb),
  } as unknown as Window;
}

describe(useScreenOrientation, () => {
  beforeEach(() => {
    // Force the SSR / unsupported branch unless a window is passed via options.
    vi.stubGlobal('screen', undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reports supported when screen.orientation is present', async () => {
    const window = makeWindowStub(makeScreenOrientation());
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();
    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reflects the initial orientation type and angle', async () => {
    const so = makeScreenOrientation('landscape-primary', 90);
    const window = makeWindowStub(so);
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();
    expect(result!.orientation.value).toBe('landscape-primary');
    expect(result!.angle.value).toBe(90);
    scope.stop();
  });

  it('updates on the screen.orientation change event', async () => {
    const so = makeScreenOrientation('portrait-primary', 0);
    const window = makeWindowStub(so);
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();
    expect(result!.orientation.value).toBe('portrait-primary');

    so.dispatch('landscape-secondary', 270);
    await nextTick();
    expect(result!.orientation.value).toBe('landscape-secondary');
    expect(result!.angle.value).toBe(270);

    scope.stop();
  });

  it('lockOrientation delegates to screen.orientation.lock', async () => {
    const so = makeScreenOrientation();
    const window = makeWindowStub(so);
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();

    const type: OrientationLockType = 'landscape';
    await expect(result!.lockOrientation(type)).resolves.toBeUndefined();
    expect(so.lock).toHaveBeenCalledWith('landscape');

    scope.stop();
  });

  it('unlockOrientation delegates to screen.orientation.unlock', async () => {
    const so = makeScreenOrientation();
    const window = makeWindowStub(so);
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();

    result!.unlockOrientation();
    expect(so.unlock).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('stops updating after the scope is disposed', async () => {
    const so = makeScreenOrientation('portrait-primary', 0);
    const window = makeWindowStub(so);
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();

    scope.stop();

    so.dispatch('landscape-primary', 90);
    await nextTick();
    // Listener removed on dispose, so the value should not have changed.
    expect(result!.orientation.value).toBe('portrait-primary');
    expect(result!.angle.value).toBe(0);
  });

  it('is unsupported and safe when no window is available (SSR)', async () => {
    // Pass an explicit falsy window: a destructuring default only fires for
    // `undefined`, so `null` lets us exercise the genuine no-window branch.
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window: null as unknown as Window });
    });
    await nextTick();

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.orientation.value).toBeUndefined();
    expect(result!.angle.value).toBe(0);
    expect(() => result!.unlockOrientation()).not.toThrow();
    await expect(result!.lockOrientation('any')).rejects.toThrow('Not supported');

    scope.stop();
  });

  it('is unsupported when screen lacks orientation', async () => {
    const window = makeWindowStub();
    const scope = effectScope();
    let result: ReturnType<typeof useScreenOrientation>;
    scope.run(() => {
      result = useScreenOrientation({ window });
    });
    await nextTick();

    expect(result!.isSupported.value).toBeFalsy();
    await expect(result!.lockOrientation('portrait')).rejects.toThrow('Not supported');

    scope.stop();
  });
});
