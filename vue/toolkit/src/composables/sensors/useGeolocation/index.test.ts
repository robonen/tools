import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useGeolocation } from '.';

afterEach(() => vi.unstubAllGlobals());

function stubGeolocation() {
  let successCb: PositionCallback | null = null;
  let errorCb: PositionErrorCallback | null = null;
  let lastOptions: PositionOptions | undefined;
  const watchPosition = vi.fn((success: PositionCallback, err?: PositionErrorCallback | null, opts?: PositionOptions) => {
    successCb = success;
    errorCb = err ?? null;
    lastOptions = opts;
    return 1;
  });
  const clearWatch = vi.fn();
  const getCurrentPosition = vi.fn((success: PositionCallback, err?: PositionErrorCallback | null, opts?: PositionOptions) => {
    successCb = success;
    errorCb = err ?? null;
    lastOptions = opts;
  });
  const navigator = { geolocation: { watchPosition, clearWatch, getCurrentPosition } } as unknown as Navigator;
  return {
    navigator,
    watchPosition,
    clearWatch,
    getCurrentPosition,
    getOptions: () => lastOptions,
    emit: (position: GeolocationPosition) => successCb?.(position),
    emitError: (err: GeolocationPositionError) => errorCb?.(err),
  };
}

function makePosition(latitude: number, longitude: number, timestamp = 123): GeolocationPosition {
  return {
    timestamp,
    coords: {
      latitude,
      longitude,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    } as GeolocationCoordinates,
  } as GeolocationPosition;
}

function makeError(code = 1, message = 'denied'): GeolocationPositionError {
  return { code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
}

describe(useGeolocation, () => {
  it('starts watching immediately by default', () => {
    const { watchPosition, navigator } = stubGeolocation();
    const scope = effectScope();
    scope.run(() => useGeolocation({ navigator }));
    expect(watchPosition).toHaveBeenCalled();
    scope.stop();
  });

  it('does not start watching when immediate is false', () => {
    const { watchPosition, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator, immediate: false });
    });
    expect(watchPosition).not.toHaveBeenCalled();
    expect(geo!.isActive.value).toBeFalsy();
    scope.stop();
  });

  it('updates coords on position change', () => {
    const { emit, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator });
    });

    emit(makePosition(1, 2));

    expect(geo!.coords.value.latitude).toBe(1);
    expect(geo!.coords.value.longitude).toBe(2);
    expect(geo!.locatedAt.value).toBe(123);
    expect(geo!.ready.value).toBeTruthy();
    scope.stop();
  });

  it('tracks active state across resume/pause', () => {
    const { navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator });
    });
    expect(geo!.isActive.value).toBeTruthy();
    geo!.pause();
    expect(geo!.isActive.value).toBeFalsy();
    geo!.resume();
    expect(geo!.isActive.value).toBeTruthy();
    scope.stop();
  });

  it('clears the watch on pause', () => {
    const { clearWatch, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator });
    });
    geo!.pause();
    expect(clearWatch).toHaveBeenCalledWith(1);
    scope.stop();
  });

  it('does not re-watch when already active', () => {
    const { watchPosition, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator });
    });
    geo!.resume();
    geo!.resume();
    expect(watchPosition).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('records errors and invokes onError', () => {
    const { emitError, navigator } = stubGeolocation();
    const onError = vi.fn();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator, onError });
    });

    const err = makeError();
    emitError(err);

    expect(geo!.error.value).toBe(err);
    expect(onError).toHaveBeenCalledWith(err);
    scope.stop();
  });

  it('clears the error after a successful fix', () => {
    const { emit, emitError, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator });
    });

    emitError(makeError());
    expect(geo!.error.value).not.toBeNull();
    emit(makePosition(1, 2));
    expect(geo!.error.value).toBeNull();
    scope.stop();
  });

  it('passes position options to watchPosition', () => {
    const { getOptions, navigator } = stubGeolocation();
    const scope = effectScope();
    scope.run(() => useGeolocation({ navigator, enableHighAccuracy: false, maximumAge: 1000, timeout: 5000 }));
    expect(getOptions()).toEqual({ enableHighAccuracy: false, maximumAge: 1000, timeout: 5000 });
    scope.stop();
  });

  it('restarts the watcher when reactive options change while active', async () => {
    const { watchPosition, clearWatch, getOptions, navigator } = stubGeolocation();
    const highAccuracy = shallowRef(false);
    const scope = effectScope();
    scope.run(() => useGeolocation({ navigator, enableHighAccuracy: highAccuracy }));

    expect(watchPosition).toHaveBeenCalledTimes(1);
    expect(getOptions()?.enableHighAccuracy).toBeFalsy();

    highAccuracy.value = true;
    await nextTick();

    expect(clearWatch).toHaveBeenCalledWith(1);
    expect(watchPosition).toHaveBeenCalledTimes(2);
    expect(getOptions()?.enableHighAccuracy).toBeTruthy();
    scope.stop();
  });

  it('does not restart on option change when paused', async () => {
    const { watchPosition, navigator } = stubGeolocation();
    const timeout = shallowRef(1000);
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator, timeout, immediate: false });
    });

    timeout.value = 2000;
    await nextTick();

    expect(watchPosition).not.toHaveBeenCalled();
    expect(geo!.isActive.value).toBeFalsy();
    scope.stop();
  });

  it('getCurrentPosition resolves and updates state without a watch', async () => {
    const { watchPosition, getCurrentPosition, emit, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator, immediate: false });
    });

    const promise = geo!.getCurrentPosition();
    emit(makePosition(10, 20, 999));
    const position = await promise;

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
    expect(position.coords.latitude).toBe(10);
    expect(geo!.coords.value.latitude).toBe(10);
    expect(geo!.locatedAt.value).toBe(999);
    expect(geo!.ready.value).toBeTruthy();
    scope.stop();
  });

  it('getCurrentPosition rejects on error', async () => {
    const { emitError, navigator } = stubGeolocation();
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator, immediate: false });
    });

    const promise = geo!.getCurrentPosition();
    const err = makeError();
    emitError(err);

    await expect(promise).rejects.toBe(err);
    expect(geo!.error.value).toBe(err);
    scope.stop();
  });

  it('reports unsupported when geolocation is missing', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator });
    });
    expect(geo!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('getCurrentPosition rejects when unsupported', async () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let geo: ReturnType<typeof useGeolocation>;
    scope.run(() => {
      geo = useGeolocation({ navigator, immediate: false });
    });
    await expect(geo!.getCurrentPosition()).rejects.toThrow('not supported');
    scope.stop();
  });
});
