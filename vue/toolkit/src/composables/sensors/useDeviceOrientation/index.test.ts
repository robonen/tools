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
});
