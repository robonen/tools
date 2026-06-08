import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseDevicesListReturn } from '.';
import { useDevicesList } from '.';

function device(kind: MediaDeviceKind, id: string, label = ''): MediaDeviceInfo {
  return {
    deviceId: id,
    kind,
    label,
    groupId: 'group',
    toJSON: () => ({}),
  } as MediaDeviceInfo;
}

function stubMediaDevices(initial: MediaDeviceInfo[] = []) {
  let list = initial;
  let changeHandler: ((ev: Event) => any) | undefined;

  const enumerateDevices = vi.fn(async () => list);
  const track = { stop: vi.fn() };
  const getUserMedia = vi.fn(async () => ({
    getTracks: () => [track],
  } as unknown as MediaStream));

  const mediaDevices = {
    enumerateDevices,
    getUserMedia,
    addEventListener: vi.fn((_: string, handler: any) => { changeHandler = handler; }),
    removeEventListener: vi.fn(() => { changeHandler = undefined; }),
  };

  const navigator = { mediaDevices } as unknown as Navigator;

  return {
    navigator,
    enumerateDevices,
    getUserMedia,
    track,
    setDevices: (next: MediaDeviceInfo[]) => { list = next; },
    emitChange: () => changeHandler?.(new Event('devicechange')),
    getChangeHandler: () => changeHandler,
  };
}

describe(useDevicesList, () => {
  it('reports unsupported when mediaDevices is missing', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.devices.value).toEqual([]);
    scope.stop();
  });

  it('handles the SSR path (no navigator) gracefully', async () => {
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator: undefined });
    });

    expect(result!.isSupported.value).toBeFalsy();
    await expect(result!.ensurePermissions()).resolves.toBeFalsy();
    scope.stop();
  });

  it('enumerates devices on init', async () => {
    const { navigator, enumerateDevices } = stubMediaDevices([
      device('videoinput', 'cam1'),
      device('audioinput', 'mic1'),
    ]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    expect(result!.isSupported.value).toBeTruthy();
    await vi.waitFor(() => expect(result!.devices.value).toHaveLength(2));
    expect(enumerateDevices).toHaveBeenCalled();
    scope.stop();
  });

  it('filters devices by kind', async () => {
    const { navigator } = stubMediaDevices([
      device('videoinput', 'cam1'),
      device('videoinput', 'cam2'),
      device('audioinput', 'mic1'),
      device('audiooutput', 'spk1'),
    ]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    await vi.waitFor(() => expect(result!.devices.value).toHaveLength(4));
    expect(result!.videoInputs.value).toHaveLength(2);
    expect(result!.audioInputs.value).toHaveLength(1);
    expect(result!.audioOutputs.value).toHaveLength(1);
    scope.stop();
  });

  it('calls onUpdated with the device list', async () => {
    const onUpdated = vi.fn();
    const { navigator } = stubMediaDevices([device('videoinput', 'cam1')]);
    const scope = effectScope();
    scope.run(() => {
      useDevicesList({ navigator, onUpdated });
    });

    await vi.waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(onUpdated).toHaveBeenCalledWith([expect.objectContaining({ deviceId: 'cam1' })]);
    scope.stop();
  });

  it('re-enumerates on devicechange', async () => {
    const stub = stubMediaDevices([device('videoinput', 'cam1')]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator: stub.navigator });
    });

    await vi.waitFor(() => expect(result!.devices.value).toHaveLength(1));

    stub.setDevices([device('videoinput', 'cam1'), device('audioinput', 'mic1')]);
    stub.emitChange();

    await vi.waitFor(() => expect(result!.devices.value).toHaveLength(2));
    scope.stop();
  });

  it('registers the devicechange listener passively', () => {
    const { navigator } = stubMediaDevices();
    const scope = effectScope();
    scope.run(() => {
      useDevicesList({ navigator });
    });

    expect((navigator.mediaDevices.addEventListener as any)).toHaveBeenCalledWith(
      'devicechange',
      expect.any(Function),
      { passive: true },
    );
    scope.stop();
  });

  it('removes the listener on scope dispose', () => {
    const { navigator } = stubMediaDevices();
    const scope = effectScope();
    scope.run(() => {
      useDevicesList({ navigator });
    });
    scope.stop();

    expect((navigator.mediaDevices.removeEventListener as any)).toHaveBeenCalledWith(
      'devicechange',
      expect.any(Function),
      { passive: true },
    );
  });

  it('ensurePermissions requests getUserMedia and grants permission', async () => {
    const { navigator, getUserMedia, track } = stubMediaDevices([
      device('videoinput', 'cam1'),
      device('audioinput', 'mic1'),
    ]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    const granted = await result!.ensurePermissions();
    expect(granted).toBeTruthy();
    expect(result!.permissionGranted.value).toBeTruthy();
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    // The temporary stream tracks are released after the prompt.
    expect(track.stop).toHaveBeenCalled();
    scope.stop();
  });

  it('narrows constraints when a device kind is absent', async () => {
    // Only a microphone present -> video constraint must be dropped.
    const { navigator, getUserMedia } = stubMediaDevices([device('audioinput', 'mic1')]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    await result!.ensurePermissions();
    expect(getUserMedia).toHaveBeenCalledWith({ video: false, audio: true });
    scope.stop();
  });

  it('does not mutate the caller-supplied constraints object', async () => {
    const { navigator } = stubMediaDevices([device('audioinput', 'mic1')]);
    const constraints: MediaStreamConstraints = { video: true, audio: true };
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator, constraints });
    });

    await result!.ensurePermissions();
    expect(constraints).toEqual({ video: true, audio: true });
    scope.stop();
  });

  it('dedupes concurrent ensurePermissions calls', async () => {
    const { navigator, getUserMedia } = stubMediaDevices([device('videoinput', 'cam1')]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    await Promise.all([result!.ensurePermissions(), result!.ensurePermissions()]);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('short-circuits ensurePermissions once granted', async () => {
    const { navigator, getUserMedia } = stubMediaDevices([device('videoinput', 'cam1')]);
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator });
    });

    await result!.ensurePermissions();
    await result!.ensurePermissions();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('requests permissions on init when requestPermissions is true', async () => {
    const { navigator, getUserMedia } = stubMediaDevices([device('videoinput', 'cam1')]);
    const scope = effectScope();
    scope.run(() => {
      useDevicesList({ navigator, requestPermissions: true });
    });

    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    scope.stop();
  });

  it('reports getUserMedia failures via onError and leaves permission denied', async () => {
    const onError = vi.fn();
    const { navigator } = stubMediaDevices([device('videoinput', 'cam1')]);
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(new Error('denied'));
    const scope = effectScope();
    let result: UseDevicesListReturn;
    scope.run(() => {
      result = useDevicesList({ navigator, onError });
    });

    const granted = await result!.ensurePermissions();
    expect(granted).toBeFalsy();
    expect(result!.permissionGranted.value).toBeFalsy();
    expect(onError).toHaveBeenCalled();
    scope.stop();
  });

  it('reports enumerateDevices failures via onError', async () => {
    const onError = vi.fn();
    const { navigator } = stubMediaDevices();
    (navigator.mediaDevices.enumerateDevices as any).mockRejectedValue(new Error('boom'));
    const scope = effectScope();
    scope.run(() => {
      useDevicesList({ navigator, onError });
    });

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    await nextTick();
    scope.stop();
  });
});
