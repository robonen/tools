import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import * as types from '@/types';
import { useDeviceMotion } from '.';

type Listener = (event: Event) => void;

interface WindowStub {
  DeviceMotionEvent?: unknown;
  addEventListener: (type: string, cb: Listener, options?: unknown) => void;
  removeEventListener: (type: string, cb: Listener) => void;
  dispatch: (type: string, event: Event) => void;
  listeners: Map<string, Set<Listener>>;
}

function makeWindowStub(options: { supported?: boolean; ios?: unknown } = {}): WindowStub {
  const { supported = true, ios } = options;
  const listeners = new Map<string, Set<Listener>>();

  const stub: WindowStub = {
    listeners,
    addEventListener(type, cb) {
      if (!listeners.has(type))
        listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener(type, cb) {
      listeners.get(type)?.delete(cb);
    },
    dispatch(type, event) {
      for (const cb of listeners.get(type) ?? []) cb(event);
    },
  };

  if (supported)
    stub.DeviceMotionEvent = ios ?? function DeviceMotionEvent() {};

  return stub;
}

function makeMotionEvent(): DeviceMotionEvent {
  return {
    acceleration: { x: 1, y: 2, z: 3 },
    accelerationIncludingGravity: { x: 4, y: 5, z: 6 },
    rotationRate: { alpha: 7, beta: 8, gamma: 9 },
    interval: 16,
  } as DeviceMotionEvent;
}

function runInScope<T>(fn: () => T): { result: T; scope: ReturnType<typeof effectScope> } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, scope };
}

