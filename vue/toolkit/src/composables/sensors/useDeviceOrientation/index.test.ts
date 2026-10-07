import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useDeviceOrientation } from '.';

interface OrientationStub {
  absolute?: boolean;
  alpha?: number | null;
  beta?: number | null;
  gamma?: number | null;
}

function dispatchOrientation(target: Window, data: OrientationStub): void {
  const event = Object.assign(new Event('deviceorientation'), data);
  target.dispatchEvent(event);
}

describe(useDeviceOrientation, () => {
  beforeEach(() => {
    // Ensure feature detection passes on the real jsdom window.
    if (!('DeviceOrientationEvent' in globalThis))
      vi.stubGlobal('DeviceOrientationEvent', class {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reports supported and initial values', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useDeviceOrientation>;
    scope.run(() => {
      result = useDeviceOrientation();
    });

    expect(result!.isSupported.value).toBeTruthy();
    expect(result!.requirePermissions.value).toBeFalsy();
    expect(result!.permissionGranted.value).toBeTruthy();
    expect(result!.isAbsolute.value).toBeFalsy();
    expect(result!.alpha.value).toBeNull();
    expect(result!.beta.value).toBeNull();
    expect(result!.gamma.value).toBeNull();
    scope.stop();
  });

  it('updates reactive values when a deviceorientation event fires', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useDeviceOrientation>;
    scope.run(() => {
      result = useDeviceOrientation();
    });

    dispatchOrientation(globalThis as unknown as Window, { absolute: true, alpha: 30, beta: 60, gamma: -45 });

    expect(result!.isAbsolute.value).toBeTruthy();
    expect(result!.alpha.value).toBe(30);
    expect(result!.beta.value).toBe(60);
    expect(result!.gamma.value).toBe(-45);
    scope.stop();
  });

  it('reflects subsequent events', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useDeviceOrientation>;
    scope.run(() => {
      result = useDeviceOrientation();
    });

    dispatchOrientation(globalThis as unknown as Window, { absolute: true, alpha: 30, beta: 60, gamma: -45 });
    dispatchOrientation(globalThis as unknown as Window, { absolute: false, alpha: 90, beta: 0, gamma: 10 });

    expect(result!.isAbsolute.value).toBeFalsy();
    expect(result!.alpha.value).toBe(90);
    expect(result!.beta.value).toBe(0);
    expect(result!.gamma.value).toBe(10);
    scope.stop();
  });

  it('registers the listener with a passive option', () => {
    const target = {
      DeviceOrientationEvent: class {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    const scope = effectScope();
    scope.run(() => {
      useDeviceOrientation({ window: target });
    });

    expect(target.addEventListener).toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function),
      expect.objectContaining({ passive: true }),
    );
    scope.stop();
  });

  it('stops listening when the scope is disposed', () => {
    const target = {
      DeviceOrientationEvent: class {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    const scope = effectScope();
    scope.run(() => {
      useDeviceOrientation({ window: target });
    });
    scope.stop();

    expect(target.removeEventListener).toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function),
      expect.objectContaining({ passive: true }),
    );
  });

  it('reports unsupported and stays inert when DeviceOrientationEvent is missing on the provided window (SSR / unsupported path)', () => {
    // A window-like object without `DeviceOrientationEvent` models both an
    // unsupported browser and the SSR fallback (defaultWindow === undefined
    // is import-time captured and cannot be re-stubbed here).
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    const scope = effectScope();
    let result: ReturnType<typeof useDeviceOrientation>;
    scope.run(() => {
      result = useDeviceOrientation({ window: target });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.alpha.value).toBeNull();
    expect(result!.beta.value).toBeNull();
    expect(result!.gamma.value).toBeNull();
    scope.stop();
  });

  describe('iOS permission flow', () => {
    type Listener = (event: Event) => void;

    function makeIosWindow(response: 'granted' | 'denied' | Error) {
      const listeners = new Map<string, Set<Listener>>();
      const ctor = class {} as unknown as { requestPermission: () => Promise<'granted' | 'denied'> };
      ctor.requestPermission = vi.fn(() =>
        response instanceof Error ? Promise.reject(response) : Promise.resolve(response));

      const target = {
        DeviceOrientationEvent: ctor,
        addEventListener: (type: string, cb: Listener) => {
          if (!listeners.has(type))
            listeners.set(type, new Set());
          listeners.get(type)!.add(cb);
        },
        removeEventListener: (type: string, cb: Listener) => listeners.get(type)?.delete(cb),
        dispatchEvent: (event: Event) => {
          for (const cb of listeners.get(event.type) ?? []) cb(event);
          return true;
        },
      } as unknown as Window;

      return { ctor, target, listeners };
    }

    it('defers binding until permission is granted', async () => {
      const { ctor, target, listeners } = makeIosWindow('granted');
      const scope = effectScope();
      let result: ReturnType<typeof useDeviceOrientation>;
      scope.run(() => {
        result = useDeviceOrientation({ window: target });
      });

      expect(result!.requirePermissions.value).toBeTruthy();
      expect(result!.permissionGranted.value).toBeFalsy();
      expect(listeners.get('deviceorientation')).toBeUndefined();

      await result!.ensurePermissions();

      expect(ctor.requestPermission).toHaveBeenCalledTimes(1);
      expect(result!.permissionGranted.value).toBeTruthy();

      dispatchOrientation(target, { absolute: false, alpha: 10, beta: 80, gamma: 5 });
      expect(result!.beta.value).toBe(80);

      // A second call does not ask again.
      await result!.ensurePermissions();
      expect(ctor.requestPermission).toHaveBeenCalledTimes(1);
      scope.stop();
    });

    it('requests eagerly when requestPermissions is true', async () => {
      const { ctor, target, listeners } = makeIosWindow('granted');
      const scope = effectScope();
      let result: ReturnType<typeof useDeviceOrientation>;
      scope.run(() => {
        result = useDeviceOrientation({ window: target, requestPermissions: true });
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(ctor.requestPermission).toHaveBeenCalled();
      expect(result!.permissionGranted.value).toBeTruthy();
      expect(listeners.get('deviceorientation')?.size).toBe(1);
      scope.stop();
    });

    it('leaves the listener unbound when permission is denied', async () => {
      const { target, listeners } = makeIosWindow('denied');
      const scope = effectScope();
      let result: ReturnType<typeof useDeviceOrientation>;
      scope.run(() => {
        result = useDeviceOrientation({ window: target });
      });

      await result!.ensurePermissions();

      expect(result!.permissionGranted.value).toBeFalsy();
      expect(listeners.get('deviceorientation')).toBeUndefined();
      scope.stop();
    });

    it('routes a rejected request through onError without throwing', async () => {
      const { target } = makeIosWindow(new Error('blocked'));
      const onError = vi.fn();
      const scope = effectScope();
      let result: ReturnType<typeof useDeviceOrientation>;
      scope.run(() => {
        result = useDeviceOrientation({ window: target, onError });
      });

      await expect(result!.ensurePermissions()).resolves.toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(result!.permissionGranted.value).toBeFalsy();
      scope.stop();
    });
  });
});
