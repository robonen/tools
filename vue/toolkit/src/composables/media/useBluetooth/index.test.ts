import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseBluetoothReturn } from '.';
import { useBluetooth } from '.';

interface StubGatt {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function makeServer(connected = true) {
  return { connected } as unknown as BluetoothRemoteGATTServer;
}

function makeDevice(gattConnected = true) {
  const listeners = new Map<string, Set<EventListener>>();
  const server = makeServer(gattConnected);
  const gatt: StubGatt = {
    connect: vi.fn(async () => server),
    disconnect: vi.fn(),
  };
  const device = {
    name: 'stub-device',
    gatt,
    addEventListener: vi.fn((type: string, fn: EventListener) => {
      if (!listeners.has(type))
        listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: EventListener) => {
      listeners.get(type)?.delete(fn);
    }),
    dispatch: (type: string) => {
      listeners.get(type)?.forEach(fn => fn(new Event(type)));
    },
  };
  return { device, gatt, server };
}

function stubBluetooth(device?: ReturnType<typeof makeDevice>['device']) {
  const requestDevice = vi.fn(async () => device);
  const navigator = {
    bluetooth: { requestDevice },
  } as unknown as Navigator;
  return { navigator, requestDevice };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useBluetooth, () => {
  it('reports support when the Bluetooth API exists', () => {
    const { navigator } = stubBluetooth();
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator });
    });
    expect(bt!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('is not supported without the Bluetooth API', () => {
    const navigator = {} as unknown as Navigator;
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator });
    });
    expect(bt!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is not supported when navigator is undefined (SSR)', () => {
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator: undefined });
    });
    expect(bt!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('does nothing when requestDevice is called unsupported', async () => {
    const navigator = {} as unknown as Navigator;
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator });
    });
    await bt!.requestDevice();
    expect(bt!.device.value).toBeUndefined();
    expect(bt!.error.value).toBeNull();
    scope.stop();
  });

  it('requests a device and connects to its GATT server', async () => {
    const { device, gatt, server } = makeDevice(true);
    const { navigator, requestDevice } = stubBluetooth(device);
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true });
    });

    await bt!.requestDevice();
    expect(requestDevice).toHaveBeenCalledWith({
      acceptAllDevices: true,
      filters: undefined,
      optionalServices: undefined,
    });
    expect(bt!.device.value).toBe(device);

    // The device watcher triggers connect() asynchronously
    await nextTick();
    await Promise.resolve();
    expect(gatt.connect).toHaveBeenCalled();
    expect(bt!.server.value).toBe(server);
    expect(bt!.isConnected.value).toBeTruthy();
    scope.stop();
  });

  it('forces acceptAllDevices off when filters are provided', async () => {
    const { device } = makeDevice();
    const { navigator, requestDevice } = stubBluetooth(device);
    const filters = [{ services: ['heart_rate'] }] as BluetoothLEScanFilter[];
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true, filters });
    });

    await bt!.requestDevice();
    expect(requestDevice).toHaveBeenCalledWith({
      acceptAllDevices: false,
      filters,
      optionalServices: undefined,
    });
    scope.stop();
  });

  it('captures errors from requestDevice and calls onError', async () => {
    const requestDevice = vi.fn(async () => {
      throw new Error('user cancelled');
    });
    const navigator = { bluetooth: { requestDevice } } as unknown as Navigator;
    const onError = vi.fn();
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true, onError });
    });

    await bt!.requestDevice();
    expect(bt!.error.value).toBeInstanceOf(Error);
    expect((bt!.error.value as Error).message).toBe('user cancelled');
    expect(onError).toHaveBeenCalledWith(bt!.error.value);
    expect(bt!.device.value).toBeUndefined();
    scope.stop();
  });

  it('captures errors from the GATT connection', async () => {
    const { device, gatt } = makeDevice();
    gatt.connect.mockRejectedValueOnce(new Error('gatt failed'));
    const { navigator } = stubBluetooth(device);
    const onError = vi.fn();
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true, onError });
    });

    await bt!.requestDevice();
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    expect(bt!.error.value).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalled();
    expect(bt!.isConnected.value).toBeFalsy();
    expect(bt!.server.value).toBeUndefined();
    scope.stop();
  });

  it('resets connection state on gattserverdisconnected', async () => {
    const { device } = makeDevice(true);
    const { navigator } = stubBluetooth(device);
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true });
    });

    await bt!.requestDevice();
    await nextTick();
    await Promise.resolve();
    expect(bt!.isConnected.value).toBeTruthy();

    device.dispatch('gattserverdisconnected');
    expect(bt!.isConnected.value).toBeFalsy();
    expect(bt!.server.value).toBeUndefined();
    scope.stop();
  });

  it('disconnect() disconnects the gatt server and resets state', async () => {
    const { device, gatt } = makeDevice(true);
    const { navigator } = stubBluetooth(device);
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true });
    });

    await bt!.requestDevice();
    await nextTick();
    await Promise.resolve();
    expect(bt!.isConnected.value).toBeTruthy();

    bt!.disconnect();
    expect(gatt.disconnect).toHaveBeenCalled();
    expect(bt!.isConnected.value).toBeFalsy();
    expect(bt!.server.value).toBeUndefined();
    scope.stop();
  });

  it('connect() reconnects to the current device', async () => {
    const { device, gatt } = makeDevice(true);
    const { navigator } = stubBluetooth(device);
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true });
    });

    await bt!.requestDevice();
    await nextTick();
    await Promise.resolve();
    gatt.connect.mockClear();

    await bt!.connect();
    expect(gatt.connect).toHaveBeenCalledTimes(1);
    expect(bt!.isConnected.value).toBeTruthy();
    scope.stop();
  });

  it('disconnects the gatt server when the scope is disposed', async () => {
    const { device, gatt } = makeDevice(true);
    const { navigator } = stubBluetooth(device);
    const scope = effectScope();
    let bt: UseBluetoothReturn;
    scope.run(() => {
      bt = useBluetooth({ navigator, acceptAllDevices: true });
    });

    await bt!.requestDevice();
    await nextTick();
    await Promise.resolve();
    gatt.disconnect.mockClear();

    scope.stop();
    expect(gatt.disconnect).toHaveBeenCalled();
  });
});