describe(useDeviceMotion, () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports supported and initial values', () => {
    const window = makeWindowStub();
    const { result, scope } = runInScope(() => useDeviceMotion({ window: window as unknown as Window }));

    expect(result.isSupported.value).toBeTruthy();
    expect(result.requirePermissions.value).toBeFalsy();
    expect(result.acceleration.value).toBeNull();
    expect(result.accelerationIncludingGravity.value).toBeNull();
    expect(result.rotationRate.value).toBeNull();
    expect(result.interval.value).toBe(0);

    scope.stop();
  });

  it('binds a passive devicemotion listener and updates on events', () => {
    const window = makeWindowStub();
    const { result, scope } = runInScope(() => useDeviceMotion({ window: window as unknown as Window }));

    expect(window.listeners.get('devicemotion')?.size).toBe(1);

    window.dispatch('devicemotion', makeMotionEvent());

    expect(result.acceleration.value).toEqual({ x: 1, y: 2, z: 3 });
    expect(result.accelerationIncludingGravity.value).toEqual({ x: 4, y: 5, z: 6 });
    expect(result.rotationRate.value).toEqual({ alpha: 7, beta: 8, gamma: 9 });
    expect(result.interval.value).toBe(16);

    scope.stop();
  });

  it('removes the listener when the scope is disposed', () => {
    const window = makeWindowStub();
    const { result, scope } = runInScope(() => useDeviceMotion({ window: window as unknown as Window }));

    expect(window.listeners.get('devicemotion')?.size).toBe(1);
    scope.stop();
    expect(window.listeners.get('devicemotion')?.size).toBe(0);

    // Events after dispose must not mutate the refs.
    window.dispatch('devicemotion', makeMotionEvent());
    expect(result.acceleration.value).toBeNull();
  });

  it('applies the eventFilter so updates can be suppressed', () => {
    const window = makeWindowStub();
    const { result, scope } = runInScope(() =>
      useDeviceMotion({ window: window as unknown as Window, eventFilter: () => {} }));

    window.dispatch('devicemotion', makeMotionEvent());

    // Filter never invokes the handler — values stay at their initial state.
    expect(result.acceleration.value).toBeNull();
    expect(result.interval.value).toBe(0);

    scope.stop();
  });

  it('is a no-op and reports unsupported when no window/DeviceMotionEvent (SSR)', () => {
    // `{ window: undefined }` re-applies the `defaultWindow` default (jsdom global),
    // so the genuine SSR/unsupported path is exercised with a window lacking the API.
    const window = makeWindowStub({ supported: false });
    const { result, scope } = runInScope(() => useDeviceMotion({ window: window as unknown as Window }));

    expect(result.isSupported.value).toBeFalsy();
    expect(result.requirePermissions.value).toBeFalsy();
    expect(result.acceleration.value).toBeNull();
    expect(window.listeners.get('devicemotion')).toBeUndefined();
    expect(() => result.ensurePermissions()).not.toThrow();

    scope.stop();
  });

  it('is a no-op when defaultWindow is undefined (true SSR)', async () => {
    vi.resetModules();
    vi.doMock('@/types', () => ({ ...types, defaultWindow: undefined }));

    const { useDeviceMotion: ssrUseDeviceMotion } = await import('.');
    const { result, scope } = runInScope(() => ssrUseDeviceMotion());

    expect(result.isSupported.value).toBeFalsy();
    expect(result.requirePermissions.value).toBeFalsy();
    expect(result.acceleration.value).toBeNull();
    await expect(result.ensurePermissions()).resolves.toBeUndefined();

    scope.stop();
    vi.doUnmock('@/types');
    vi.resetModules();
  });

  describe('iOS permission flow', () => {
    function makeIosCtor(response: 'granted' | 'denied' | Error) {
      const ctor = function DeviceMotionEvent() {} as unknown as { requestPermission: () => Promise<'granted' | 'denied'> };
      ctor.requestPermission = vi.fn(() =>
        response instanceof Error ? Promise.reject(response) : Promise.resolve(response));
      return ctor;
    }

    it('defers binding until permission is granted', async () => {
      const ctor = makeIosCtor('granted');
      const window = makeWindowStub({ ios: ctor });
      const { result, scope } = runInScope(() => useDeviceMotion({ window: window as unknown as Window }));

      expect(result.requirePermissions.value).toBeTruthy();
      // Not requested eagerly, nothing bound yet.
      expect(window.listeners.get('devicemotion')).toBeUndefined();
      expect(result.permissionGranted.value).toBeFalsy();

      await result.ensurePermissions();

      expect(ctor.requestPermission).toHaveBeenCalledTimes(1);
      expect(result.permissionGranted.value).toBeTruthy();
      expect(window.listeners.get('devicemotion')?.size).toBe(1);

      scope.stop();
    });

    it('requests eagerly when requestPermissions is true', async () => {
      const ctor = makeIosCtor('granted');
      const window = makeWindowStub({ ios: ctor });
      const { result, scope } = runInScope(() =>
        useDeviceMotion({ window: window as unknown as Window, requestPermissions: true }));

      // Microtask for the eager async request to settle.
      await Promise.resolve();
      await Promise.resolve();

      expect(ctor.requestPermission).toHaveBeenCalled();
      expect(result.permissionGranted.value).toBeTruthy();
      expect(window.listeners.get('devicemotion')?.size).toBe(1);

      scope.stop();
    });

    it('leaves the listener unbound when permission is denied', async () => {
      const ctor = makeIosCtor('denied');
      const window = makeWindowStub({ ios: ctor });
      const { result, scope } = runInScope(() => useDeviceMotion({ window: window as unknown as Window }));

      await result.ensurePermissions();

      expect(result.permissionGranted.value).toBeFalsy();
      expect(window.listeners.get('devicemotion')).toBeUndefined();

      scope.stop();
    });

    it('routes a rejected request through onError without throwing', async () => {
      const ctor = makeIosCtor(new Error('blocked'));
      const window = makeWindowStub({ ios: ctor });
      const onError = vi.fn();
      const { result, scope } = runInScope(() =>
        useDeviceMotion({ window: window as unknown as Window, onError }));

      await expect(result.ensurePermissions()).resolves.toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(result.permissionGranted.value).toBeFalsy();

      scope.stop();
    });
  });
});
